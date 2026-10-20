"""
Poblar la BD con productos variados de La Anónima, organizados por categoría.

Uso:
    cd backend
    source venv/bin/activate

    python scripts/populate_la_anonima_products.py
    python scripts/populate_la_anonima_products.py --dry-run
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.scrapers.la_anonima import LaAnonimaScraper
from sqlalchemy import func

MAX_PER_TERM = 25

# Nota: términos genéricos como "leche", "aceite", "harina" redirigen en la API
# y no devuelven artículos. Usar términos más específicos.
CATEGORIES = {
    "Lácteos":               ["leche entera", "leche descremada", "sachet leche", "yogur", "queso", "margarina"],
    "Bebidas":               ["gaseosa", "agua", "jugo", "cerveza"],
    "Aceites y Condimentos": ["aceite girasol", "aceite oliva", "vinagre", "mayonesa"],
    "Limpieza":              ["detergente", "lavandina", "suavizante"],
    "Higiene":               ["shampoo", "jabon", "pasta dental"],
    "Alimentos básicos":     ["arroz", "fideos", "harina 0000", "azucar", "sal"],
    "Desayuno":              ["galletitas", "mermelada", "cafe", "café", "yerba", "yerba mate", "barra proteica"],
}


def main():
    dry_run = "--dry-run" in sys.argv
    scraper = LaAnonimaScraper()

    total_terms = sum(len(t) for t in CATEGORIES.values())
    total_new = 0
    terms_done = 0
    errors = 0

    print("=== Poblando BD con productos de La Anónima ===")
    if dry_run:
        print("(modo dry-run — no se guarda en DB)\n")
    else:
        print()

    if dry_run:
        for category, terms in CATEGORIES.items():
            print(f"[{category}]")
            for term in terms:
                print(f"  Scrapeando '{term}'...")
                try:
                    scraper.scrape(db_session=None, search_terms=[term], max_per_term=MAX_PER_TERM)
                    terms_done += 1
                except Exception as e:
                    print(f"  ERROR en '{term}': {e}")
                    errors += 1
            print()
        print(f"=== Dry-run completo — {terms_done}/{total_terms} términos procesados ===")
        return

    from app.config.database import SessionLocal
    from app.models.price_history import PriceHistory

    session = SessionLocal()
    try:
        prices_before = session.query(func.count(PriceHistory.id)).scalar()

        for category, terms in CATEGORIES.items():
            print(f"[{category}]")
            for term in terms:
                print(f"  Scrapeando '{term}'...")
                try:
                    new = scraper.scrape(
                        db_session=session,
                        search_terms=[term],
                        max_per_term=MAX_PER_TERM,
                    )
                    total_new += new
                    terms_done += 1
                    print(f"  → {new} nuevos productos")
                except Exception as e:
                    print(f"  ERROR: {e}")
                    session.rollback()
                    errors += 1
            print()

        prices_after = session.query(func.count(PriceHistory.id)).scalar()

        print("=== Resumen ===")
        print(f"Términos scrapeados  : {terms_done}/{total_terms}")
        print(f"Nuevos en BD         : {total_new}")
        print(f"Precios guardados    : {prices_after - prices_before}")
        if errors:
            print(f"Errores              : {errors}")

    finally:
        session.close()


if __name__ == "__main__":
    main()
