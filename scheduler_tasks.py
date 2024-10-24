import asyncio
from app import fetch_and_store_weather_forecasts, app  # Import your Flask app


# Function to run the scheduled job
def run_scheduled_job():
    print("Running scheduled job: Fetch and store weather data")

    # Use Flask's app context to run the job
    with app.app_context():
        asyncio.run(
            fetch_and_store_weather_forecasts()
        )  # Run the async task with asyncio


if __name__ == "__main__":
    run_scheduled_job()
