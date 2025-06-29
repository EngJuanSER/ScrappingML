from fastapi import APIRouter, UploadFile, File, HTTPException, status, Query, Depends
import pandas as pd
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

load_dotenv(os.path.join(os.path.dirname(__file__), '../../infra/.env'))
db_url = os.getenv("DATABASE_URL")
engine = create_engine(db_url)
API_PASSWORD = os.getenv("API_PASSWORD", "changeme")

def verify_password(password: str = Query(..., description="Contraseña de acceso")):
    if password != API_PASSWORD:
        logger.warning("Intento de acceso con contraseña incorrecta al endpoint /upload-csv")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Contraseña incorrecta")
    return True

@router.post("/upload-csv")
def upload_csv(file: UploadFile = File(...), valid: bool = Depends(verify_password)):
    """
    Recibe un archivo CSV, lo carga y lo inserta en la base de datos, deduplicando por título y vendedor.
    """
    try:
        df = pd.read_csv(file.file)
        # Deduplicación por 'title' y 'seller' si existen esas columnas
        if 'title' in df.columns and 'seller' in df.columns:
            df = df.drop_duplicates(subset=["title", "seller"])
        with engine.connect() as conn:
            for _, row in df.iterrows():
                conn.execute(
                    """
                    DELETE FROM scrap_data WHERE title = %s AND seller = %s
                    """,
                    (row["title"], row["seller"])
                )
            df.to_sql("scrap_data", conn, if_exists="append", index=False)
        logger.info(f"CSV cargado exitosamente: {len(df)} registros insertados.")
        return {"status": "ok", "inserted": len(df)}
    except Exception as e:
        logger.error(f"Error al cargar CSV: {e}")
        raise HTTPException(status_code=500, detail=f"Error al cargar CSV: {str(e)}")
