import requests
import logging
import pandas as pd

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

def fetch_usda_shipping_data():
    from app import db, UShippingPriceData  # Import database and model

    # API Key and Endpoint
    API_KEY = "LIm1Mr7tz2MRDq+5CyCXttTtSkfsD1Kr"
    BASE_URL = "https://marsapi.ams.usda.gov/services/v1.2/marketTypes/sc-cr/sc/shippingpt/daily"

    # Commodities to filter
    wanted_commodities = [
        "Anaheim",
        "Cubanelles",
        "Fresno",
        "Habanero",
        "Hungarian Wax",
        "Jalapeno",
        "Long Hot",
        "Poblano",
        "Serrano",
        "Shishito",
    ]

    # Standardize the commodity list for comparison
    wanted_commodities = [commodity.lower() for commodity in wanted_commodities]

    # Map standardized names back to desired format
    standardized_name = {
        "anaheim": "Anaheim",
        "cubanelles": "Cubanelles",
        "fresno": "Fresno",
        "habanero": "Habanero",
        "hungarian wax": "Hungarian Wax",
        "jalapeno": "Jalapeno",
        "long hot": "Long Hot",
        "poblano": "Poblano",
        "serrano": "Serrano",
        "shishito": "Shishito",
    }

    # Define date range
    start_date = pd.Timestamp("2024-1-06")  # Adjust as needed
    end_date = pd.Timestamp.today()

    current_date = start_date

    while current_date <= end_date:
        params = {
            "q": f"report_date={current_date.strftime('%m/%d/%Y')}"
        }

        # Fetch data for the current day
        response = requests.get(BASE_URL, auth=(API_KEY, ""), params=params)

        if response.status_code == 200:
            data = response.json().get('results', [])
            logging.info(f"Fetched {len(data)} records for {current_date.strftime('%Y-%m-%d')}.")

            # Process and filter data
            for item in data:
                commodity = item.get('commodity', "").strip().lower()

                # Check if the commodity starts with 'peppers,' and matches wanted_commodities
                if commodity.startswith("peppers,"):
                    stripped_commodity = commodity.replace("peppers, ", "").strip()
                    if stripped_commodity in wanted_commodities:
                        standardized_commodity = standardized_name.get(stripped_commodity, stripped_commodity)

                        # Extract first city name before the comma
                        location = item.get('location', "")
                        first_city = location.split(",")[0].strip()

                        # Calculate season
                        report_date = pd.Timestamp(item.get('report_date', ""))
                        year = report_date.year
                        month = report_date.month

                        if month in [3, 4, 5]:
                            season = "Spring"
                        elif month in [6, 7, 8]:
                            season = "Summer"
                        elif month in [9, 10, 11]:
                            season = "Autumn"
                        else:
                            season = "Winter"

                        # Calculate price as average of low and high price and round to 1 decimal place
                        low_price = item.get('low_price')
                        high_price = item.get('high_price')

                        try:
                            price = round((float(low_price) + float(high_price)) / 2, 1) if low_price and high_price else round(float(low_price or high_price or 0), 1)
                        except ValueError:
                            price = 0.0

                        # Save to database
                        shipping_price_data = UShippingPriceData(
                            city_name=first_city,
                            commodity=standardized_commodity,
                            year=year,
                            price=price,
                            source="USDA",
                            season=season,
                        )
                        db.session.add(shipping_price_data)

            # Commit data to the database
            db.session.commit()
        else:
            logging.error(f"Failed to fetch data for {current_date.strftime('%Y-%m-%d')}. Status code: {response.status_code}")

        # Move to the next day
        current_date += pd.Timedelta(days=1)

    logging.info("Data fetching and saving completed.")

if __name__ == "__main__":
    from app import app  # Import only the `app` object here
    with app.app_context():  # Wrap all operations in the app context
        fetch_usda_shipping_data()
