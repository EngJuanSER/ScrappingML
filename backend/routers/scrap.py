from fastapi import APIRouter, Query, HTTPException, status, Request, Depends
from services.scrap_logic import run_scrap_and_save
import os
import logging
import threading
import time

router = APIRouter()
logger = logging.getLogger(__name__)

# Autenticación simple por contraseña
API_PASSWORD = os.getenv("API_PASSWORD", "changeme")

# Cola global de scrappings
scrap_queue = []
queue_lock = threading.Lock()

# Estado de scrapping en curso (ahora lista de trabajos activos)
MAX_CONCURRENT_SCRAPS = 4
scrap_in_progress = []  # Lista de dicts: {"query": ..., "num_pages": ..., "start_time": ..., "progress": ...}

def verify_password(password: str = Query(..., description="Contraseña de acceso")):
    if password != API_PASSWORD:
        logger.warning("Intento de acceso con contraseña incorrecta al endpoint /scrap")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Contraseña incorrecta")
    return True

def process_scrap_queue():
    while True:
        with queue_lock:
            # Si ya hay el máximo de trabajos activos o no hay nada en cola, salir
            if not scrap_queue or len(scrap_in_progress) >= MAX_CONCURRENT_SCRAPS:
                break
            item = scrap_queue.pop(0)
            # Añadir campos de progreso y tiempo de inicio
            item = dict(item)
            item["start_time"] = time.time()
            item["progress"] = 0
            scrap_in_progress.append(item)
        def run_and_remove(item):
            try:
                run_scrap_and_save(item["query"], num_pages=item["num_pages"], progress_ref=item)
                logger.info(f"Scrapping exitoso para '{item['query']}' ({item['num_pages']} páginas)")
            except Exception as e:
                logger.error(f"Error en scrapping: {e}")
            finally:
                with queue_lock:
                    if item in scrap_in_progress:
                        scrap_in_progress.remove(item)
                    # Lanzar otro si hay espacio
                    if scrap_queue:
                        threading.Thread(target=process_scrap_queue, daemon=True).start()
        threading.Thread(target=run_and_remove, args=(item,), daemon=True).start()

@router.post("/scrap")
def scrap_endpoint(
    query: str = Query(..., description="Término a scrapear"),
    num_pages: int = Query(..., description="Cantidad de páginas a scrapear"),
    valid: bool = Depends(verify_password)
):
    """
    Lanza el scrapping, limpia, deduplica y guarda en la base de datos.
    """
    with queue_lock:
        # Si hay espacio, lanzar de inmediato
        if len(scrap_in_progress) < MAX_CONCURRENT_SCRAPS and not scrap_queue:
            item = {"query": query, "num_pages": num_pages, "start_time": time.time(), "progress": 0}
            scrap_in_progress.append(item)
            def run_and_remove(item):
                try:
                    result = run_scrap_and_save(item["query"], num_pages=item["num_pages"], progress_ref=item)
                    logger.info(f"Scrapping exitoso para '{item['query']}' ({item['num_pages']} páginas) - {result['inserted']} registros insertados.")
                    return result
                except Exception as e:
                    logger.error(f"Error en scrapping: {e}")
                    raise HTTPException(status_code=500, detail=f"Error en scrapping: {str(e)}")
                finally:
                    with queue_lock:
                        if item in scrap_in_progress:
                            scrap_in_progress.remove(item)
                        if scrap_queue:
                            threading.Thread(target=process_scrap_queue, daemon=True).start()
            threading.Thread(target=run_and_remove, args=(item,), daemon=True).start()
            return {"status": "started", "message": "Scraping iniciado."}
        else:
            # Si no hay espacio, encolar
            scrap_queue.append({"query": query, "num_pages": num_pages})
            pos = len(scrap_queue)
            logger.info(f"Solicitud de scrapping encolada para '{query}' (posición {pos})")
            # Lanzar el procesador de cola si hay espacio
            if len(scrap_in_progress) < MAX_CONCURRENT_SCRAPS:
                threading.Thread(target=process_scrap_queue, daemon=True).start()
            return {"status": "enqueued", "message": f"Solicitud encolada. Hay {pos-1} solicitudes antes de la tuya."}

@router.get("/scrap-status")
def scrap_status():
    """Devuelve el estado del scrapping en curso y la cola de solicitudes."""
    with queue_lock:
        # Solo exponer los campos relevantes
        def serialize(item):
            return {
                "query": item["query"],
                "num_pages": item["num_pages"],
                "start_time": item.get("start_time"),
                "progress": item.get("progress", 0),
                "processed_products": item.get("processed_products", 0),
                "estimated_total_products": item.get("estimated_total_products", item.get("num_pages", 1)*48)
            }
        return {
            "active": len(scrap_in_progress) > 0,
            "current": [serialize(item) for item in scrap_in_progress],
            "queue": list(scrap_queue)
        }

@router.delete("/scrap-cancel")
def scrap_cancel(query: str = Query(..., description="Término a cancelar"), num_pages: int = Query(None, description="Páginas a cancelar", ge=1)):
    """Permite cancelar una solicitud pendiente en la cola por término y páginas."""
    with queue_lock:
        idx = next((i for i, item in enumerate(scrap_queue) if item["query"] == query and (num_pages is None or item["num_pages"] == num_pages)), None)
        if idx is not None:
            removed = scrap_queue.pop(idx)
            logger.info(f"Solicitud de scrapping cancelada para '{removed['query']}' ({removed['num_pages']} páginas)")
            return {"status": "cancelled", "message": f"Solicitud para '{removed['query']}' cancelada."}
        return {"status": "not_found", "message": "No se encontró la solicitud en la cola."}
