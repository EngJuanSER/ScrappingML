import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../../infra/.env'))
db_url = os.getenv("DATABASE_URL")
engine = create_engine(db_url)

def get_pagination_urls(product_name, num_pages=5):
    urls = []
    formatted_product = product_name.replace(' ', '-')
    base_url = f"https://listado.mercadolibre.com.co/{formatted_product}"
    urls.append(base_url)
    for page in range(2, num_pages + 1):
        from_item = (page - 1) * 50 + 1
        pagination_url = f"https://listado.mercadolibre.com.co/{formatted_product}_Desde_{from_item}_NoIndex_True"
        urls.append(pagination_url)
    return urls

def run_scrap_and_save(query, num_pages=5):
    urls = get_pagination_urls(query, num_pages)
    data = []
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    for page_num, url in enumerate(urls, 1):
        response = requests.get(url, headers=headers)
        soup = BeautifulSoup(response.text, "html.parser")
        products = soup.select(".ui-search-layout > li")
        for product in products:
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
            full = full_el.get("aria-label", "") if full_el else ""
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
                            text = content_el.get_text(strip=True) if content_el else ""
                            likes = cm.select_one(".ui-review-capability-valorizations__button-like__text").get_text(strip=True)
                            reviews.append({"rating": rate_txt, "date": date, "content": text, "likes": likes})
                except Exception:
                    pass
            product_info = {
                "title": title,
                "price": price,
                "link": link,
                "shipping": shipping,
                "seller": seller,
                "promotion": promotion,
                "full": full,
                "discount": discount,
                "avg_rating": avg_rating,
                "total_ratings": total_ratings,
                "comments_count": comments_count,
                "summary": summary_text,
                "reviews": str(reviews),
                "page": page_num,
                "search_term": query
            }
            data.append(product_info)
        time.sleep(2)
    df = pd.DataFrame(data)
    # Deduplicación: elimina duplicados por 'title' y 'seller'
    df = df.drop_duplicates(subset=["title", "seller"])
    with engine.connect() as conn:
        for _, row in df.iterrows():
            conn.execute(
                """
                DELETE FROM scrap_data WHERE title = %s AND seller = %s
                """,
                (row["title"], row["seller"])
            )
        df.to_sql("scrap_data", conn, if_exists="append", index=False)
    return {"status": "ok", "inserted": len(df)}
