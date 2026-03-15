import os
from app import app, fetch_shipping_data, fetch_usda_daily_data, fetch_daily_data
from usda import fetch_usda_terminal_data
from dotenv import load_dotenv
from alert_service import check_price_alerts, update_price_history

load_dotenv()  # This loads variables from .env into the environment


def execute_scheduled_functions():
    """Execute the functions you want to run on schedule."""
    try:
        print("Executing scheduled tasks...")

        # Wrap all function calls in the app context
        with app.app_context():
            # Fetch data first - this updates the price database
            fetch_daily_data()
            print("Daily data fetched successfully.")

            fetch_usda_daily_data()
            print("Daily usda data fetched successfully.")
            fetch_shipping_data()
            print("Shipping data fetched successfully.")

            # Then check for alerts based on the new data
            check_price_alerts()
            print("Price alerts checked successfully.")

        print("Scheduled tasks executed successfully.")
    except Exception as e:
        print(f"Error occurred during scheduled execution: {e}")


if __name__ == "__main__":
    # Directly execute the tasks when the script is run
    execute_scheduled_functions()
