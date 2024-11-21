import logging
import requests
import pandas as pd
import gc
from datetime import datetime
from app import app, db  # Import app and db from your Flask app
from app import PriceData  # Import your PriceData model

logging.basicConfig(level=logging.INFO)


def fetch_hungarian_long_hot():
    with app.app_context():
        base_url = "https://api.produceiq.com/index/v2/trends/"
        headers = {"Api-Subscription-Key": "5aa11f87fed04300b05addd031c56ffa"}

        # Commodities to fetch
        target_commodities = ["Hungarian Wax", "Long Hot"]

        # Standardize for comparison
        target_commodities_lower = [
            commodity.lower() for commodity in target_commodities
        ]

        # Mapping standardized names back to desired format
        standardized_name = {
            "hungarian wax": "Hungarian Wax",
            "long hot": "Long Hot",
        }

        # Start date for fetching data
        start_dt = pd.Timestamp("2024-10-01")  # Day after 30th September 2024
        end_dt = pd.Timestamp.today()  # Fetch data up to today

        # Loop through each day from start date to today
        current_dt = start_dt
        while current_dt <= end_dt:
            params = {
                "commodityId": 18,  # Adjust this if needed for specific commodity group
                "from": current_dt.strftime("%Y-%m-%d"),
                "to": current_dt.strftime(
                    "%Y-%m-%d"
                ),  # Fetch data for one day at a time
            }

            # Fetch data for the current day
            response = requests.get(
                f"{base_url}terminal-market-trends",
                headers=headers,
                params=params,
                verify=True,
            )

            if response.status_code == 200:
                data = response.json().get("subset", [])
                logging.info(f"Fetched data for {current_dt.strftime('%Y-%m-%d')}")
            else:
                logging.error(
                    f"Failed to fetch data for {current_dt.strftime('%Y-%m-%d')}. Status code: {response.status_code}"
                )
                current_dt += pd.Timedelta(days=1)
                continue

            # Process and save the data
            for item in data:
                variety_name = item.get("varietyName", "").strip().lower()

                # Filter for Hungarian Wax and Long Hot
                if variety_name in target_commodities_lower:
                    variety_name = standardized_name.get(variety_name, variety_name)
                    city_name = item.get("terminalMarketCityName")
                    year = item.get("isoYear")
                    day_of_year = item.get("day")
                    price = item.get("price")
                    source = "ProduceIQ"

                    # Calculate the season based on the month
                    month = (
                        pd.Timestamp(year=year, day=1, month=1).day_of_year // 30 + 1
                    )
                    if month in [3, 4, 5]:
                        season = "Spring"
                    elif month in [6, 7, 8]:
                        season = "Summer"
                    elif month in [9, 10, 11]:
                        season = "Autumn"
                    else:
                        season = "Winter"

                    # Save to the database
                    price_data = PriceData(
                        city_name=city_name,
                        commodity=variety_name,
                        year=year,
                        day=day_of_year,
                        price=price,
                        source=source,
                        season=season,
                    )

                    db.session.add(price_data)
                    logging.info(
                        f"Added {variety_name} for {current_dt.strftime('%Y-%m-%d')} in {city_name}"
                    )

            # Commit the data for the current day
            db.session.commit()
            gc.collect()
            current_dt += pd.Timedelta(days=1)

        logging.info(
            f"Data fetching completed from {start_dt.strftime('%Y-%m-%d')} to {end_dt.strftime('%Y-%m-%d')}."
        )


# Run the script
if __name__ == "__main__":
    fetch_hungarian_long_hot()
