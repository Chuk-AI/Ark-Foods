# scheduler_tasks.py

from app import fetch_and_store_weather_forecast, app  # Import your Flask app


def run_scheduled_job():
    print("Running scheduled job: Fetch and store weather data")

    # Use Flask's app context to run the job
    with app.app_context():
        fetch_and_store_weather_forecast()


if __name__ == "__main__":
    run_scheduled_job()
