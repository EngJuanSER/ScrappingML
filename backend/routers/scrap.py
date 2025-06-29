from fastapi import APIRouter, Query, HTTPException, status, Request, Depends
from services.scrap_logic import run_scrap_and_save
import os
import logging
import threading

router = APIRouter()
logger = logging.getLogger(__name__)

# Autenticación simple por contraseña
API_PASSWORD = os.getenv("API_PASSWORD", "changeme")

# Cola global de scrappings
scrap_queue = []
queue_lock = threading.Lock()

# Estado de scrapping en curso
scrap_in_progress = {"active": False, "query": None}

def verify_password(password: str = Query(..., description="Contraseña de acceso")):
    if password != API_PASSWORD:
        logger.warning("Intento de acceso con contraseña incorrecta al endpoint /scrap")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Contraseña incorrecta")
    return True

def process_scrap_queue():
    while True:
        with queue_lock:
            if not scrap_queue or scrap_in_progress["active"]:
                break
            item = scrap_queue.pop(0)
            scrap_in_progress["active"] = True
            scrap_in_progress["query"] = item["query"]
        try:
            run_scrap_and_save(item["query"], num_pages=item["num_pages"])
            logger.info(f"Scrapping exitoso para '{item['query']}' ({item['num_pages']} páginas)")
        except Exception as e:
            logger.error(f"Error en scrapping: {e}")
        finally:
            with queue_lock:
                scrap_in_progress["active"] = False
                scrap_in_progress["query"] = None

@router.post("/scrap")
def scrap_endpoint(
    query: str = Query(..., description="Término a scrapear"),
    num_pages: int = Query(5, description="Cantidad de páginas a scrapear"),
    valid: bool = Depends(verify_password)
):
    """
    Lanza el scrapping, limpia, deduplica y guarda en la base de datos.
    """
    with queue_lock:
        if scrap_in_progress["active"] or scrap_queue:
            # Agregar a la cola
            scrap_queue.append({"query": query, "num_pages": num_pages})
            pos = len(scrap_queue)
            logger.info(f"Solicitud de scrapping encolada para '{query}' (posición {pos})")
            # Lanzar el procesador de cola si no está activo
            if not scrap_in_progress["active"]:
                threading.Thread(target=process_scrap_queue, daemon=True).start()
            return {"status": "enqueued", "message": f"Solicitud encolada. Hay {pos-1} solicitudes antes de la tuya."}
        # Si no hay nada en curso ni en cola, procesar de inmediato
        scrap_in_progress["active"] = True
        scrap_in_progress["query"] = query
    try:
        result = run_scrap_and_save(query, num_pages=num_pages)
        logger.info(f"Scrapping exitoso para '{query}' ({num_pages} páginas) - {result['inserted']} registros insertados.")
        return result
    except Exception as e:
        logger.error(f"Error en scrapping: {e}")
        raise HTTPException(status_code=500, detail=f"Error en scrapping: {str(e)}")
    finally:
        with queue_lock:
            scrap_in_progress["active"] = False
            scrap_in_progress["query"] = None
            if scrap_queue:
                threading.Thread(target=process_scrap_queue, daemon=True).start()

@router.get("/scrap-status")
def scrap_status():
    """Devuelve el estado del scrapping en curso y la cola de solicitudes."""
    with queue_lock:
        return {
            "active": scrap_in_progress["active"],
            "query": scrap_in_progress["query"],
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
