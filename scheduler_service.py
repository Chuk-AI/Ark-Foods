"""
scheduler_service.py — cache builder called by app.py's /api/trigger_cache_build
"""
import logging

logger = logging.getLogger(__name__)

CITIES_TO_CACHE = [
    "New York",
    "Chicago",
    "Los Angeles",
    "Miami",
    "Philadelphia",
    "Boston",
    "Baltimore",
    "Columbia",
    "Detroit",
    "Atlanta",
]


def build_all_caches():
    """Build 7-day and 6-week forecast caches for all cities.
    Runs inside an app context (caller's responsibility).
    """
    from app import db, cache_set, normalize_commodity
    from historical_trend_forecasting import build_combined_forecasts_cache

    logger.info("build_all_caches: starting")
    total = len(CITIES_TO_CACHE)
    for i, city in enumerate(CITIES_TO_CACHE, 1):
        try:
            logger.info(f"build_all_caches: [{i}/{total}] building cache for city={city!r}")
            build_combined_forecasts_cache(city, db, cache_set, normalize_commodity)
            logger.info(f"build_all_caches: [{i}/{total}] done city={city!r}")
        except Exception as e:
            logger.error(f"build_all_caches: [{i}/{total}] FAILED city={city!r}: {e}", exc_info=True)
    logger.info("build_all_caches: all done")
