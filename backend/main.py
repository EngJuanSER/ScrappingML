
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import scrap, upload_csv, data
import logging

app = FastAPI()

# Configuración de logs
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

# Configuración de CORS
import os
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:4321")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Incluir routers para modularidad
app.include_router(scrap.router)
app.include_router(upload_csv.router)
app.include_router(data.router, prefix="/data")
