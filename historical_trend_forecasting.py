# historical_trend_forecasting.py
"""
UPDATED: Multi-Source Historical Trend Forecasting
==================================================
Uses BOTH ProduceIQ + USDA sources for all forecasts
7-day freshness check applied
"""

from datetime import datetime, timedelta
from typing import Dict, Optional, List, Tuple
import numpy as np
from sqlalchemy import func
import logging

logger = logging.getLogger(__name__)

# ============================================
# Helper Functions
# ============================================


def get_week_number_and_year(date_obj: datetime) -> Tuple[int, int]:
    """Get ISO week number and year"""
    iso_calendar = date_obj.isocalendar()
    return iso_calendar[1], iso_calendar[0]


# ============================================
# DATA AVAILABILITY
# ============================================


def calculate_data_availability(
    db_session, commodity: str, city: str, weeks_ahead: int = 6
) -> float:
    from app import PriceData, normalize_commodity

    commodity = normalize_commodity(commodity)
    today = datetime.now().date()
    current_year = today.year

    commodity_variants = {commodity}
    if commodity == "Cubanelle":
        commodity_variants.add("Cubanelles")

    base_filters = [
        PriceData.commodity.in_(sorted(commodity_variants)),
        PriceData.source.in_(["ProduceIQ", "USDA"]),
        PriceData.price > 0,
        PriceData.year >= current_year - 3,
        PriceData.year < current_year,
    ]

    if city and city != "All cities":
        base_filters.append(PriceData.city_name == city.strip())

    target_weeks = set()
    for offset in range(1, weeks_ahead + 1):
        target_date = today + timedelta(days=offset * 7)
        week_num, _ = get_week_number_and_year(target_date)
        target_weeks.add(week_num)

    available_count = 0
    for target_week in target_weeks:
        min_day = max((target_week - 1) * 7 - 3, 1)
        max_day = min(target_week * 7 + 3, 365)
        has_data = (
            db_session.query(PriceData.id)
            .filter(*base_filters, PriceData.day >= min_day, PriceData.day <= max_day)
            .first()
        ) is not None
        if has_data:
            available_count += 1

    return float(available_count) / len(target_weeks) if target_weeks else 0.0


# ============================================
# BASELINE & HISTORICAL AVERAGES
# ============================================


def get_previous_week_average(db_session, commodity: str, city: str) -> Optional[float]:
    from app import PriceData, normalize_commodity

    commodity = normalize_commodity(commodity)
    today = datetime.now().date()
    current_year = today.year
    current_day = today.timetuple().tm_yday

    commodity_variants = {commodity}
    if commodity == "Cubanelle":
        commodity_variants.add("Cubanelles")

    base_filters = [
        PriceData.commodity.in_(sorted(commodity_variants)),
        PriceData.source.in_(["ProduceIQ", "USDA"]),
        PriceData.price > 0,
    ]

    if city and city != "All cities":
        base_filters.append(PriceData.city_name == city.strip())

    def _dominant_avg(extra_filters):
        rows = (
            db_session.query(PriceData.package, func.avg(PriceData.price).label("avg_price"), func.count().label("cnt"))
            .filter(*base_filters, *extra_filters)
            .group_by(PriceData.package)
            .all()
        )
        if not rows:
            return None
        dominant = max(rows, key=lambda r: r.cnt)
        return float(dominant.avg_price) if dominant.avg_price and dominant.avg_price > 0 else None

    start_day = max(current_day - 7, 1)
    avg_7day = _dominant_avg([PriceData.year == current_year, PriceData.day >= start_day, PriceData.day <= current_day])
    if avg_7day and avg_7day > 0:
        return avg_7day

    start_day = max(current_day - 14, 1)
    return _dominant_avg([PriceData.year == current_year, PriceData.day >= start_day, PriceData.day <= current_day])


