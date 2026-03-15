import requests
import logging
import pandas as pd

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)


import re
from fractions import Fraction

# ── Bushel weight (lbs) per variety ──────────────────────────────────────────
BUSHEL_LBS = {
    "jalapeno": 32,
    "hungarian wax": 28,
    "shishito": 22,  # bu = 22 lbs
    "fresno": 28,  # bu = 28-30 lbs, using lower bound
    "long hot": 24,  # bu = 24 lbs
    "habanero": 22,  # bu = 22 lbs
    "anaheim": 30,
    "cubanelle": 20,
    "serrano": 28,  # clarified at 28 lbs
    "poblano": 26,  # bu = 25-27 lbs, using midpoint
}


def parse_package_lbs(package_str: str, lbs_per_bu: float) -> float | None:
    """
    Parse a USDA package string and return its weight in lbs.
    Returns None if the string cannot be parsed (e.g. bare "crates").

    Handles:
      - "1 1/9 bushel cartons"  → 1.111 * lbs_per_bu
      - "1/2 bushel cartons"    → 0.5   * lbs_per_bu
      - "20 lb cartons"         → 20.0
      - "10 lb reusable ..."    → 10.0
      - "4 kg cartons"          → 4 * 2.20462
    """
    if not package_str:
        return None

    s = package_str.strip().lower()

    # ── Bushel fractions/multiples (e.g. "1 1/9 bushel", "1/2 bushel") ──────
    bu_match = re.search(r"(\d+\s+\d+/\d+|\d+/\d+|\d+\.?\d*)\s*bushel", s)
    if bu_match:
        qty_str = bu_match.group(1).strip()
        parts = qty_str.split()
        if len(parts) == 2:  # mixed number e.g. "1 1/9"
            qty = int(parts[0]) + float(Fraction(parts[1]))
        else:
            qty = float(Fraction(qty_str))
        return qty * lbs_per_bu

    # ── Pounds (e.g. "20 lb cartons", "10 lb reusable plastic containers") ───
    lb_match = re.search(r"(\d+\.?\d*)\s*lb", s)
    if lb_match:
        return float(lb_match.group(1))

    # ── Kilograms (e.g. "4 kg cartons") ──────────────────────────────────────
    kg_match = re.search(r"(\d+\.?\d*)\s*kg", s)
    if kg_match:
        return float(kg_match.group(1)) * 2.20462

    return None  # e.g. bare "crates" — cannot determine weight


def fetch_usda_terminal_data():
    from app import db, PriceData

    API_KEY = "LIm1Mr7tz2MRDq+5CyCXttTtSkfsD1Kr"
    BASE_URL = (
        "https://marsapi.ams.usda.gov/services/v1.2/marketTypes/sc-cr/sc/terminal/daily"
    )

    wanted_commodities = [
        "Anaheim",
        "Cubanelle",
        "Fresno",
        "Habanero",
        "Hungarian Wax",
        "Jalapeno",
        "Long Hot",
        "Poblano",
        "Serrano",
        "Shishito",
    ]

    wanted_cities = [
        "Chicago",
        "New York",
        "Boston",
        "Miami",
        "Baltimore",
        "Los Angeles",
        "Philadelphia",
        "Columbia",
        "Detroit",
        "Atlanta",
    ]

    wanted_commodities = [c.lower() for c in wanted_commodities]

    standardized_name = {
        "anaheim": "Anaheim",
        "cubanelle": "Cubanelle",
        "fresno": "Fresno",
        "habanero": "Habanero",
        "hungarian wax": "Hungarian Wax",
        "jalapeno": "Jalapeno",
        "long hot": "Long Hot",
        "poblano": "Poblano",
        "serrano": "Serrano",
        "shishito": "Shishito",
    }

    start_date = pd.Timestamp("2024-12-06")
    end_date = pd.Timestamp.today()
    current_date = start_date

    while current_date <= end_date:
        params = {"q": f"report_date={current_date.strftime('%m/%d/%Y')}"}
        response = requests.get(BASE_URL, auth=(API_KEY, ""), params=params)

        if response.status_code == 200:
            data = response.json().get("results", [])
            logging.info(
                f"Fetched {len(data)} records for {current_date.strftime('%Y-%m-%d')}."
            )

            for item in data:
                commodity = item.get("commodity", "").strip().lower()

                if commodity.startswith("peppers,"):
                    stripped_commodity = commodity.replace("peppers, ", "").strip()
                    if stripped_commodity in wanted_commodities:
                        standardized_commodity = standardized_name.get(
                            stripped_commodity, stripped_commodity
                        )

                        location = item.get("location", "")
                        first_city = location.split(",")[0].strip()

                        if first_city in wanted_cities:
                            report_date = pd.Timestamp(item.get("report_date", ""))
                            year = report_date.year
                            month = report_date.month
                            day_of_year = report_date.day_of_year

                            if month in [3, 4, 5]:
                                season = "Spring"
                            elif month in [6, 7, 8]:
                                season = "Summer"
                            elif month in [9, 10, 11]:
                                season = "Autumn"
                            else:
                                season = "Winter"

                            low_price = item.get("low_price")
                            high_price = item.get("high_price")

                            try:
                                raw_price = (
                                    round((float(low_price) + float(high_price)) / 2, 1)
                                    if low_price and high_price
                                    else round(float(low_price or high_price or 0), 1)
                                )
                            except ValueError:
                                raw_price = 0.0

                            # ── NEW: extract raw fields ───────────────────────
                            package = item.get("package", None)
                            origin = item.get("origin", None)
                            item_size = item.get("item_size", None)

                            # ── NEW: convert price to per-bushel ──────────────
                            lbs_per_bu = BUSHEL_LBS.get(stripped_commodity)
                            package_lbs = (
                                parse_package_lbs(package, lbs_per_bu)
                                if lbs_per_bu and package
                                else None
                            )

                            if package_lbs and package_lbs > 0:
                                # price_per_bu = (raw_price / package_lbs) * lbs_per_bu
                                price = round((raw_price / package_lbs) * lbs_per_bu, 2)
                            else:
                                # Package unit unrecognisable — skip to avoid
                                # mixing incomparable units in the DB
                                logging.warning(
                                    f"Cannot parse package '{package}' for "
                                    f"{standardized_commodity} on {current_date.date()} "
                                    f"— row skipped."
                                )
                                continue
                            # ─────────────────────────────────────────────────

                            price_data = PriceData(
                                city_name=first_city,
                                commodity=standardized_commodity,
                                year=year,
                                day=day_of_year,
                                price=price,  # now always $/bushel
                                source="USDA",
                                season=season,
                                package=package,  # raw string kept for reference
                                origin=origin,
                                item_size=item_size,
                            )
                            db.session.add(price_data)

            db.session.commit()
        else:
            logging.error(
                f"Failed to fetch data for {current_date.strftime('%Y-%m-%d')}. "
                f"Status code: {response.status_code}"
            )

        current_date += pd.Timedelta(days=1)

    logging.info("Data fetching and saving completed.")


if __name__ == "__main__":
    from app import app  # Import only the `app` object here

    with app.app_context():  # Wrap all operations in the app context
        fetch_usda_terminal_data()
