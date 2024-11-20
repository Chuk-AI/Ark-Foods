from app import (
    fetch_usda_daily_data,
    fetch_daily_data,
    app,
)  # Import your Flask app


def daily_schedule():

    fetch_daily_data()
    fetch_usda_daily_data()


if __name__ == "__main__":
    daily_schedule()
