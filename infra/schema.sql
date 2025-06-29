# Tabla ejemplo para almacenar resultados de scrapping
drop table if exists scrap_data;
create table scrap_data (
    title text,
    price text,
    link text,
    shipping text,
    seller text,
    promotion text,
    full text,
    discount text,
    avg_rating text,
    total_ratings text,
    comments_count text,
    summary text,
    reviews text,
    page integer,
    search_term text,
    primary key (title, seller)
);
