# scheduler_tasks.py

from app import fetch_and_store_weather_forecasts


def run_scheduled_job():
    print("Running scheduled job: Fetch and store weather data")
    fetch_and_store_weather_forecasts()


if __name__ == "__main__":
    run_scheduled_job()
