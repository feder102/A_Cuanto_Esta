"""
Configuración de la aplicación usando Pydantic Settings.
Carga variables de entorno desde .env
"""
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import validator


class Settings(BaseSettings):
    """Configuración general de la aplicación"""
    
    # Información del proyecto
    PROJECT_NAME: str = "A Cuanto Está"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"
    # None = sin configurar explícitamente: se deriva de ENVIRONMENT (ver validator abajo)
    # para que producción nunca herede DEBUG=True en silencio.
    DEBUG: Optional[bool] = None
    
    # Base de datos
    DATABASE_URL: str
    # Conexión directa (sin pooler), requerida por Alembic para migraciones.
    # Neon usa PgBouncer en modo transacción en la URL pooled, que no soporta
    # el estado de sesión que Alembic necesita para DDL.
    DATABASE_URL_UNPOOLED: Optional[str] = None
    DATABASE_ECHO: bool = False
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = []

    @validator("DEBUG", pre=True, always=True)
    def default_debug_from_environment(cls, v, values):
        if v is None:
            return values.get("ENVIRONMENT", "development") != "production"
        return v

    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: str | List[str]) -> List[str] | str:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    # Redis y Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    
    # Scraping
    SCRAPING_DELAY: int = 2
    SCRAPING_TIMEOUT: int = 30
    USER_AGENT: str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    
    # APIs externas
    ARGENTINA_DATOS_API_URL: str = "https://api.argentinadatos.com"
    DOLAR_API_URL: str = "https://dolarapi.com"
    DATOS_GOB_AR_API_URL: str = "https://apis.datos.gob.ar/series/api"

    # Coto Digital (Constructor.io)
    COTO_BASE_URL: str = "https://www.cotodigital.com.ar"
    CONSTRUCTOR_API_URL: str = "https://ac.cnstrc.com"
    COTO_CONSTRUCTOR_KEY: str = "key_r6xzz4IAoTWcipni"

    # Carrefour Argentina (VTEX)
    CARREFOUR_API_URL: str = "https://carrefourar.vtexcommercestable.com.br"
    CARREFOUR_STORE_URL: str = "https://www.carrefour.com.ar"

    # Vea Argentina (VTEX — mismo grupo Cencosud que Disco)
    VEA_API_URL: str   = "https://veaargentina.vtexcommercestable.com.br"
    VEA_STORE_URL: str = "https://www.vea.com.ar"

    # Disco Argentina (VTEX — Cencosud)
    DISCO_API_URL: str   = "https://discoargentina.vtexcommercestable.com.br"
    DISCO_STORE_URL: str = "https://www.disco.com.ar"

    # Jumbo Argentina (VTEX — Cencosud)
    JUMBO_API_URL: str   = "https://jumboargentina.vtexcommercestable.com.br"
    JUMBO_STORE_URL: str = "https://www.jumbo.com.ar"

    # Día Argentina (VTEX)
    DIA_API_URL: str   = "https://diaio.vtexcommercestable.com.br"
    DIA_STORE_URL: str = "https://diaonline.supermercadosdia.com.ar"

    # La Anónima (API propia)
    LA_ANONIMA_API_URL: str   = "https://api.laanonima.com.ar"
    LA_ANONIMA_STORE_URL: str = "https://www.laanonima.com.ar"

    # Chango Más / MasOnline (VTEX — GDN Argentina)
    CHANGO_MAS_API_URL: str   = "https://www.masonline.com.ar"
    CHANGO_MAS_STORE_URL: str = "https://www.masonline.com.ar"
    
    # Precios de San Juan (Carrefour y Chango Más por región VTEX, La Anónima por sucursal)
    SAN_JUAN_POSTAL_CODE: str = "5400"
    LA_ANONIMA_SAN_JUAN_BRANCH_ID: str = "180"  # ex Hiper Libertad

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"
    
    # Cache
    CACHE_TTL: int = 3600  # 1 hora
    PRICE_CACHE_TTL: int = 1800  # 30 minutos
    
    # Scraping Schedule
    SCRAPING_SCHEDULE_HOUR: int = 2
    SCRAPING_SCHEDULE_MINUTE: int = 0
    
    # Security
    SECRET_KEY: str

    # Web Push (VAPID) — opcionales: sin configurar, el endpoint de la
    # clave pública devuelve 503 y el script de chequeo aborta con error
    # claro, en vez de romper el arranque normal de la app.
    VAPID_PUBLIC_KEY: Optional[str] = None
    VAPID_PRIVATE_KEY: Optional[str] = None
    VAPID_CLAIMS_EMAIL: str = "admin@example.com"

    class Config:
        env_file = ".env"
        case_sensitive = True


# Instancia global de configuración
settings = Settings()
