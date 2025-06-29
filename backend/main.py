from fastapi import FastAPI
from routers import scrap, upload_csv
import logging

app = FastAPI()

# Configuración de logs
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

# Incluir routers para modularidad
app.include_router(scrap.router)
app.include_router(upload_csv.router)
