import os
import csv
from app import app, db, PriceData
from datetime import datetime

# Assuming the CSV files are in a directory named 'data'
data_dir = 'data/'

# Function to determine the season based on the day of the year
def determine_season(day_of_year):
    if 80 <= day_of_year < 172:
        return 'Spring'
    elif 172 <= day_of_year < 264:
        return 'Summer'
    elif 264 <= day_of_year < 355:
        return 'Autumn'
    else:
        return 'Winter'

# Function to import data from a CSV
def import_csv_to_db(file_path, commodity_name, source='Historical'):
    skipped_rows = 0  # Track how many rows are skipped
    total_rows = 0  # Track the total number of rows processed
    
    with open(file_path, newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            total_rows += 1
            
            # Clean and check the 'Price' field
            price_str = row['Price'].strip()  # Remove any leading or trailing whitespace
            if not price_str or price_str == '':  # If 'Price' is empty or null
                skipped_rows += 1
                continue  # Skip this row
            
            try:
                price = float(price_str)  # Attempt to convert 'Price' to a float
            except ValueError:
                skipped_rows += 1
                continue  # Skip if 'Price' cannot be converted to float
            
            # Determine the season based on the day of the year
            day_of_year = int(row['Day'])
            season = determine_season(day_of_year)
            
            # Add valid data to the database
            price_data = PriceData(
                city_name=row['CityName'],
                commodity=commodity_name,
                year=int(row['Year']),
                day=day_of_year,
                price=price,
                source=source,  # Set the source to 'Historical'
                season=season  # Set the calculated season
            )
            db.session.add(price_data)
        
        db.session.commit()
    
    # Summary of how many rows were processed and skipped
    print(f"File '{file_path}': {total_rows - skipped_rows}/{total_rows} rows successfully processed, {skipped_rows} rows skipped due to invalid 'Price' values.")

# Wrap the data import logic inside the application context
with app.app_context():
    # Clear all existing data in PriceData
    db.session.query(PriceData).delete()
    db.session.commit()
    print("All existing data in PriceData has been cleared.")
    
    for filename in os.listdir(data_dir):
        if filename.endswith('.csv'):
            commodity_name = filename.replace('_', ' ').replace('.csv', '')
            file_path = os.path.join(data_dir, filename)
            # Import historical data
            import_csv_to_db(file_path, commodity_name, 'Historical')

    print('Data import complete.')
