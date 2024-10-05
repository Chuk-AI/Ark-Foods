import requests
import pandas as pd

# Function to fetch USDA data and save to a CSV file
def fetch_usda_data(api_key, query_url, file_name):
    # Prepare the authorization header with the API key (no encoding needed for some APIs)
    headers = {
        'Authorization': f"Bearer {api_key}",  # Assuming Bearer token, based on common API practices
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Connection': 'keep-alive'
    }

    print(f"Making request to {query_url} with API Key: {api_key[:5]}...")

    # Make a request to the USDA API
    response = requests.get(query_url, headers=headers)
    print(f"Response Code: {response.status_code}")
    if response.status_code == 200:
        json_data = response.json()
        if json_data.get('results') and isinstance(json_data['results'], list):
            results = json_data['results']
        else:
            print(f"No data found in the response. Full response: {json_data}")
            return
    else:
        print(f"Error fetching data: {response.status_code} - {response.text}")
        return

    # Process the results if data is found
    if results:
        # Prepare data for saving to CSV
        data = []
        for report in results:
            report_date = report.get('report_date', '')
            year = pd.Timestamp(report_date).year if report_date else ''
            day_of_year = pd.Timestamp(report_date).timetuple().tm_yday if report_date else ''

            row = [
                report.get('commodity', ''),  # Commodity Name
                report.get('location', ''),   # City Name
                year,
                day_of_year,
                report.get('low_price', ''),  # Price (using low price)
                report_date                   # Date
            ]
            data.append(row)

        # Convert to a DataFrame
        df = pd.DataFrame(data, columns=['Commodity Name', 'City Name', 'Year', 'Day of Year', 'Price', 'Date'])

        # Save to CSV
        df.to_csv(file_name, index=False)
        print(f"Data saved to {file_name}")
    else:
        print(f"No data found in the response.")

# Example usage:

# Your USDA API key
usda_api_key = 'your_usda_api_key_here'

# Terminal prices URL (last 2 reports)
terminal_url = 'https://marsapi.ams.usda.gov/services/v1.2/marketTypes/sc-cr/sc/terminal/daily?q=commodity=%22Peppers%2C+Fresno%22,%22Peppers%2C+Habanero%22,%22Peppers%2C+Hungarian+Wax%22,%22Peppers%2C+Jalapeno%22,%22Peppers%2C+Long+Hot%22,%22Peppers%2C+Shishito%22&lastReports=2'

# File name for saving the data
terminal_file_name = 'usda_terminal_prices.csv'

# Fetch and save terminal prices (last 2 reports)
fetch_usda_data(api_key=usda_api_key, query_url=terminal_url, file_name=terminal_file_name)
