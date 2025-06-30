import pandas as pd
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Carga el .env desde la raíz del backend
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../.env'))

db_url = os.getenv("DATABASE_URL")
if not db_url:
    raise ValueError("DATABASE_URL no está definida en el .env")

engine = create_engine(db_url)

def get_data():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM scrap_data"))
        data = [dict(row._mapping) for row in result]
    return data
