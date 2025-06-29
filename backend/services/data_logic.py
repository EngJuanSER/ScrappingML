import pandas as pd
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../../infra/.env'))
db_url = os.getenv("DATABASE_URL")
engine = create_engine(db_url)

def get_data():
    # Devuelve todos los datos de la tabla scrap_data
    with engine.connect() as conn:
        df = pd.read_sql("SELECT * FROM scrap_data", conn)
    return df.to_dict(orient="records")
