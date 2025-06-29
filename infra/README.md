# Documentación y pasos para el backend y carga de datos

## Estructura
- `/backend`: Código FastAPI
- `/backend/routers`: Módulos de endpoints
- `/backend/services`: Lógica de negocio (scrapping, consulta, deduplicación)
- `/data`: Datasets y scripts de carga
- `/infra`: Configuración y credenciales

## Pasos iniciales
1. Copia `.env.example` a `.env` y coloca tus credenciales de Supabase.
2. Agrega la variable `API_PASSWORD` en tu archivo `.env` para definir la contraseña de acceso a los endpoints protegidos.
3. Instala dependencias:
   ```bash
   pip install -r backend/requirements.txt
   ```
4. Carga tus CSV a la base de datos editando y ejecutando `data/cargar_csv.py`.
5. Ejecuta el backend:
   ```bash
   uvicorn main:app --reload
   ```
6. Accede a `/data` para probar que el backend responde.

## Endpoints principales
- `POST /scrap`: Ejecuta scrapping, limpia, deduplica y guarda en la base de datos. (Requiere contraseña)
- `POST /upload-csv`: Carga un archivo CSV y lo inserta en la base de datos, deduplicando. (Requiere contraseña)
- `GET /data`: Devuelve los datos almacenados.

## Modularidad
- Agrega nuevas fuentes de scrapping o lógica en `/backend/services` y nuevos endpoints en `/backend/routers`.

## Esquema de base de datos
- Consulta `infra/schema.sql` para la estructura de la tabla principal.
