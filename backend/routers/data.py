from fastapi import APIRouter
from services.data_logic import get_data

router = APIRouter()

@router.get("/data")
def data_endpoint():
    """
    Devuelve los datos procesados y almacenados en la base de datos.
    """
    return get_data()
