# Documentación del proyecto ScrappingML

## Estructura
- `/backend`: Backend FastAPI modular
- `/data`: Datasets y scripts de carga
- `/infra`: Configuración y documentación

## Flujo de trabajo
1. Realiza scrapping y guarda los datos en `/data`.
2. Carga los datos a Supabase usando el script de carga.
3. El backend FastAPI expone endpoints para el dashboard o análisis.
