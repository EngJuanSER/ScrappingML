# Endpoint para categorizar todos los productos existentes

from fastapi import APIRouter
from services.categorize_existing_data import categorize_all_products
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv
import pandas as pd


router = APIRouter()
@router.get("/all")
def get_all_products():
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../.env'))
    db_url = os.getenv("DATABASE_URL")
    engine = create_engine(db_url)
    with engine.connect() as conn:
        df = pd.read_sql("SELECT * FROM scrap_data", conn)
        return df.to_dict(orient="records")

@router.post("/categorize-all")
def categorize_all():
    updated = categorize_all_products()
    return {"updated": updated, "message": f"Productos categorizados/actualizados: {updated}"}
