import os
import datetime
import logging

# If your app.py is in the same directory, adjust the import as needed:
from app import (
    app,
    fetch_and_store_weather_forecast,
    fetch_and_store_climatology_data,
)

from dotenv import load_dotenv

load_dotenv()  # Loads environment variables from .env (if needed)

logging.basicConfig(level=logging.INFO)

def run_weather_tasks():
    """
    Execute the functions that fetch weather forecasts and climatology data.
    Adjust date ranges or parameters as necessary.
    """
    try:
        logging.info("Starting weather tasks...")

        with app.app_context():
            # ------------------------------------------------------------------
            # 1) Example: fetch weather forecast data
            # ------------------------------------------------------------------
            # Suppose we want a 10-day forecast horizon from 'today'
            today = datetime.date.today()
            start_forecast_date = today
            start_forecast_horizon_date = today
            end_forecast_horizon_date = today + datetime.timedelta(days=10)

            # Example ensemble members from 1..5
            start_ensembles = 1
            end_ensembles = 5

            # Set store_in_excel=0 (no Excel), or 1 if you want to store in Excel
            store_in_excel = 0

            # Call the weather-forecast fetch function
            logging.info("Fetching weather forecast data...")
            fetch_and_store_weather_forecast(
                start_forecast_date,
                end_forecast_horizon_date,
                start_forecast_horizon_date,
                start_ensembles,
                end_ensembles,
                store_in_excel,
            )
            logging.info("Weather forecast data fetch complete.")

            # ------------------------------------------------------------------
            # 2) Example: fetch climatology data
            # ------------------------------------------------------------------
            # For example, you might want 1980-01-01 through 2020-12-31
            # or any historical range used for building climatologies
            start_climo_date = datetime.date(1980, 1, 1)
            end_climo_date = datetime.date(2020, 12, 31)

            logging.info("Fetching climatology data...")
            fetch_and_store_climatology_data(start_climo_date, end_climo_date)
            logging.info("Climatology data fetch complete.")

        logging.info("All weather tasks executed successfully.")

    except Exception as e:
        logging.error(f"Error in run_weather_tasks: {str(e)}")


if __name__ == "__main__":
    # Directly execute the tasks when this script is run
    run_weather_tasks()
