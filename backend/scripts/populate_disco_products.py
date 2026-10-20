"""
Poblar la BD con productos variados de Disco, organizados por categoría.

Uso:
    cd backend
    source venv/bin/activate

    # Ejecución real (guarda en DB)
    python scripts/populate_disco_products.py

    # Dry-run (solo consola, sin tocar DB)
    python scripts/populate_disco_products.py --dry-run
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.scrapers.disco import DiscoScraper
from sqlalchemy import func

MAX_PER_TERM = 25

CATEGORIES = {
    "Lácteos":               ["leche", "yogur", "queso", "manteca"],
    "Bebidas":               ["gaseosa", "agua", "jugo", "cerveza"],
    "Aceites y Condimentos": ["aceite", "vinagre", "mayonesa"],
    "Limpieza":              ["detergente", "lavandina", "suavizante"],
    "Higiene":               ["shampoo", "jabon", "pasta dental"],
    "Alimentos básicos":     ["arroz", "fideos", "harina", "azucar"],
    "Snacks":                ["galletitas", "chocolate", "caramelos", "barra proteica"],
    "Desayuno":              ["cafe", "café", "yerba mate"],
}


def main():
    dry_run = "--dry-run" in sys.argv
    scraper = DiscoScraper()

    total_terms = sum(len(terms) for terms in CATEGORIES.values())
    total_new = 0
    terms_done = 0
    errors = 0

    print("=== Poblando BD con productos de Disco ===")
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
        prices_saved = prices_after - prices_before

        print("=== Resumen ===")
        print(f"Términos scrapeados  : {terms_done}/{total_terms}")
        print(f"Nuevos en BD         : {total_new}")
        print(f"Precios guardados    : {prices_saved}")
        if errors:
            print(f"Errores              : {errors}")

    finally:
        session.close()


if __name__ == "__main__":
    main()
