import os
import requests
import sys
from app import (
    fetch_usda_daily_data,
    fetch_daily_data,
    app,
)  # Import your Flask app

HEROKU_API_KEY = os.getenv("HEROKU_API_KEY")
APP_NAME = os.getenv("HEROKU_APP_NAME")


def stop_worker_dyno():
    """Stop the Heroku worker dyno by scaling it down to zero."""
    if not HEROKU_API_KEY or not APP_NAME:
        print("Error: Missing HEROKU_API_KEY or HEROKU_APP_NAME environment variables.")
        return

    url = f"https://api.heroku.com/apps/{APP_NAME}/formation/worker2"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/vnd.heroku+json; version=3",
        "Authorization": f"Bearer {HEROKU_API_KEY}",
    }
    data = {"quantity": 0}

    response = requests.patch(url, headers=headers, json=data)

    if response.status_code == 200:
        print("Successfully stopped the worker2 dyno.")
    else:
        print(
            f"Failed to stop the worker2 dyno: {response.status_code} - {response.text}"
        )


def daily_schedule():
    try:
        fetch_daily_data()
        fetch_usda_daily_data()
    except Exception as e:
        print(f"Error occurred: {e}")
    finally:
        # Stop the worker dyno once the job is complete
        stop_worker_dyno()
        # Ensure the process exits to avoid memory quota exceeded issues
        sys.exit(0)


if __name__ == "__main__":
    daily_schedule()