def get_historical_weekly_average(db_session, commodity: str, city: str, target_week: int, years_back: int = 3) -> Optional[float]:
    from app import PriceData, normalize_commodity

    commodity = normalize_commodity(commodity)
    today = datetime.now().date()
    current_year = today.year

    commodity_variants = {commodity}
    if commodity == "Cubanelle":
        commodity_variants.add("Cubanelles")

    base_filters = [
        PriceData.commodity.in_(sorted(commodity_variants)),
        PriceData.source.in_(["ProduceIQ", "USDA"]),
        PriceData.price > 0,
        PriceData.year >= current_year - years_back,
        PriceData.year < current_year,
    ]

    if city and city != "All cities":
        base_filters.append(PriceData.city_name == city.strip())

    # Group by (package, year, day) — pick dominant unit before computing weekly averages
    rows = (
        db_session.query(PriceData.package, PriceData.year, PriceData.day, func.avg(PriceData.price).label("avg_price"), func.count().label("cnt"))
        .filter(*base_filters)
        .group_by(PriceData.package, PriceData.year, PriceData.day)
        .all()
    )
    if not rows:
        return None

    from collections import defaultdict
    # Pick dominant unit overall (most rows across all dates)
    unit_counts: dict = defaultdict(int)
    for r in rows:
        unit_counts[r.package or "pkg"] += r.cnt
    dominant_unit = max(unit_counts, key=lambda u: unit_counts[u])

    prices_by_year = {}
    for r in rows:
        if (r.package or "pkg") != dominant_unit:
            continue
        if not r.avg_price or r.avg_price <= 0:
            continue
        date_obj = datetime(int(r.year), 1, 1).date() + timedelta(days=int(r.day) - 1)
        week_num, _ = get_week_number_and_year(date_obj)
        if week_num == target_week:
            prices_by_year.setdefault(int(r.year), []).append(float(r.avg_price))

    if not prices_by_year:
        return None

    weights = {current_year - 1: 3, current_year - 2: 2, current_year - 3: 1}
    weighted_sum = 0.0
    total_weight = 0.0
    for year, prices in prices_by_year.items():
        avg = np.mean(prices)
        weight = weights.get(year, 1)
        weighted_sum += avg * weight
        total_weight += weight

    return float(weighted_sum / total_weight) if total_weight > 0 else None


# ============================================
# TREND PATTERNS
# ============================================


def get_historical_trend_pattern(db_session, commodity: str, city: str, from_week_offset: int, to_week_offset: int, years_back: int = 3) -> Optional[float]:
    from app import PriceData, normalize_commodity

    commodity = normalize_commodity(commodity)
    today = datetime.now().date()
    current_year = today.year

    commodity_variants = {commodity}
    if commodity == "Cubanelle":
        commodity_variants.add("Cubanelles")

    base_filters = [
        PriceData.commodity.in_(sorted(commodity_variants)),
        PriceData.source.in_(["ProduceIQ", "USDA"]),
        PriceData.price > 0,
        PriceData.year >= current_year - years_back,
        PriceData.year < current_year,
    ]

    if city and city != "All cities":
        base_filters.append(PriceData.city_name == city.strip())

    rows = (
        db_session.query(PriceData.package, PriceData.year, PriceData.day, func.avg(PriceData.price).label("avg_price"), func.count().label("cnt"))
        .filter(*base_filters)
        .group_by(PriceData.package, PriceData.year, PriceData.day)
        .all()
    )

    # Pick dominant unit (most records) before computing trend
    from collections import defaultdict as _dd
    _unit_counts: dict = _dd(int)
    for r in rows:
        _unit_counts[r.package or "pkg"] += r.cnt
    _dominant_unit = max(_unit_counts, key=lambda u: _unit_counts[u]) if _unit_counts else "pkg"
    rows = [r for r in rows if (r.package or "pkg") == _dominant_unit]
    if not rows:
        return None

    from_date = today + timedelta(days=from_week_offset * 7)
    to_date = today + timedelta(days=to_week_offset * 7)
    from_week, _ = get_week_number_and_year(from_date)
    to_week, _ = get_week_number_and_year(to_date)

    weekly_avgs = {}
    for r in rows:
        if not r.avg_price or r.avg_price <= 0:
            continue
        date_obj = datetime(int(r.year), 1, 1).date() + timedelta(days=int(r.day) - 1)
        week_num, _ = get_week_number_and_year(date_obj)
        weekly_avgs.setdefault((int(r.year), week_num), []).append(float(r.avg_price))

    trends = []
    for year in range(current_year - years_back, current_year):
        from_key = (year, from_week)
        to_key = (year, to_week)
        if from_key in weekly_avgs and to_key in weekly_avgs:
            from_price = np.mean(weekly_avgs[from_key])
            to_price = np.mean(weekly_avgs[to_key])
            if from_price > 0:
                trends.append(float((to_price - from_price) / from_price))

    return float(np.mean(trends)) if trends else None


