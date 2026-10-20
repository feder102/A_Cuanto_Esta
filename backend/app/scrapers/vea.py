"""
Scraper de Vea Argentina via API pública de VTEX.

Vea (Cencosud) usa VTEX, cuenta veaargentina. La estructura de la API
es idéntica a Carrefour — hereda toda la lógica de CarrefourScraper.
"""
from app.config.settings import settings
from app.models.price_history import Supermarket
from app.scrapers.carrefour import CarrefourScraper, _VTEX_SEARCH_PATH


class VeaScraper(CarrefourScraper):
    """
    Scraper de Vea Argentina.
    Hereda toda la lógica de CarrefourScraper — solo difiere en URLs y enum.
    """

    def __init__(self):
        super().__init__()
        self.name             = "vea"
        self.search_url       = f"{settings.VEA_API_URL}{_VTEX_SEARCH_PATH}"
        self.store_url        = settings.VEA_STORE_URL
        self.supermarket_enum = Supermarket.VEA
        self.region_postal_code = None  # precio online nacional
