"""
Scraper de Disco Argentina via API pública de VTEX.

Disco (Cencosud) usa VTEX, cuenta discoargentina. La estructura de la API
es idéntica a Carrefour y Vea — hereda toda la lógica de CarrefourScraper.
"""
from app.config.settings import settings
from app.models.price_history import Supermarket
from app.scrapers.carrefour import CarrefourScraper, _VTEX_SEARCH_PATH


class DiscoScraper(CarrefourScraper):
    """
    Scraper de Disco Argentina.
    Hereda toda la lógica de CarrefourScraper — solo difiere en URLs y enum.
    """

    def __init__(self):
        super().__init__()
        self.name             = "disco"
        self.search_url       = f"{settings.DISCO_API_URL}{_VTEX_SEARCH_PATH}"
        self.store_url        = settings.DISCO_STORE_URL
        self.supermarket_enum = Supermarket.DISCO
        self.region_postal_code = None  # sin sucursal en San Juan: precio online nacional
