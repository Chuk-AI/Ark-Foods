import os
import requests
from datetime import datetime, timedelta
from calendar import monthrange
import sys

from app import (
    fetch_and_store_weather_forecast,
    app,
)  # Import your Flask app

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
    try:
        today = datetime.now()
        if today.day == 20:
            start_forecast_horizon_date = today.replace(day=1).strftime("%Y-%m-%d")
            start_forecast_date = start_forecast_horizon_date
            days_in_month = monthrange(
                datetime.strptime(start_forecast_horizon_date, "%Y-%m-%d").year,
                datetime.strptime(start_forecast_horizon_date, "%Y-%m-%d").month,
            )[1]
            end_forecast_horizon_date = (
                datetime.strptime(start_forecast_horizon_date, "%Y-%m-%d")
                + timedelta(days=days_in_month * 7)
            ).strftime("%Y-%m-%d")

            print("Running scheduled job: Fetch and store weather data")

            # Use Flask's app context to run the job
            with app.app_context():
                fetch_and_store_weather_forecast(
                    start_forecast_date,
                    end_forecast_horizon_date,
                    start_forecast_horizon_date,
                    start_ensembles=1,
                    end_ensembles=50,
                    store_in_excel=0,
                )

        # Stop the worker dyno once the job is complete
        stop_worker_dyno()
    except Exception as e:
        print(f"Error occurred: {e}")
    finally:
        # Ensure the process exits to avoid memory quota exceeded issues
        sys.exit(0)


if __name__ == "__main__":
    run_scheduled_job()
