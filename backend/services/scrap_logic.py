import os
from dotenv import load_dotenv
import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
from sqlalchemy import create_engine, text

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../.env'))
db_url = os.getenv("DATABASE_URL")
engine = create_engine(db_url)

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../.env'))
db_url = os.getenv("DATABASE_URL")
engine = create_engine(db_url)

def get_pagination_urls(product_name, num_pages):
    # num_pages debe ser siempre explícito y obligatorio
    urls = []
    formatted_product = product_name.replace(' ', '-')
    base_url = f"https://listado.mercadolibre.com.co/{formatted_product}"
    urls.append(base_url)
    for page in range(2, int(num_pages) + 1):
        from_item = (page - 1) * 50 + 1
        pagination_url = f"https://listado.mercadolibre.com.co/{formatted_product}_Desde_{from_item}_NoIndex_True"
        urls.append(pagination_url)
    return urls

def run_scrap_and_save(query, num_pages, progress_ref=None):
    # num_pages debe ser siempre explícito y obligatorio
    urls = get_pagination_urls(query, num_pages)
    data = []
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    total_products = 0
    productos_procesados = 0
    ESTIMADO_POR_PAGINA = 48
    total_products = num_pages * ESTIMADO_POR_PAGINA
    if progress_ref is not None:
        progress_ref["processed_products"] = 0
        progress_ref["estimated_total_products"] = total_products
    for page_num, url in enumerate(urls, 1):
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.text, "html.parser")
        products = soup.select(".ui-search-layout > li")
        for product in products:
            # Extracción de datos de producto
            title_el = product.select_one("h3")
            title = title_el.get_text(strip=True) if title_el else ""
            price_el = product.select_one(".andes-money-amount")
            price = price_el.get_text(strip=True) if price_el else ""
            link_el = product.select_one("h3 a, .poly-component__title-wrapper > a")
            link = link_el["href"] if link_el else ""
            shipping = ""
            sd_el = product.select_one(".poly-shipping--next_day") or product.select_one(".poly-component__shipping")
            if sd_el:
                shipping = sd_el.get_text(strip=True)
            promo_el = product.select_one(".poly-component__ads-promotions")
            promotion = promo_el.get_text(strip=True) if promo_el else ""
            full_el = product.select_one(".poly-component__shipped-from > svg")
            full_description = full_el.get("aria-label", "") if full_el else ""
            discount = ""
            disc_el = product.select_one(".ui-search-price__discount") or product.select_one(".andes-discount-badge")
            if disc_el:
                discount = disc_el.get_text(strip=True)
            seller, comments_count, summary_text, reviews = "", "", "", []
            avg_rating, total_ratings = "", ""
            if link:
                try:
                    prod_resp = requests.get(link, headers=headers)
                    prod_soup = BeautifulSoup(prod_resp.text, "html.parser")
                    seller_el = prod_soup.select_one(".ui-seller-data-header__title") or prod_soup.select_one("h2")
                    if seller_el:
                        seller = seller_el.get_text(strip=True).replace("Vendido por ", "")
                    rating_sec = prod_soup.select_one(".ui-review-capability__rating")
                    if rating_sec:
                        avg_el = rating_sec.select_one(".ui-review-capability__rating__average")
                        avg_rating = avg_el.get_text(strip=True) if avg_el else ""
                        label_el = rating_sec.select_one(".ui-review-capability__rating__label")
                        total_ratings = label_el.get_text(strip=True) if label_el else ""
                    section = prod_soup.select_one(".ui-review-capability-filter__comments")
                    if section:
                        count_el = section.select_one(".total-opinion")
                        comments_count = count_el.get_text(strip=True) if count_el else ""
                        sum_el = section.select_one(".ui-review-capability__summary__plain_text__summary_container p")
                        summary_text = sum_el.get_text(strip=True) if sum_el else ""
                        for cm in section.select(".ui-review-capability-comments__comment"):
                            rate_txt = cm.select_one(".ui-review-capability-comments__comment__rating-container .andes-visually-hidden").get_text(strip=True)
                            date = cm.select_one(".ui-review-capability-comments__comment__date").get_text(strip=True)
                            content_el = cm.select_one(".ui-review-capability-comments__comment__content")
                            comment_text = content_el.get_text(strip=True) if content_el else ""
                            likes = cm.select_one(".ui-review-capability-valorizations__button-like__text").get_text(strip=True)
                            reviews.append({"rating": rate_txt, "date": date, "content": comment_text, "likes": likes})
                except Exception:
                    pass
            # --- Categorización heurística ---
            def categorizar_producto(texto):
                texto = (texto or "").lower()
                categorias = {
                    "tecnología": ["celular", "laptop", "computador", "tablet", "tecnología", "audífono", "monitor", "teclado", "mouse", "tv", "televisor", "smartphone", "impresora", "cámara", "usb", "disco duro", "ssd", "memoria ram", "procesador", "notebook", "gamer", "playstation", "xbox", "nintendo"],
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
            categoria = categorizar_producto(title) if title else "otros"
            product_info = {
                "title": title,
                "price": price,
                "link": link,
                "shipping": shipping,
                "seller": seller,
                "promotion": promotion,
                "full_description": full_description,
                "discount": discount,
                "avg_rating": avg_rating,
                "total_ratings": total_ratings,
                "comments_count": comments_count,
                "summary": summary_text,
                "reviews": str(reviews),
                "page": page_num,
                "search_term": query,
                "categoria": categoria
            }
            # Garantizar que siempre exista la columna categoria
            if "categoria" not in product_info:
                product_info["categoria"] = "otros"
            data.append(product_info)
            productos_procesados += 1
            # Actualizar progreso y productos procesados
            if progress_ref is not None and total_products > 0:
                progress_ref["progress"] = productos_procesados / total_products
                progress_ref["processed_products"] = productos_procesados
        time.sleep(2)
    df = pd.DataFrame(data)
    # Deduplicación: elimina duplicados por 'title' y 'seller'
    df = df.drop_duplicates(subset=["title", "seller"])
    with engine.begin() as conn:
        for _, row in df.iterrows():
            conn.execute(
                text("DELETE FROM scrap_data WHERE title = :title AND seller = :seller"),
                {"title": row["title"], "seller": row["seller"]}
            )
    # Usar el engine directamente para to_sql (pandas maneja la conexión internamente)
    df.to_sql("scrap_data", engine, if_exists="append", index=False)
    return {"status": "ok", "inserted": len(df)}