# ============================================
# CONFIDENCE SCORING
# ============================================


def calculate_forecast_confidence(forecast_price: float, historical_avg: Optional[float], data_availability: float, base_confidence: float = 0.85) -> float:
    confidence = base_confidence
    confidence *= 0.7 + 0.3 * data_availability
    if historical_avg and historical_avg > 0:
        deviation = abs(forecast_price - historical_avg) / historical_avg
        if deviation < 0.10:
            confidence *= 1.0
        elif deviation < 0.25:
            confidence *= 0.95
        elif deviation < 0.50:
            confidence *= 0.85
        else:
            confidence *= 0.70
    return min(1.0, max(0.0, float(confidence)))


# ============================================
# MAIN FORECAST FUNCTION
# ============================================


def calculate_hybrid_6week_forecast(db_session, commodity: str, city: str) -> Dict:
    try:
        logger.info(f"Starting 6-week trend forecast for {commodity} in {city}")
        from app import normalize_commodity, _get_combined_current_price

        commodity = normalize_commodity(commodity)
        today = datetime.now().date()

        from app import PriceData  # noqa: F811 — needed for unit lookup
        current_price = _get_combined_current_price(commodity, city)
        if not current_price or current_price <= 0:
            return {"success": False, "commodity": commodity, "city": city, "error": "No current price available (must be within 7 days)"}

        # Determine dominant unit label for display
        commodity_variants = {commodity}
        if commodity == "Cubanelle":
            commodity_variants.add("Cubanelles")
        _unit_filters = [
            PriceData.commodity.in_(sorted(commodity_variants)),
            PriceData.source.in_(["ProduceIQ", "USDA"]),
            PriceData.price > 0,
        ]
        if city and city != "All cities":
            _unit_filters.append(PriceData.city_name == city.strip())
        _unit_rows = (
            db_session.query(PriceData.package, func.count().label("cnt"))
            .filter(*_unit_filters)
            .group_by(PriceData.package)
            .all()
        )
        dominant_unit = max(_unit_rows, key=lambda r: r.cnt).package if _unit_rows else None

        prev_week_avg = get_previous_week_average(db_session, commodity, city)
        baseline_price = prev_week_avg if prev_week_avg else current_price
        data_availability = calculate_data_availability(db_session, commodity, city, weeks_ahead=6)

        forecasts = []
        rolling_baseline = baseline_price

        for week_num in range(1, 7):
            forecast_date = today + timedelta(days=week_num * 7)
            target_week, _ = get_week_number_and_year(forecast_date)

            historical_avg = get_historical_weekly_average(db_session, commodity, city, target_week, years_back=3)
            trend = get_historical_trend_pattern(db_session, commodity, city, from_week_offset=week_num - 1, to_week_offset=week_num, years_back=3)

            if trend is not None:
                forecast_price = rolling_baseline * (1 + trend)
                confidence_base = 0.85
            else:
                forecast_price = rolling_baseline
                confidence_base = 0.60

            confidence = calculate_forecast_confidence(forecast_price, historical_avg, data_availability, base_confidence=confidence_base)
            tolerance = forecast_price * (0.05 + (1 - confidence) * 0.10)
            variance_pct = ((forecast_price - historical_avg) / historical_avg * 100) if historical_avg and historical_avg > 0 else None

            forecasts.append({
                "week": week_num,
                "date": forecast_date.strftime("%b %d"),
                "price": round(float(forecast_price), 2),
                "tolerance": round(float(tolerance), 2),
                "lower": round(float(forecast_price - tolerance), 2),
                "upper": round(float(forecast_price + tolerance), 2),
                "confidence": round(float(confidence), 3),
                "historical_avg": round(float(historical_avg), 2) if historical_avg else None,
                "trend_pct": round(float(trend * 100), 2) if trend is not None else None,
                "variance_from_historical_pct": round(float(variance_pct), 1) if variance_pct is not None else None,
            })
            rolling_baseline = forecast_price

        price_change = forecasts[-1]["price"] - forecasts[0]["price"]
        price_change_pct = (price_change / forecasts[0]["price"]) * 100
        avg_confidence = np.mean([f["confidence"] for f in forecasts])
        median_tolerance = np.median([f["tolerance"] for f in forecasts])
        variances = [f["variance_from_historical_pct"] for f in forecasts if f["variance_from_historical_pct"] is not None]

        return {
            "success": True,
            "commodity": commodity,
            "city": city,
            "source": "Combined (ProduceIQ + USDA)",
            "unit": dominant_unit,
            "current_price": round(float(current_price), 2),
            "baseline_price": round(float(baseline_price), 2),
            "forecasts": forecasts,
            "data_availability": round(float(data_availability), 3),
            "avg_confidence": round(float(avg_confidence), 3),
            "volatility": round(float(median_tolerance), 2),
            "price_change_6week": round(float(price_change), 2),
            "price_change_pct": round(float(price_change_pct), 2),
            "avg_variance_from_historical_pct": round(float(np.mean(variances)), 1) if variances else None,
            "method": "Trend-Based Forecast with Historical Reference (Shifting Baseline)",
        }
    except Exception as e:
        logger.error(f"ERROR in forecast for {commodity}: {e}", exc_info=True)
        return {"success": False, "commodity": commodity, "city": city, "error": str(e)}


