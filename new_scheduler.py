import os
import requests
from app import fetch_shipping_data, fetch_usda_daily_data, fetch_daily_data  # Import your Flask app functions


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


def execute_scheduled_functions():
    """Execute the functions you want to run on schedule."""
    try:
        print("Executing scheduled tasks...")
        fetch_daily_data()  # Replace with your actual function calls
        fetch_shipping_data()
        fetch_usda_daily_data()  # Replace with your actual function calls
        print("Scheduled tasks executed successfully.")
    except Exception as e:
        print(f"Error occurred during scheduled execution: {e}")
    finally:
        # Stop the worker dyno if needed (if you're using Heroku worker dyno)
        stop_worker_dyno()


if __name__ == "__main__":
    # Directly execute the tasks when the script is run
    execute_scheduled_functions()
