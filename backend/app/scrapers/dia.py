"""
Scraper de Supermercados Día Argentina via API pública de VTEX.

Día usa VTEX, cuenta diaio. La estructura de la API es idéntica a
Carrefour, Vea, Disco y Jumbo — hereda toda la lógica de CarrefourScraper.
"""
from app.config.settings import settings
from app.models.price_history import Supermarket
from app.scrapers.carrefour import CarrefourScraper, _VTEX_SEARCH_PATH


class DiaScraper(CarrefourScraper):
    """
    Scraper de Supermercados Día Argentina.
    Hereda toda la lógica de CarrefourScraper — solo difiere en URLs y enum.
    """

    def __init__(self):
        super().__init__()
        self.name             = "dia"
        self.search_url       = f"{settings.DIA_API_URL}{_VTEX_SEARCH_PATH}"
        self.store_url        = settings.DIA_STORE_URL
        self.supermarket_enum = Supermarket.DIA
        self.region_postal_code = None  # sin sucursal en San Juan: precio online nacional