# ============================================
# CACHE BUILDER
# ============================================


def build_combined_forecasts_cache(city: str = "All cities", db=None, cache_set_func=None, normalize_func=None):
    from app import PEPPER_VARIETIES, calculate_price_forecast

    if db is None or cache_set_func is None:
        logger.error("db and cache_set_func must be provided")
        return

    logger.info(f"Building combined forecasts for {city}")
    results_6week = []
    results_7day = []

    for commodity in PEPPER_VARIETIES:
        try:
            forecast = calculate_hybrid_6week_forecast(db.session, commodity, city)
            results_6week.append(forecast)
        except Exception as e:
            try:
                db.session.rollback()
            except Exception:
                pass
            results_6week.append({"success": False, "commodity": commodity, "error": str(e)})

    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    payload_6week = {
        "success": True,
        "results": results_6week,
        "source": "Combined (ProduceIQ + USDA)",
        "city": city,
        "updated_at": now_str,
    }
    cache_set_func(f"long_term_all_combined_{city.lower().replace(' ', '_')}", payload_6week)

    for commodity in PEPPER_VARIETIES:
        try:
            forecast = calculate_price_forecast(commodity, city)
            results_7day.append(forecast)
        except Exception as e:
            results_7day.append({"success": False, "commodity": commodity, "error": str(e)})

    payload_7day = {
        "success": True,
        "forecasts": results_7day,
        "source": "Combined (ProduceIQ + USDA)",
        "city": city,
        "updated_at": now_str,
    }
    cache_set_func(f"price_forecast_all_combined_{city.lower().replace(' ', '_')}", payload_7day)
    logger.info(f"Combined forecasts complete for {city}")


def create_historical_trend_cache_builders(db, cache_set_func, normalize_func):
    def builder(city: str = "All cities"):
        return build_combined_forecasts_cache(city, db, cache_set_func, normalize_func)
    return builder
