
# def fetch_shipping_point_data():
#     base_url = "https://api.produceiq.com/index/v2/trends/shipping-point-trends"
#     headers = {"Api-Subscription-Key": "5aa11f87fed04300b05addd031c56ffa"}

#     # Define the specific commodities to filter by
#     wanted_commodities = [
#         "Anaheim", "Cubanelles", "Fresno", "Habanero", "Hungarian Wax",
#         "Jalapeno", "Long Hot", "Poblano", "Serrano", "Shishito",
#     ]
#     wanted_commodities = [commodity.lower() for commodity in wanted_commodities]

#     standardized_name = {
#         "anaheim": "Anaheim", "cubanelles": "Cubanelles", "fresno": "Fresno",
#         "habanero": "Habanero", "hungarian wax": "Hungarian Wax",
#         "jalapeno": "Jalapeno", "long hot": "Long Hot",
#         "poblano": "Poblano", "serrano": "Serrano", "shishito": "Shishito",
#     }

#     # Define date range
#     start_date = pd.Timestamp("2020-01-01")  # Adjust as needed
#     end_date = pd.Timestamp.today()

#     current_date = start_date

#     while current_date <= end_date:
#         params = {
#             "from": current_date.strftime("%Y-%m-%d"),
#             "to": current_date.strftime("%Y-%m-%d"),
#         }
#         logging.info(f"Fetching data for {params['from']}...")

#         response = requests.get(base_url, headers=headers, params=params, verify=False)

#         if response.status_code == 200:
#             data = response.json().get("subset", [])
#             logging.info(f"Fetched {len(data)} records for {params['from']}.")

#             # Filter and process data
#             for item in data:
#                 # Safely handle varietyName
#                 variety_name = item.get("varietyName", "")
#                 if variety_name:
#                     variety_name = variety_name.strip().lower()
#                 else:
#                     variety_name = ""

#                 # Skip entries without a valid variety name
#                 if not variety_name:
#                     logging.warning(f"Skipping entry with missing varietyName: {item}")
#                     continue

#                 # Compare in standardized format
#                 if variety_name in wanted_commodities:
#                     variety_name = standardized_name[variety_name]

#                     shipping_price_data = ShippingPriceData(
#                         region_name=item.get("regionName"),
#                         commodity=variety_name,
#                         year=item.get("isoYear"),
#                         day=item.get("day"),
#                         price=item.get("price"),
#                         source="ProduceIQ",
#                         season=determine_season(item.get("isoYear"), item.get("month")),
#                     )
#                     db.session.add(shipping_price_data)

  


#             # Commit data to the database
#             db.session.commit()
#         else:
#             logging.error(
#                 f"Failed to fetch data for {params['from']}. Status code: {response.status_code}"
#             )

#         # Move to the next day
#         current_date += pd.Timedelta(days=1)  # Iterate day-by-day

#     logging.info("Data fetching completed and stored in the database.")

# def determine_season(year, month):
#     """Calculate season based on the month."""
#     if month in [3, 4, 5]:
#         return "Spring"
#     elif month in [6, 7, 8]:
#         return "Summer"
#     elif month in [9, 10, 11]:
#         return "Autumn"
#     else:
#         return "Winter"

# if __name__ == "__main__":
#     with app.app_context():  # Wrap all operations in the app context
#         fetch_shipping_point_data()
