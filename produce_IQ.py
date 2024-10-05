import requests
import json
import pandas as pd
from datetime import timedelta
import logging
from app import app  # Import the app to get its context

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Function to fetch daily data from ProduceIQ API
def fetch_daily_data(start_dt_term_mkt):
    with app.app_context():  # This ensures the function runs within Flask's application context
        from app import db, PriceData  # Import db and PriceData here inside the context
        
        base_url = 'https://api.produceiq.com/index/v2/trends/'
        headers = {'Api-Subscription-Key': '5aa11f87fed04300b05addd031c56ffa'}

        logging.info('Pulling commodity data (id, code, name, custom name)...')
        commodities_url = f'{base_url}all-commodities'
        commodities_response = requests.get(commodities_url, headers=headers, verify=True)

        if commodities_response.status_code == 200:
            commodities_lst = commodities_response.json()
            logging.info('Commodities retrieved successfully!')
        else:
            logging.error(f'Failed to fetch commodities. Status code: {commodities_response.status_code}')
            return

        # Pulling terminal market price data
        prc_type = 'terminal_market_price'
        start_dt, end_dt, url = start_dt_term_mkt, pd.Timestamp.today(), f'{base_url}terminal-market-trends'
        
        logging.info(f'Pulling {prc_type} data for commodity id: 18 (PEPPERS, OTHER)...')
        logging.info(f'Starting date for this API call is {start_dt}.')

        responses = {}
        params = {
            'commodityId': 18,  # Adjust this for different commodities
            'from': start_dt.strftime('%Y-%m-%d'),
            'to': end_dt.strftime('%Y-%m-%d')
        }

        # Fetch data for each day
        response = requests.get(url, headers=headers, params=params, verify=True)
        if response.status_code == 200:
            responses[(start_dt, end_dt)] = response
            logging.info(f"Fetched data for {start_dt} to {end_dt}")
        else:
            logging.error(f"Failed to fetch data for {start_dt} to {end_dt}. Status code: {response.status_code}")
            return

        # Process and save the data
        for (start, end), response in responses.items():
            data = response.json().get('subset', [])
            if not data:
                logging.error(f"No 'data' key found in the response for {start} to {end}. Full response: {response.json()}")
                continue

            for item in data:
                city_name = item.get('terminalMarketCityName')
                commodity = item.get('commodityName')
                year = item.get('isoYear')
                day_of_year = item.get('day')
                price = item.get('price')
                source = 'ProduceIQ'

                # Calculate the season based on the month
                month = pd.Timestamp(year=year, day=1, month=1).day_of_year // 30 + 1
                if month in [3, 4, 5]:
                    season = 'Spring'
                elif month in [6, 7, 8]:
                    season = 'Summer'
                elif month in [9, 10, 11]:
                    season = 'Autumn'
                else:
                    season = 'Winter'

                # Save to the database
                price_data = PriceData(
                    city_name=city_name,
                    commodity=commodity,
                    year=year,
                    day=day_of_year,
                    price=price,
                    source=source,
                    season=season
                )

                db.session.add(price_data)

        db.session.commit()
        logging.info(f'Data saved to the database.')
