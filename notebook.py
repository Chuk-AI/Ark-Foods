import os
import re
import requests
import pandas as pd
from datetime import datetime, timedelta
from logging import getLogger
from sqlalchemy import create_engine

# Logger for debugging
logger = getLogger(__name__)

# Configuration
API_BASE_URL = 'https://api.produceiq.com/index/v2/trends/'
API_KEY = '5aa11f87fed04300b05addd031c56ffa'  # Replace with your actual API key
HEADERS = {'Api-Subscription-Key': API_KEY}
COMMODITY_ID = 18  # PEPPERS
MASTER_FILE_PREFIXES = {
    'terminal_market': 'terminal market price - master updated - ',
    'shipping_point': 'shipping point price - master updated - '
}
DB_ENGINE = create_engine('sqlite:///market_data.db')  # SQLite database for storing data

# Step 1: Helper Functions
def get_most_recent_file(prefix: str) -> str:
    """
    Finds the most recent file matching the given prefix.
    """
    files = [f for f in os.listdir(os.getcwd()) if f.startswith(prefix)]
    dt_pattern = re.compile(r'(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})')
    file_dates = [
        (f, datetime.strptime(dt_pattern.search(f).group(1), '%Y-%m-%d_%H-%M-%S'))
        for f in files if dt_pattern.search(f)
    ]

    if not file_dates:
        raise FileNotFoundError(f"No files found with prefix '{prefix}'")

    latest_file = max(file_dates, key=lambda x: x[1])[0]
    logger.info(f"Found most recent file: {latest_file}")
    return latest_file

def get_best_start_dates() -> dict:
    """
    Determines the best start date for terminal market and shipping point data.
    """
    term_file = get_most_recent_file(MASTER_FILE_PREFIXES['terminal_market'])
    ship_file = get_most_recent_file(MASTER_FILE_PREFIXES['shipping_point'])

    term_df = pd.read_excel(term_file)
    ship_df = pd.read_excel(ship_file)

    term_start = term_df.groupby('varietyName')['date'].max().min() + pd.Timedelta(days=1)
    ship_start = ship_df.groupby('varietyName')['date'].max().min() + pd.Timedelta(days=1)

    return {
        'terminal_market': term_start,
        'shipping_point': ship_start
    }

# Step 2: API Fetching
def fetch_commodity_data(start_date: pd.Timestamp, end_date: pd.Timestamp, url: str) -> list:
    """
    Fetches data for a given commodity in monthly intervals and saves to database.
    """
    monthly_intervals = []
    curr_start = start_date

    while curr_start < end_date:
        curr_end = (curr_start + pd.offsets.MonthEnd(0)).normalize()
        if curr_end > end_date:
            curr_end = end_date
        monthly_intervals.append((curr_start, curr_end))
        curr_start = curr_end + timedelta(days=1)

    responses = []
    for (start, end) in monthly_intervals:
        params = {
            'commodityId': COMMODITY_ID,
            'from': start.strftime('%Y-%m-%d'),
            'to': end.strftime('%Y-%m-%d')
        }
        response = requests.get(url, headers=HEADERS, params=params, verify=False)
        if response.status_code == 200:
            data = response.json().get('subset', [])
            if data:
                df = pd.DataFrame(data)
                df.to_sql('commodity_data', con=DB_ENGINE, if_exists='append', index=False)
            responses.append((start, end, data))
        else:
            logger.warning(f"Failed to fetch data for {start} - {end}: {response.status_code}")

    return responses

def fetch_data_from_api(start_dates: dict) -> dict:
    """
    Fetches data for terminal market and shipping point trends.
    """
    raw_data = {}
    end_date = pd.Timestamp.today()

    for key, start_date in start_dates.items():
        url = f"{API_BASE_URL}{'shipping-point-trends' if key == 'shipping_point' else 'terminal-market-trends'}"
        logger.info(f"Fetching {key} data from {start_date} to {end_date}")
        raw_data[key] = fetch_commodity_data(start_date, end_date, url)

    return raw_data



# Main Execution
if __name__ == "__main__":
    try:
        # Determine best start dates
        start_dates = get_best_start_dates()

        # Fetch data from API and save to database
        raw_data = fetch_data_from_api(start_dates)

        # Optionally save data to CSV

        logger.info("Data fetching and saving completed successfully.")
    except Exception as e:
        logger.error(f"An error occurred: {str(e)}")
