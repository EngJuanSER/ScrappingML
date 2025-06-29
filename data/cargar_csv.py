# Archivo de ejemplo para cargar CSV a la base de datos de Supabase (PostgreSQL)
import pandas as pd
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv

# Cargar variables de entorno desde infra/.env
load_dotenv(os.path.join(os.path.dirname(__file__), '../infra/.env'))

db_url = os.getenv("DATABASE_URL")  # postgresql://usuario:contraseña@host:puerto/db

# Cambia 'dataset1.csv' y 'nombre_tabla' según tu caso
csv_path = os.path.join(os.path.dirname(__file__), 'dataset1.csv')
df = pd.read_csv(csv_path)
df.to_sql("nombre_tabla", create_engine(db_url), if_exists="append", index=False)
