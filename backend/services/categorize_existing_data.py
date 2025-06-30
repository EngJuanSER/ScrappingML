import os
from dotenv import load_dotenv
import pandas as pd
from sqlalchemy import create_engine, text

def categorizar_producto(texto):
    texto = (texto or "").lower()
    categorias = {
        "tecnología": ["motorola","samsung","512 gb","64 gb","128 gb","8 gb","4 gb","sim","xiaomi", "iphone","4gb","8gb","16gb", "celular", "laptop", "computador", "tablet", "tecnología", "audífono", "monitor", "teclado", "mouse", "tv", "televisor", "smartphone", "impresora", "cámara", "usb", "disco duro", "ssd", "memoria ram", "procesador", "notebook", "gamer", "playstation", "xbox", "nintendo"],
        "muebles": ["sofá", "silla", "mesa", "cama", "mueble", "closet", "escritorio", "colchón", "repisa", "estante", "comedor", "butaca", "ropero"],
        "ropa": ["camisa", "pantalón", "jean", "chaqueta", "blusa", "falda", "vestido", "zapato", "tenis", "bota", "abrigo", "ropa", "camiseta", "short", "sudadera", "calcetín", "medias"],
        "electrodomésticos": ["nevera", "lavadora", "licuadora", "microondas", "horno", "estufa", "ventilador", "aire acondicionado", "cafetera", "tostadora", "plancha", "secadora"],
        "hogar": ["almohada", "cobija", "sábana", "toalla", "vajilla", "cortina", "tapete", "decoración", "cuadro", "lámpara", "florero", "jarrón", "cojín"],
        "deporte": ["bicicleta", "balón", "raqueta", "tenis", "guante", "patines", "trotadora", "pesas", "cinta de correr", "deporte", "yoga", "gimnasio"],
        "juguetes": ["juguete", "muñeca", "lego", "rompecabezas", "carro", "puzzle", "peluche", "juego de mesa", "dron", "juguetes"],
        "belleza": ["perfume", "maquillaje", "crema", "shampoo", "secador", "plancha de cabello", "loción", "belleza", "esmalte", "labial", "mascarilla"],
        "herramientas": ["taladro", "destornillador", "martillo", "llave", "sierra", "cautín", "multímetro", "herramienta", "alicate", "cinta métrica", "nivel"],
        "otros": []
    }
    for cat, palabras in categorias.items():
        for palabra in palabras:
            if palabra in texto:
                return cat
    return "otros"

def categorize_all_products():
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../.env'))
    db_url = os.getenv("DATABASE_URL")
    engine = create_engine(db_url)
    with engine.begin() as conn:  # begin() asegura commit automático
        df = pd.read_sql("SELECT * FROM scrap_data", conn)
        updated = 0
        # Eliminar entradas vacías (sin título y sin link)
        vacios = df[(df['title'].isnull() | (df['title'].str.strip() == '')) & (df['link'].isnull() | (df['link'].str.strip() == ''))]
        for idx, row in vacios.iterrows():
            if "id" in row:
                conn.execute(text("DELETE FROM scrap_data WHERE id = :id"), {"id": row["id"]})
            else:
                conn.execute(text("DELETE FROM scrap_data WHERE title IS NULL OR title = '' AND link IS NULL OR link = ''"))
        for idx, row in df.iterrows():
            cat = row.get("categoria", None)
            if not cat or cat == "" or cat == "otros":
                new_cat = categorizar_producto(row.get("title", ""))
                if new_cat != cat:
                    # Usar id si existe, si no, fallback a title+seller
                    if "id" in row:
                        conn.execute(
                            text("UPDATE scrap_data SET categoria = :categoria WHERE id = :id"),
                            {"categoria": new_cat, "id": row["id"]}
                        )
                    else:
                        conn.execute(
                            text("UPDATE scrap_data SET categoria = :categoria WHERE title = :title AND seller = :seller"),
                            {"categoria": new_cat, "title": row["title"], "seller": row["seller"]}
                        )
                    updated += 1
    return updated

if __name__ == "__main__":
    n = categorize_all_products()
    print(f"Productos categorizados/actualizados: {n}")
