"""
Scraper de La Anónima via API propia.

La Anónima usa una API REST propia (no VTEX). No expone EAN/barcode —
los productos se identifican por codAnonima (ID interno), prefijado con
"la_anonima_" para evitar colisiones con otros supermercados.

Nota: La API devuelve {"redirectUrl": "..."} para algunos términos genéricos
(ej. "leche", "aceite"). Para esos casos usar términos más específicos.
Los precios de la API pueden contener valores corruptos de períodos anteriores —
se filtran con MIN_VALID_PRICE / MAX_VALID_PRICE.
"""
from app.config.settings import settings
from app.models.product import ProductUnit
from app.models.price_history import PriceHistory, Supermarket
from app.scrapers.base import BaseScraper
from app.scrapers.utils.normalizer import normalize_product_name, map_category

PER_PAGE = 20
_SEARCH_PATH = "/catalogo/buscador"

MIN_VALID_PRICE = 200.0
MAX_VALID_PRICE = 150_000.0

DEFAULT_SEARCH_TERMS = [
    "leche entera", "leche descremada", "sachet leche",
    "yogur", "queso", "margarina",
    "arroz", "fideos", "harina 0000", "aceite girasol", "aceite oliva",
    "azucar", "sal", "galletitas", "mermelada",
    "cafe", "yerba", "agua", "gaseosa", "jugo",
    "detergente", "jabon",
]


class LaAnonimaScraper(BaseScraper):
    """
    Scraper de La Anónima Argentina.
    API: GET https://api.laanonima.com.ar/catalogo/buscador/{término}?pagina={N}
    Paginación por número de página (20 items/página).
    """

    def __init__(self):
        super().__init__()
        self.name             = "la_anonima"
        self.search_url       = f"{settings.LA_ANONIMA_API_URL}{_SEARCH_PATH}"
        self.store_url        = settings.LA_ANONIMA_STORE_URL
        self.supermarket_enum = Supermarket.LA_ANONIMA
        # Los precios son por sucursal: se fija la de San Juan (ex Hiper Libertad).
        self.session.cookies.update({
            "Id-Sucursal-Super": settings.LA_ANONIMA_SAN_JUAN_BRANCH_ID,
            "codigoPostal": settings.SAN_JUAN_POSTAL_CODE,
            "seleccionocp": "1",
        })

    def search(self, query: str, pagina: int = 1) -> list | None:
        """Llama al buscador de La Anónima. Retorna lista de artículos o None."""
        result = self._get(f"{self.search_url}/{query}", params={"pagina": pagina})
        if not isinstance(result, dict):
            return None
        if "redirectUrl" in result:
            print(f"[{self.name}] '{query}' redirige a {result['redirectUrl']} — término no soportado, omitiendo")
            return None
        return result.get("articulos") or []

    def parse_product(self, raw: dict) -> dict | None:
        """Convierte un artículo del JSON de La Anónima en el dict normalizado."""
        cod = raw.get("codAnonima") or raw.get("idProducto")
        price = raw.get("precioMostrar")
        if not cod or not price:
            return None

        original = raw.get("precioOriginal", price)
        on_sale = original and float(original) > float(price)
        discount_pct = raw.get("ahorroPorcentaje")
        if not on_sale:
            original, discount_pct = None, None

        # Categoría desde rutaCategoria: "Almacén > Desayuno y Merienda > Leche en Polvo"
        ruta = raw.get("rutaCategoria", "")
        segments = [s.strip() for s in ruta.split(">") if s.strip()]
        groups = [{"display_name": s, "path_list": [{"display_name": s}]} for s in segments]
        category = map_category(groups)

        images = raw.get("imagenPrincipal") or []
        image_url = images[0].get("url") if images else None

        return {
            "name":              raw.get("titulo", ""),
            "normalized_name":   normalize_product_name(raw.get("titulo", "")),
            "brand":             raw.get("descMarca"),
            "category":          category,
            "unit":              ProductUnit.UNIDAD,
            "quantity":          None,
            "image_url":         image_url,
            "barcode":           f"la_anonima_{cod}",
            "price":             float(price),
            "original_price":    float(original) if original else None,
            "was_on_sale":       bool(on_sale),
            "discount_percentage": float(discount_pct) if discount_pct else None,
            "url":               f"{self.store_url}/art_{cod}",
            "in_stock":          raw.get("existenciaSuper") == "S" and raw.get("disponible") == 1,
        }

    def _save_product(self, db_session, product_data: dict) -> bool:
        """Guarda o actualiza el producto en la BD. Retorna True si es nuevo."""
        product, is_new = self._get_or_create_product(
            db_session,
            barcode=product_data["barcode"],
            store_name=self.name,
            product_data=product_data,
        )
        db_session.add(PriceHistory(
            product_id=product.id,
            supermarket=self.supermarket_enum,
            price=product_data["price"],
            original_price=product_data["original_price"],
            was_on_sale=product_data["was_on_sale"],
            discount_percentage=product_data["discount_percentage"],
            url=product_data["url"],
            in_stock=product_data["in_stock"],
        ))
        return is_new

    def scrape(self, db_session=None, search_terms=None, max_per_term=200) -> int:
        if search_terms is None:
            search_terms = DEFAULT_SEARCH_TERMS
        total_new = 0
        # Evita guardar el mismo producto dos veces en la misma sesión de scraping.
        # Un producto puede aparecer en múltiples términos de búsqueda; sin esto
        # se insertarían N registros idénticos con precios potencialmente distintos.
        seen_barcodes: set[str] = set()

        for term in search_terms:
            pagina = 1
            term_count = 0
            while term_count < max_per_term:
                print(f"[{self.name}] Buscando: '{term}' (página {pagina})...")
                articles = self.search(term, pagina)
                if articles is None:
                    break
                if not articles:
                    break

                for raw in articles:
                    if term_count >= max_per_term:
                        break
                    product_data = self.parse_product(raw)
                    if not product_data:
                        continue
                    price = product_data["price"]
                    if not (MIN_VALID_PRICE <= price <= MAX_VALID_PRICE):
                        print(f"[{self.name}] SKIPPED precio inválido: {product_data['name'][:40]} | ${price:,.2f}")
                        continue
                    barcode = product_data["barcode"]
                    if barcode in seen_barcodes:
                        continue
                    seen_barcodes.add(barcode)
                    if db_session:
                        if self._save_product(db_session, product_data):
                            total_new += 1
                    else:
                        sale_str = ""
                        if product_data["was_on_sale"] and product_data["original_price"]:
                            sale_str = f" (antes ${product_data['original_price']:,.2f}, -{product_data['discount_percentage']:.0f}%)"
                        print(f"  ✓ {product_data['name'][:50]:<50} | ${product_data['price']:,.2f}{sale_str} | Cat: {product_data['category'].name}")
                    term_count += 1

                if db_session:
                    db_session.commit()

                print(f"[{self.name}] '{term}': {term_count} productos procesados")

                if len(articles) < PER_PAGE:
                    break
                pagina += 1

        return total_new
