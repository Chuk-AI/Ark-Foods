# scheduler_tasks.py

from app import (
    fetch_and_store_weather_forecast,
    fetch_and_store_climatology_data,
    app,
)  # Import your Flask app
from datetime import datetime

start_forecast_date = datetime.strptime("2024-10-01", "%Y-%m-%d")
forecast_length_months = 7
start_climo_date = datetime.strptime("2019-12-31", "%Y-%m-%d")
end_climo_date = datetime.strptime("2020-12-31", "%Y-%m-%d")


def run_scheduled_job():
    print("Running scheduled job: Fetch and store weather data")

    # Use Flask's app context to run the job
    with app.app_context():
        fetch_and_store_weather_forecast(start_forecast_date, forecast_length_months)
        fetch_and_store_climatology_data(start_climo_date, end_climo_date)


if __name__ == "__main__":
    run_scheduled_job()
