"""
Scraper de Jumbo Argentina via API pública de VTEX.

Jumbo (Cencosud) usa VTEX, cuenta jumboargentina. La estructura de la API
es idéntica a Carrefour, Vea y Disco — hereda toda la lógica de CarrefourScraper.
"""
from app.config.settings import settings
from app.models.price_history import Supermarket
from app.scrapers.carrefour import CarrefourScraper, _VTEX_SEARCH_PATH


class JumboScraper(CarrefourScraper):
    """
    Scraper de Jumbo Argentina.
    Hereda toda la lógica de CarrefourScraper — solo difiere en URLs y enum.
    """

    def __init__(self):
        super().__init__()
        self.name             = "jumbo"
        self.search_url       = f"{settings.JUMBO_API_URL}{_VTEX_SEARCH_PATH}"
        self.store_url        = settings.JUMBO_STORE_URL
        self.supermarket_enum = Supermarket.JUMBO
        self.region_postal_code = None  # sin sucursal en San Juan: precio online nacional
