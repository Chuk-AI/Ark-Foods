import os
import requests
from datetime import datetime

from app import (
    fetch_and_store_weather_forecast,
    fetch_and_store_climatology_data,
    app,
)  # Import your Flask app

# Dates and configuration
start_forecast_date = datetime.strptime("2024-10-01", "%Y-%m-%d")
forecast_length_months = 3
start_climo_date = datetime.strptime("2001-12-31", "%Y-%m-%d")
end_climo_date = datetime.strptime("2020-12-31", "%Y-%m-%d")

HEROKU_API_KEY = os.getenv("HEROKU_API_KEY")
APP_NAME = os.getenv("HEROKU_APP_NAME")


def stop_worker_dyno():
    """Stop the Heroku worker dyno by scaling it down to zero."""
    if not HEROKU_API_KEY or not APP_NAME:
        print("Error: Missing HEROKU_API_KEY or HEROKU_APP_NAME environment variables.")
        return

    url = f"https://api.heroku.com/apps/{APP_NAME}/formation/worker"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/vnd.heroku+json; version=3",
        "Authorization": f"Bearer {HEROKU_API_KEY}",
    }
    data = {"quantity": 0}

    response = requests.patch(url, headers=headers, json=data)

    if response.status_code == 200:
        print("Successfully stopped the worker dyno.")
    else:
        print(
            f"Failed to stop the worker dyno: {response.status_code} - {response.text}"
        )


def run_scheduled_job():
    print("Running scheduled job: Fetch and store weather data")

    # Use Flask's app context to run the job
    with app.app_context():
        fetch_and_store_weather_forecast(start_forecast_date, forecast_length_months)
        fetch_and_store_climatology_data(start_climo_date, end_climo_date)

    # Stop the worker dyno once the job is complete
    stop_worker_dyno()


if __name__ == "__main__":
    # Only run the job if it's the 8th day of the month
    if datetime.now().day == 8:
        run_scheduled_job()
    else:
        print("Today is not the 8th. Exiting script.")
        stop_worker_dyno()
