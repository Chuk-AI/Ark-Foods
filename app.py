from flask import (
    Flask,
    render_template,
    redirect,
    url_for,
    flash,
    request,
    session,
    jsonify,
    send_file,
)
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import and_, or_, func, text, case, true

from flask_login import (
    LoginManager,
    UserMixin,
    login_user,
    login_required,
    logout_user,
    current_user,
)
from werkzeug.security import generate_password_hash, check_password_hash
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, SelectField
from wtforms.validators import InputRequired, Email, Length, EqualTo
from flask_bootstrap import Bootstrap
from datetime import timedelta, datetime
from flask_cors import CORS
import pytz
from pytz import timezone
import pandas as pd
from dateutil import parser
import gc  # garbage collection
import io
import xlsxwriter

# Flask-Admin Setup
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView

# For Scheduling
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
import aiohttp
import asyncio
import os
import logging
import requests
import base64
import csv
from werkzeug.utils import secure_filename
import json
from dateutil.relativedelta import relativedelta


# Imports for Weather Forecasting
import time
import numpy as np
import copy
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
import logging

# IBM Environmental Intelligence Suite (EIS) related imports
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
import ibmpairs.query as query
from ibmpairs.client import get_client
import logging
from functools import wraps
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from sqlalchemy.exc import SQLAlchemyError
from flask import send_from_directory
from notebook import get_best_start_dates, fetch_data_from_api
from fetch_shipping_point_data import fetch_shipping_point_data  # Replace with the correct module name
from flask_caching import Cache
import hashlib
from flask import request, make_response




# Configuration for Logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)


CSV_DIRECTORY = "data/"

# Initialize Flask app
app = Flask(__name__, static_folder= 'frontend/build', static_url_path="/")
app.config['JWT_SECRET_KEY'] = 'your_secret_key'  # Replace with a strong secret key
jwt = JWTManager(app)


@app.route("/api/normalize_price_data")
def normalize_price_data():
    try:
        records = PriceData.query.all()
        updated = 0

        for record in records:
            original_city = record.city_name
            original_commodity = record.commodity

            normalized_city = original_city.strip().lower().title()
            normalized_commodity = original_commodity.strip().lower().title()

            if original_city != normalized_city or original_commodity != normalized_commodity:
                record.city_name = normalized_city
                record.commodity = normalized_commodity
                updated += 1

        db.session.commit()
        return jsonify({"status": "success", "updated_records": updated})

    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500




@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, "index.html")


# Configure Flask-Caching to use Redis
app.config['CACHE_TYPE'] = 'redis'
app.config['CACHE_REDIS_URL'] = 'redis://localhost:6379/0'  # Adjust if needed
# app.config['CACHE_REDIS_URL'] = os.environ.get("REDIS_URL", "redis://<MEMORISTORE_IP>:6379/0")

cache = Cache(app)



# Redis implementation for the caching of data coming from the db
def generate_cache_key():
    # Use the full path (which includes query parameters)
    key = request.full_path  # e.g., "/api/sales_dashboard?commodity=Jalapeno&source=USDA"
    # Optionally, you can hash it to ensure it's a consistent format
    return hashlib.md5(key.encode('utf-8')).hexdigest()


@app.before_request
def serve_from_cache():
    if request.method == 'GET':
        cache_key = generate_cache_key()
        cached_response = cache.get(cache_key)
        if cached_response:
            app.logger.info(f"Cache hit for key: {cache_key}")
            response = make_response(cached_response)
            response.headers["Content-Type"] = "application/json"
            return response
        else:
            app.logger.info(f"Cache miss for key: {cache_key}")

@app.after_request
def cache_response(response):
    if request.method == 'GET' and response.status_code == 200:
        cache_key = generate_cache_key()
        # time out 
        ttl = 86400  # Set TTL to 1 day (24 hours)
        # For more dynamic TTL, you can calculate it based on some parameters
        # e.g., setting a shorter TTL for endpoints that change often
        if 'historical_data' in request.full_path:
            ttl = 3600  # Shorter TTL of 1 hour for historical data
 

        cache.set(cache_key, response.get_data(), timeout=ttl)
        app.logger.info(f"Cached response for key: {cache_key}")
    return response




CORS(
    app,
    supports_credentials=True,
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:3000",  # Local frontend (for development)
                "https://arkfoods.klicksai.com"  # Replace with your new production domain or public IP
            ]
        }
    },
)



@jwt.unauthorized_loader
def custom_unauthorized_response(err):
    return jsonify({"error": "Unauthorized. Please log in."}), 401

load_dotenv()

# setting up env variable for IBM API keys
# EIS_API_KEY = os.getenv("EIS_API_KEY")
# EIS_TENANT_ID = os.getenv("EIS_TENANT_ID")
# EIS_ORG_ID = os.getenv("EIS_ORG_ID")
# if not all([EIS_API_KEY, EIS_TENANT_ID, EIS_ORG_ID]):
#     logging.error(
#         "One or more IBM credentials are missing in the environment variables."
#     )
# print(f"API Key: {os.getenv('EIS_API_KEY')}")
# print(f"Tenant ID: {os.getenv('EIS_TENANT_ID')}")
# print(f"Endpoint: https://api.ibm.com/geospatial/run/na/core/v3/query")


# Enable CORS
CORS(app, supports_credentials=True, origins=["http://localhost:3000", "http://127.0.0.1"])


# Set the secret key for session handling


# app.config["SECRET_KEY"] = "your_secret_key_here"

app.config['JWT_BLACKLIST_ENABLED'] = True
app.config['JWT_BLACKLIST_TOKEN_CHECKS'] = ['access']
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)


blacklist = set()

@jwt.token_in_blocklist_loader
def check_if_token_in_blacklist(jwt_header, jwt_payload):
    return jwt_payload['jti'] in blacklist
# Set session cookie options
# app.config["SESSION_COOKIE_HTTPONLY"] = True  # Prevent access to cookies via JS
# app.config["SESSION_COOKIE_SAMESITE"] = "Lax"  # Adjust SameSite based on needs
# app.config["SESSION_COOKIE_SECURE"] = False   # Set to True in production with HTTPS


# Check if DATABASE_URL is present for Heroku's PostgreSQL, otherwise use SQLite for local development
DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL:
    # Replace the "postgres://" scheme with "postgresql://" for compatibility with SQLAlchemy
    app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL.replace(
        "postgres://", "postgresql://", 1
    )
else:
    # Use SQLite for local development
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(
        app.instance_path, "users.db"
    )

# Configure other Flask settings
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(
    days=1
)  # Session timeout after 1 day
# for uploading data
UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"csv"}
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# Initialize extensions
db = SQLAlchemy(app)




# Initialize LoginManager for handling user sessions
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "login"

# Initialize Bootstrap for front-end styling
Bootstrap(app)


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Data Base Models
class User(UserMixin, db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(256), nullable=False)
    role = db.Column(
        db.String(50), nullable=False
    )  # Role can be 'admin', 'sales', 'owner'
    approved = db.Column(
        db.Boolean, default=False
    )  # User needs to be approved to log in

    def is_admin(self):
        return self.role == "admin"

    def is_owner(self):
        return self.role == "owner"


class PriceData(db.Model):
    __tablename__ = 'price_data'  # Match the actual table name in the database

    id = db.Column(db.Integer, primary_key=True)
    city_name = db.Column(db.String(100), nullable=False)
    commodity = db.Column(db.String(100), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    day = db.Column(db.Integer, nullable=False)  # Day of the year
    price = db.Column(db.Float, nullable=False)
    source = db.Column(db.String(50), nullable=False)
    season = db.Column(db.String(20), nullable=False)

class ShippingPriceData(db.Model):

    id = db.Column(db.Integer, primary_key=True)
    commodity = db.Column(db.String, nullable=False)
    region_name = db.Column(db.String, nullable=False)
    year = db.Column(db.Integer, nullable=False)
    day = db.Column(db.Integer, nullable=False)
    source = db.Column(db.String, nullable=False)
    price = db.Column(db.Float)
    season = db.Column(db.String, nullable=True)  

    


class UShippingPriceData(db.Model):
    __tablename__ = 'usda_shipping_price_data'

    id = db.Column(db.Integer, primary_key=True)
    city_name = db.Column(db.String(100), nullable=False)
    commodity = db.Column(db.String(100), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)
    source = db.Column(db.String(50), nullable=False, default="USDA")
    season = db.Column(db.String(20), nullable=False)


class WeatherForecast(db.Model):
    __tablename__ = "weather_forecast"
    id = db.Column(db.Integer, primary_key=True)
    city_name = db.Column(db.String(100), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    forecast_date = db.Column(db.Date, nullable=False)  # Date of forecast
    variable = db.Column(db.String(10), nullable=False)  # PRECIP, TMIN, TMAX, TAVG
    forecasted_value = db.Column(
        db.Float, nullable=False
    )  # Forecasted value (e.g., temp or precipitation)
    ensemble_member = db.Column(db.Integer, nullable=False)  # Ensemble member
    source = db.Column(db.String(50), nullable=False)  # Source of the data, e.g., 'IBM'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class ClimatologyData(db.Model):
    __tablename__ = "climatology_data"
    id = db.Column(db.Integer, primary_key=True)
    city_name = db.Column(db.String(255), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    forecast_date = db.Column(db.Date, nullable=False)  # Forecast date
    variable = db.Column(db.String(10), nullable=False)  # e.g., PRECIP, TAVG
    climatology_value = db.Column(db.Float, nullable=False)
    source = db.Column(db.String(50), nullable=False)  # Data source (e.g., ERA5)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# USDA DATA IMPORT SETTINGS HERE!
INTERESTED_CITIES = [
    "BALTIMORE",
    "BOSTON",
    "CHICAGO",
    "COLUMBIA",
    "MIAMI",
    "NEW YORK",
    "PHILADELPHIA",
    "LOS ANGELES",
]

INTERESTED_COMMODITIES = [
    "Fresno",
    "Habanero",
    "Hungarian Wax",
    "Jalapeno",
    "Long Hot",
    "Shishito",
    "Anaheim",
    "Cubanelles",
    "Poblano",
    "Serrano",
]

INTERESTED_COMMODITIES_USDA = [
    "Fresno",
    "Habanero",
    "Hungarian Wax",
    "Jalapeno",
    "Long Hot",
    "Shishito",
    "Anaheim",
    "Cubanelle",
    "Poblano",
    "Serrano",
]



@app.route('/api/fetch-data', methods=['GET'])
def fetch_data():
    try:
        start_dates = get_best_start_dates()
        raw_data = fetch_data_from_api(start_dates)
        return jsonify(raw_data)  # Convert raw data to JSON response
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Function to fetch daily USDA data
def get_last_fetched_usda_date():
    # Step 1: Find the maximum year
    max_year = (
        db.session.query(func.max(PriceData.year))
        .filter(PriceData.source.in_(["USDA", "Historical"]))
        .scalar()
    )

    if max_year is not None:
        # Step 2: Find the maximum day within the maximum year
        max_day = (
            db.session.query(func.max(PriceData.day))
            .filter(
                PriceData.year == max_year, PriceData.source.in_(["USDA", "Historical"])
            )
            .scalar()
        )

        # Validate the day
        if max_day is not None:
            try:
                # Ensure that the day is valid for the year
                # For leap years, we can have a day value of 366
                date_check = datetime.strptime(f"{max_year}-{max_day}", "%Y-%j")
                last_fetched_date = pd.Timestamp(date_check)
                logging.info(
                    f"Last fetched USDA date: {last_fetched_date} (year: {max_year}, day: {max_day})"
                )
                return last_fetched_date
            except ValueError:
                logging.error(
                    f"Invalid date found: year={max_year}, day={max_day}. Falling back to default date."
                )
        else:
            logging.warning(
                f"No valid day found for year {max_year}. Using fallback date 2020-01-01."
            )
    else:
        logging.warning(
            "No valid USDA or Historical data found. Using fallback date 2020-01-01."
        )

    # If no valid date was found, return a default fallback date
    last_fetched_date = pd.Timestamp("2018-01-01")
    logging.info(f"Final fetched USDA date: {last_fetched_date}")
    return last_fetched_date


# Function to fetch USDA data for multiple days from the last fetched date
def fetch_usda_daily_data():
    with app.app_context():
        logging.info("USDA data fetch job triggered")
        base_endpoint = "https://marsapi.ams.usda.gov/services/v1.2/marketTypes/1030/cr?dsId=/1/1/&q=report_date="

        # Get the last fetched date
        start_dt = get_last_fetched_usda_date()
        logging.info(f"Last fetched USDA date: {start_dt}")
        end_dt = pd.Timestamp.today()

        # Prepare the authorization header
        api_key = "7XWk8PBs9+O3lWfreM+DtrsaM3OCkzOx"
        encoded_api_key = base64.b64encode(f"{api_key}:".encode()).decode()
        headers = {
            "Authorization": f"Basic {encoded_api_key}",
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json",
        }

        current_dt = start_dt
        while current_dt <= end_dt:
            current_date_formatted = current_dt.strftime("%m/%d/%Y")
            logging.info(f"Fetching USDA data for {current_date_formatted}")

            # Check if data for the current date already exists in the database
            existing_record = (
                db.session.query(PriceData)
                .filter(
                    PriceData.year == current_dt.year,
                    PriceData.day == current_dt.timetuple().tm_yday,
                    PriceData.source == "USDA",
                )
                .first()
            )

            if existing_record:
                logging.info(
                    f"Data for {current_date_formatted} already exists. Skipping."
                )
            else:
                endpoint = base_endpoint + current_date_formatted
                response = requests.get(endpoint, headers=headers)

                logging.info(f"API Response Status Code: {response.status_code}")

                if response.status_code == 200:
                    json_data = response.json()
                    if json_data.get("results") and isinstance(
                        json_data["results"], list
                    ):
                        logging.info(f"Valid data found for {current_date_formatted}")
                        process_usda_data(json_data["results"])
                    else:
                        logging.warning(
                            f"No valid results found in the API response for {current_date_formatted}"
                        )
                else:
                    logging.error(
                        f"Error fetching USDA data for {current_date_formatted}: {response.status_code} - {response.text}"
                    )
            current_dt += timedelta(days=1)
            json_data = None
            gc.collect()




# Process and store USDA data in the database, filtered by interested commodities and cities
def process_usda_data(data):
    for report in data:
        commodity_name = report.get("commodity", "")
        # Remove 'Peppers, ' prefix before comparing
        if commodity_name.startswith("Peppers, "):
            commodity_name = commodity_name.replace("Peppers, ", "").strip()

        # Filter out only the commodities of interest
        if commodity_name in INTERESTED_COMMODITIES_USDA:
            report_date = report.get("report_date", "")
            year = (
                datetime.strptime(report_date, "%m/%d/%Y").year if report_date else ""
            )
            day_of_year = (
                datetime.strptime(report_date, "%m/%d/%Y").timetuple().tm_yday
                if report_date
                else ""
            )

            # Check if price is missing, skip the entry if it is
            price = report.get("low_price")
            if price is None:
                logging.warning(
                    f"Skipping entry due to missing price for {commodity_name} on {report_date} in {report.get('location', '')}"
                )
                continue  # Skip this entry if price is missing

            # Extract the city name before the comma, convert to uppercase
            city_name_full = report.get("location", "")
            city_name = city_name_full.split(",")[
                0
            ].upper()  # Get part before comma and convert to uppercase

            # Check if the extracted city is in the list of interested cities
            if city_name not in INTERESTED_CITIES:
                logging.warning(
                    f"Skipping entry for city {city_name_full} as it is not in the list of interested cities"
                )
                continue  # Skip cities that are not in the interested list

            # Prepare the price_data entry
            price_data = PriceData(
                city_name=city_name,  # Now contains only the city name in uppercase
                commodity=commodity_name,  # Now contains only the commodity name without prefix
                year=year,
                day=day_of_year,
                price=price,  # Only insert if the price is valid
                source="USDA",
                season=determine_season(report_date),
            )

            db.session.add(price_data)

    db.session.commit()
    logging.info(f"USDA data saved for valid entries")


# Determine season based on month
def determine_season(report_date):
    try:
        # Handle date format like '10/02/2024' (USDA reports)
        month = datetime.strptime(report_date, "%m/%d/%Y").month
    except ValueError:
        # Handle format like '2024-10-02' if other data sources use this
        month = datetime.strptime(report_date, "%Y-%m-%d").month

    if month in [3, 4, 5]:
        return "Spring"
    elif month in [6, 7, 8]:
        return "Summer"
    elif month in [9, 10, 11]:
        return "Autumn"
    else:
        return "Winter"


def determine_season_for_dashboard(forecast_date):
    # forecast_date is expected to be in the format '%Y-%m-%d'
    month = forecast_date.month

    if month in [3, 4, 5]:
        return "Spring"
    elif month in [6, 7, 8]:
        return "Summer"
    elif month in [9, 10, 11]:
        return "Autumn"
    else:
        return "Winter"


def determine_season_from_year_day(year, day_of_year):
    """
    This function converts a given year and day-of-year into a valid date and determines the season.
    """
    try:
        # Convert the year and day of the year to a valid date
        date_from_day = datetime.strptime(f"{year}-{day_of_year}", "%Y-%j")
        month = date_from_day.month

        # Determine the season based on the month
        if month in [3, 4, 5]:
            return "Spring"
        elif month in [6, 7, 8]:
            return "Summer"
        elif month in [9, 10, 11]:
            return "Autumn"
        else:
            return "Winter"

    except ValueError:
        # If there is an error, return a default season or handle accordingly
        return "Unknown"


# PRODUCE IQ DATA FETCHING IS HERE!!
# This is for pricedata
# Function to fetch the last fetched date
def get_last_fetched_date():
    # Step 1: Find the maximum year
    max_year = (
        db.session.query(func.max(PriceData.year))
        .filter(PriceData.source.in_(["ProduceIQ", "Historical"]))
        .scalar()
    )

    if max_year is not None:
        # Step 2: Find the maximum day within the maximum year
        max_day = (
            db.session.query(func.max(PriceData.day))
            .filter(
                PriceData.year == max_year,
                PriceData.source.in_(["ProduceIQ", "Historical"]),
            )
            .scalar()
        )

        # Validate the day
        if max_day is not None:
            try:
                # Ensure that the day is valid for the year
                # For leap years, we can have a day value of 366
                date_check = datetime.strptime(f"{max_year}-{max_day}", "%Y-%j")
                last_fetched_date = pd.Timestamp(date_check)
                logging.info(
                    f"Last fetched ProduceIQ date: {last_fetched_date} (year: {max_year}, day: {max_day})"
                )
                return last_fetched_date
            except ValueError:
                logging.error(
                    f"Invalid date found: year={max_year}, day={max_day}. Falling back to default date."
                )
        else:
            logging.warning(
                f"No valid day found for year {max_year}. Using fallback date 2020-01-01."
            )
    else:
        logging.warning(
            "No valid ProduceIQ or Historical data found. Using fallback date 2020-01-01."
        )

    # If no valid date was found, return a default fallback date
    last_fetched_date = pd.Timestamp("2018-01-01")
    logging.info(f"Final fetched ProduceIQ date: {last_fetched_date}")
    return last_fetched_date


# Fetching data from Produce IQ
def fetch_daily_data():
    with app.app_context():
        base_url = "https://api.produceiq.com/index/v2/trends/"
        headers = {"Api-Subscription-Key": "5aa11f87fed04300b05addd031c56ffa"}

        # Define the 10 specific commodities to filter by
        wanted_commodities = [
            "Anaheim",
            "Cubanelles",
            "Fresno",
            "Habanero",
            "Hungarian Wax",
            "Jalapeno",
            "Long Hot",
            "Poblano",
            "Serrano",
            "Shishito",
        ]

        # Standardize the list to lowercase for comparison
        wanted_commodities = [commodity.lower() for commodity in wanted_commodities]

        # Mapping standardized names back to desired format
        standardized_name = {
            "anaheim": "Anaheim",
            "cubanelles": "Cubanelles",
            "fresno": "Fresno",
            "habanero": "Habanero",
            "hungarian wax": "Hungarian Wax",
            "jalapeno": "Jalapeno",
            "long hot": "Long Hot",
            "poblano": "Poblano",
            "serrano": "Serrano",
            "shishito": "Shishito",
        }

        # Get the last fetched date
        start_dt = get_last_fetched_date()
        end_dt = pd.Timestamp.today()  # Fetch data up to today

        # Loop through each day one by one from the last fetched date to today
        current_dt = start_dt
        while current_dt <= end_dt:
            # Check if data for the current date already exists in the database
            existing_data = (
                db.session.query(PriceData)
                .filter(
                    PriceData.year == current_dt.year,
                    PriceData.day == current_dt.day_of_year,
                    PriceData.source == "ProduceIQ",
                )
                .first()
            )

            if existing_data:
                logging.info(
                    f"Data for {current_dt.strftime('%Y-%m-%d')} already exists. Skipping."
                )
                current_dt += pd.Timedelta(days=1)
                continue

            params = {
                "commodityId": 18,  # Adjust this for different commodities
                "from": current_dt.strftime("%Y-%m-%d"),
                "to": current_dt.strftime(
                    "%Y-%m-%d"
                ),  # Fetch data for one day at a time
            }

            # Fetch data for the current day
            response = requests.get(
                f"{base_url}terminal-market-trends",
                headers=headers,
                params=params,
                verify=False,
            )

            # Log the full response for debugging
            logging.info(f"API Response for {current_dt.strftime('%Y-%m-%d')}")

            if response.status_code == 200:
                data = response.json().get("subset", [])
                logging.info(f"Fetched data for {current_dt.strftime('%Y-%m-%d')}")
            else:
                logging.error(
                    f"Failed to fetch data for {current_dt.strftime('%Y-%m-%d')}. Status code: {response.status_code}"
                )
                logging.error(
                    f"API Error Response: {response.text}"
                )  # Log the error response
                # Move to the next day even if this request fails
                current_dt += pd.Timedelta(days=1)
                continue

            # Process and save the data
            if not data:
                logging.error(
                    f"No data found in the response for {current_dt.strftime('%Y-%m-%d')}."
                )
                # Move to the next day even if no data is found
                current_dt += pd.Timedelta(days=1)
                continue

            for item in data:
                # Standardize variety name from the API
                variety_name = item.get("varietyName", "").strip().lower()

                # Compare in standardized format
                if variety_name in wanted_commodities:
                    # Map back to the desired format
                    variety_name = standardized_name.get(variety_name, variety_name)

                    city_name = item.get("terminalMarketCityName", "").strip().lower().title()
                    year = item.get("isoYear")
                    day_of_year = item.get("day")
                    price = item.get("price")
                    source = "ProduceIQ"


                    # Calculate the season based on the month
                    month = (
                        pd.Timestamp(year=year, day=1, month=1).day_of_year // 30 + 1
                    )
                    if month in [3, 4, 5]:
                        season = "Spring"
                    elif month in [6, 7, 8]:
                        season = "Summer"
                    elif month in [9, 10, 11]:
                        season = "Autumn"
                    else:
                        season = "Winter"

                    # Save to the database
                    price_data = PriceData(
                        city_name=city_name,
                        commodity=variety_name,
                        year=year,
                        day=day_of_year,
                        price=price,
                        source=source,
                        season=season,
                    )

                    db.session.add(price_data)
                    logging.info(
                        f"Added {variety_name} for {current_dt.strftime('%Y-%m-%d')} in {city_name}"
                    )

            # Commit the data for the current day
            db.session.commit()
            gc.collect()
            logging.info(
                f'Data for {current_dt.strftime("%Y-%m-%d")} saved to the database.'
            )

            # Move to the next day
            current_dt += pd.Timedelta(days=1)
            data = None  # Release JSON data memory
            gc.collect()  # Explicit garbage collection

        logging.info(
            f"Data fetching completed from {start_dt.strftime('%Y-%m-%d')} to {end_dt.strftime('%Y-%m-%d')}."
        )





import threading

def fetch_shipping_data():
    with app.app_context():  # Ensure Flask app context is active
        try:
            fetch_shipping_point_data()  # Long-running task
            print("Data fetch completed successfully.")
        except Exception as e:
            print(f"Error: {str(e)}")

@app.route('/fetch-shipping', methods=['GET'])
def fetch_shipping():
    thread = threading.Thread(target=fetch_shipping_data)
    thread.start()
    return jsonify({"status": "success", "message": "Task started in background"}), 202



@app.route("/api/test_ibm_live", methods=["GET"])
def test_ibm_live():
    # Example parameters – adjust as needed
    lat = 26.4187
    lon = -81.4173
    # Build a sample query JSON payload for a variable, e.g., TAVG
    iso_8601 = "%Y-%m-%dT%H:%M:%SZ"
    query_json = {
        "layers": [
            {
                "type": "raster",
                "id": 50685,  # ID for TAVG
                "temporal": {
                    "intervals": [
                        {
                            "start": (datetime.utcnow() - timedelta(minutes=1)).strftime(iso_8601),
                            "end": (datetime.utcnow() + timedelta(minutes=1)).strftime(iso_8601)
                        }
                    ]
                },
                "dimensions": [
                    {"name": "forecast", "value": "01"},
                    {"name": "horizon", "value": 0}
                ],
            }
        ],
        "spatial": {"type": "point", "coordinates": [lon, lat]},
        "temporal": {"intervals": [{"snapshot": "1982-01-01T00:00:00Z"}]},
        "outputType": "json"
    }

    try:
        # This sends the query live to IBM’s PAIRS API
        # # df = query.submit(query_json).point_data_as_dataframe()
        df = query.submit(query_json, client=eis_client).point_data_as_dataframe()

        # Return the data directly as JSON
        return jsonify(df.to_dict(orient="records"))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
import ibmpairs.query as query
import logging


# def fetch_and_store_weather_forecast(
#     start_forecast_date,
#     end_forecast_horizon_date,
#     start_forecast_horizon_date,
#     start_ensembles,
#     end_ensembles,
#     store_in_excel,
# ):

#     # IBM API Configuration
#     eis_client = get_client(
#         api_key="PHXfXSpwiWwQ9NoUg9IYhhaf24cXmmMwZa0zPoW23hktX8",
#         tenant_id="7370463f-df01-4aa0-b204-d6d15ff71f85",
#         org_id=EIS_ORG_ID,
#         legacy=False,
#     )

#     # Forecast parameters
#     layers_TWC = {"PRECIP": 50686, "TAVG": 50685}
#     iso_8601 = "%Y-%m-%dT%H:%M:%SZ"

#     # List of cities with their latitude and longitude
#     cities = {
#         "Immokalee Fl": {"lat": "26.4187", "lon": "-81.4173"},
#         "Palm Beach County, fl": {"lat": "26.7153", "lon": "-80.0534"},
#         "Vineland NJ": {"lat": "39.4802", "lon": "-75.0138"},
#         "Sodus, Michigan": {"lat": "42.0086", "lon": "-86.3614"},
#         "Sinaloa": {"lat": "25.1721", "lon": "-107.4795"},
#         "Sonora": {"lat": "29.2972", "lon": "-110.3309"},
#         "Ensenada": {"lat": "31.86613056", "lon": "-116.59971944"},
#         "Baja Mx": {"lat": "28.0444", "lon": "-115.2062"},
#         "Culican": {"lat": "24.8091", "lon": "-107.3940"},
#         "Hendersonville, NC": {"lat": "35.3187", "lon": "-82.4610"},
#         "Cameron SC": {"lat": "33.5568", "lon": "-80.7151"},
#         "Adel, Ga": {"lat": "31.13633333", "lon": "-83.42216389"},
#         "Lake Park Ga": {"lat": "30.6844", "lon": "-83.1849"},
#         "Bowling Green Fl": {"lat": "27.6386", "lon": "-81.8265"},
#     }

#     # Ensure 'start_forecast_horizon_date' and 'end_forecast_horizon_date' are datetime objects
#     if isinstance(start_forecast_horizon_date, str):
#         start_forecast_horizon_date = datetime.strptime(
#             start_forecast_horizon_date, "%Y-%m-%d"
#         )
#     if isinstance(end_forecast_horizon_date, str):
#         end_forecast_horizon_date = datetime.strptime(
#             end_forecast_horizon_date, "%Y-%m-%d"
#         )

#     # Ensure 'start_forecast_date' is a datetime object
#     if isinstance(start_forecast_date, str):
#         start_forecast_date = datetime.strptime(start_forecast_date, "%Y-%m-%d")

#     # Generate valid dates and horizons
#     valid_dates_horizons = []
#     count = 0
#     date = start_forecast_horizon_date
#     while date <= end_forecast_horizon_date:
#         valid_date = date
#         horizon = (valid_date - start_forecast_date).days
#         valid_dates_horizons.append((valid_date, horizon))
#         count += 1
#         date += timedelta(days=1)
#     logging.info(f"Generated {len(valid_dates_horizons)} forecast horizons.")

#     # Ensemble members in smaller batches
#     ensemble_members_batches = [
#         [str(x).zfill(2) for x in range(i, min(i + 1, end_ensembles + 1))]
#         for i in range(start_ensembles, end_ensembles + 1)
#     ]

#     # Loop over each city, variable, and ensemble members in batches
#     for city, coordinates in cities.items():
#         lat = float(coordinates["lat"])
#         lon = float(coordinates["lon"])
#         logging.info(f"Starting data query for city: {city} (lat: {lat}, lon: {lon})")
#         temperature_adjustment = fetch_elevation_data(lat, lon)

#         for VARIABLE in layers_TWC.keys():
#             logging.info(f"Starting data query for variable: {VARIABLE}")
#             for ensemble_members in ensemble_members_batches:
#                 logging.info(f"Querying ensemble members: {ensemble_members}")

#                 query_layers = []
#                 for valid_date, horizon in valid_dates_horizons:
#                     for ens in ensemble_members:
#                         query_layers.append(
#                             {
#                                 "type": "raster",
#                                 "id": layers_TWC[VARIABLE],
#                                 "temporal": {
#                                     "intervals": [
#                                         {
#                                             "start": (
#                                                 valid_date - timedelta(seconds=60)
#                                             ).strftime(iso_8601),
#                                             "end": (
#                                                 valid_date + timedelta(seconds=60)
#                                             ).strftime(iso_8601),
#                                         }
#                                     ]
#                                 },
#                                 "dimensions": [
#                                     {"name": "forecast", "value": ens},
#                                     {"name": "horizon", "value": horizon},
#                                 ],
#                             }
#                         )

#                 # Construct query JSON payload
#                 query_json = {
#                     "layers": query_layers,
#                     "spatial": {"type": "point", "coordinates": [lat, lon]},
#                     "temporal": {"intervals": [{"snapshot": "1982-01-01"}]},
#                     "outputType": "json",
#                 }
#                 logging.info(
#                     f"Constructed query JSON for ensemble members {ensemble_members}."
#                 )

#                 # Submit the query and process the results
#                 try:
#                     logging.info("Submitting query to IBM PAIRS API.")
#                     # df = query.submit(query_json).point_data_as_dataframe()
#                     df = query.submit(query_json, client=eis_client).point_data_as_dataframe()


#                     if df.empty:
#                         logging.warning(
#                             f"No data returned for ensemble members {ensemble_members}"
#                         )
#                         continue

#                     logging.info(f"Data retrieved, processing {len(df)} records.")
#                     if VARIABLE == "TAVG":
#                         df["value"] = df["value"].astype(float) + temperature_adjustment
#                     if store_in_excel == 1:
#                         process_and_store_in_excel(df, city, lat, lon, VARIABLE)
#                     else:
#                         process_and_store_data(df, city, lat, lon, VARIABLE)
#                     gc.collect()
#                     df = None
#                     gc.collect()
#                 except Exception as e:
#                     logging.error(f"Error during query submission for {VARIABLE}: {e}")
#                     continue

#     logging.info("Weather forecast data query completed successfully.")
#     return "Weather forecast data query completed."



#  Weather forecast data fetching insertion and pruning
def fetch_and_store_weather_forecast(
    start_forecast_date,
    end_forecast_horizon_date,
    start_forecast_horizon_date,
    start_ensembles,
    end_ensembles,
    store_in_excel,
):
    # IBM API Configuration
    eis_client = get_client(
        api_key="PHXfXSpwiWwQ9NoUg9IYhhaf24cXmmMwZa0zPoW23hktX8",
        tenant_id="7370463f-df01-4aa0-b204-d6d15ff71f85",
        org_id=EIS_ORG_ID,
        legacy=False,
    )

    # Forecast parameters
    layers_TWC = {"PRECIP": 50686, "TAVG": 50685}
    iso_8601 = "%Y-%m-%dT%H:%M:%SZ"

    # List of cities with their latitude and longitude
    cities = {
        "Immokalee Fl": {"lat": "26.4187", "lon": "-81.4173"},
        "Palm Beach County, fl": {"lat": "26.7153", "lon": "-80.0534"},
        "Vineland NJ": {"lat": "39.4802", "lon": "-75.0138"},
        "Sodus, Michigan": {"lat": "42.0086", "lon": "-86.3614"},
        "Sinaloa": {"lat": "25.1721", "lon": "-107.4795"},
        "Sonora": {"lat": "29.2972", "lon": "-110.3309"},
        "Ensenada": {"lat": "31.86613056", "lon": "-116.59971944"},
        "Baja Mx": {"lat": "28.0444", "lon": "-115.2062"},
        "Culican": {"lat": "24.8091", "lon": "-107.3940"},
        "Hendersonville, NC": {"lat": "35.3187", "lon": "-82.4610"},
        "Cameron SC": {"lat": "33.5568", "lon": "-80.7151"},
        "Adel, Ga": {"lat": "31.13633333", "lon": "-83.42216389"},
        "Lake Park Ga": {"lat": "30.6844", "lon": "-83.1849"},
        "Bowling Green Fl": {"lat": "27.6386", "lon": "-81.8265"},
    }

    # Ensure date arguments are datetime objects
    if isinstance(start_forecast_date, str):
        start_forecast_date = datetime.strptime(start_forecast_date, "%Y-%m-%d")
    if isinstance(start_forecast_horizon_date, str):
        start_forecast_horizon_date = datetime.strptime(
            start_forecast_horizon_date, "%Y-%m-%d"
        )
    if isinstance(end_forecast_horizon_date, str):
        end_forecast_horizon_date = datetime.strptime(
            end_forecast_horizon_date, "%Y-%m-%d"
        )

    # Generate valid dates/horizons
    valid_dates_horizons = []
    date_ptr = start_forecast_horizon_date
    while date_ptr <= end_forecast_horizon_date:
        horizon = (date_ptr - start_forecast_date).days
        valid_dates_horizons.append((date_ptr, horizon))
        date_ptr += timedelta(days=1)

    logging.info(f"Generated {len(valid_dates_horizons)} forecast horizons.")

    # Build smaller batches of ensemble members
    ensemble_members_batches = [
        [str(x).zfill(2) for x in range(i, min(i + 1, end_ensembles + 1))]
        for i in range(start_ensembles, end_ensembles + 1)
    ]

    # Loop over each city, variable, and ensemble members in batches
    for city, coordinates in cities.items():
        lat = float(coordinates["lat"])
        lon = float(coordinates["lon"])
        logging.info(f"Starting data query for city: {city} (lat: {lat}, lon: {lon})")

        # Elevation-based temperature adjustment (if TAVG)
        temperature_adjustment = fetch_elevation_data(lat, lon)

        for VARIABLE in layers_TWC.keys():
            logging.info(f"Starting data query for variable: {VARIABLE}")

            for ensemble_members in ensemble_members_batches:
                logging.info(f"Querying ensemble members: {ensemble_members}")

                # Build up the query JSON
                query_layers = []
                for valid_date, horizon in valid_dates_horizons:
                    query_layers.append(
                        {
                            "type": "raster",
                            "id": layers_TWC[VARIABLE],
                            "temporal": {
                                "intervals": [
                                    {
                                        "start": (
                                            valid_date - timedelta(seconds=60)
                                        ).strftime(iso_8601),
                                        "end": (
                                            valid_date + timedelta(seconds=60)
                                        ).strftime(iso_8601),
                                    }
                                ]
                            },
                            "dimensions": [
                                {"name": "forecast", "value": ens}
                                for ens in ensemble_members
                            ]
                            + [{"name": "horizon", "value": horizon}],
                        }
                    )

                query_json = {
                    "layers": query_layers,
                    "spatial": {"type": "point", "coordinates": [lat, lon]},
                    "temporal": {"intervals": [{"snapshot": "1982-01-01"}]},
                    "outputType": "json",
                }

                try:
                    logging.info("Submitting query to IBM PAIRS API.")
                    df = query.submit(query_json, client=eis_client).point_data_as_dataframe()

                    if df.empty:
                        logging.warning(
                            f"No data returned for ensemble {ensemble_members} / {VARIABLE}"
                        )
                        continue

                    logging.info(f"Data retrieved, processing {len(df)} records.")

                    # If TAVG, apply temperature adjustment
                    if VARIABLE == "TAVG":
                        df["value"] = df["value"].astype(float) + temperature_adjustment

                    # ------------------------------------------------------------------
                    # (A) If user wants to store in Excel instead of DB:
                    # ------------------------------------------------------------------
                    if store_in_excel == 1:
                        process_and_store_in_excel(df, city, lat, lon, VARIABLE)
                        # No DB insertion, so no pruning needed in that scenario.
                    else:
                        # ------------------------------------------------------------------
                        # (B) Otherwise, insert into DB and prune old rows 1:1
                        # ------------------------------------------------------------------
                        new_rows = []
                        for _, row in df.iterrows():
                            try:
                                date_val = int(row["timestamp"])
                                value_val = float(row["value"])
                                # property might look like "forecast:01; horizon:3"
                                # so parse out ensemble:
                                ens_str = row.get("property", "forecast:0").split(";")[0]
                                ens_member = int(ens_str.split(":")[1])

                                forecast_date = datetime.fromtimestamp(
                                    date_val / 1000, tz=pytz.utc
                                ).date()

                                wf = WeatherForecast(
                                    city_name=city,
                                    latitude=lat,
                                    longitude=lon,
                                    forecast_date=forecast_date,
                                    variable=VARIABLE,
                                    forecasted_value=value_val,
                                    ensemble_member=ens_member,
                                    source="IBM",
                                )
                                new_rows.append(wf)
                            except Exception as row_e:
                                logging.error(f"Row parse error: {row_e}")
                                continue

                        # Insert all new rows
                        db.session.add_all(new_rows)
                        db.session.flush()  # so they get IDs

                        n_inserted = len(new_rows)
                        if n_inserted > 0:
                            # Prune that many oldest rows
                            subq = (
                                db.session.query(WeatherForecast.id)
                                .order_by(WeatherForecast.id.asc())
                                .limit(n_inserted)
                                .subquery()
                            )
                            db.session.query(WeatherForecast).filter(
                                WeatherForecast.id.in_(subq)
                            ).delete(synchronize_session=False)

                        # Commit once after insert + prune
                        db.session.commit()

                    # Clean up memory usage
                    gc.collect()
                    df = None
                    gc.collect()

                except Exception as e:
                    logging.error(f"Error during query submission for {VARIABLE}: {e}")
                    continue

    logging.info("Weather forecast data query completed successfully.")
    return "Weather forecast data query completed."



# @app.route("/api/test_fake_weather_forecast")
# def run_fake_weather_test():
#     test_fake_weather_forecast_insertion_and_prune()
#     return "Fake weather forecast test complete!"






# def test_fake_weather_forecast_insertion_and_prune():
#     """
#     Inserts a few fake WeatherForecast rows and prunes the same number of oldest rows.
#     """

#     # 1) Create a fake DataFrame with columns we need.
#     #    We'll store 'timestamp' in milliseconds since epoch
#     #    and 'value' as the forecasted_value.
#     #    Optionally you can add a column for 'ensemble_member' if you want multiple members.
#     df = pd.DataFrame({
#         "timestamp": [1680000000000, 1680000001000, 1680000002000],
#         "value": [10.5, 12.2, 15.0],
#         "ensemble_member": [1, 1, 1]   # or vary them if you want multiple ensemble members
#     })

#     # 2) Decide on a city_name, lat, lon, variable, and source
#     city_name = "Fake City"
#     lat = 26.4187
#     lon = -81.4173
#     variable = "PRECIP"      # or "TAVG", etc.
#     source = "IBM"           # or "TestSource"

#     # 3) Build WeatherForecast rows from the DataFrame
#     new_rows = []
#     for _, row in df.iterrows():
#         try:
#             timestamp_val = int(row["timestamp"])
#             forecast_val = float(row["value"])
#             ensemble = int(row["ensemble_member"])

#             # Convert timestamp to a Python date
#             forecast_date = datetime.utcfromtimestamp(timestamp_val / 1000).date()

#             # Build the WeatherForecast object
#             wdata = WeatherForecast(
#                 city_name=city_name,
#                 latitude=lat,
#                 longitude=lon,
#                 forecast_date=forecast_date,
#                 variable=variable,
#                 forecasted_value=forecast_val,
#                 ensemble_member=ensemble,
#                 source=source,
#             )
#             new_rows.append(wdata)
#         except Exception as row_e:
#             print(f"Error parsing row for {variable}: {row_e}")
#             continue

#     # 4) Insert all new rows
#     db.session.add_all(new_rows)
#     db.session.flush()  # so they get assigned IDs

#     # 5) Prune the same number of oldest rows by ascending ID
#     n_inserted = len(new_rows)
#     if n_inserted > 0:
#         subq = (
#             db.session.query(WeatherForecast.id)
#             .order_by(WeatherForecast.id.asc())
#             .limit(n_inserted)
#             .subquery()
#         )
#         db.session.query(WeatherForecast).filter(
#             WeatherForecast.id.in_(subq)
#         ).delete(synchronize_session=False)

#     # 6) Commit
#     db.session.commit()
#     gc.collect()

#     print(f"Inserted {n_inserted} fake WeatherForecast rows and pruned {n_inserted} oldest rows.")


def process_and_store_data(df, city, lat, lon, VARIABLE):
    # Process and store data in the database
    for _, row in df.iterrows():
        try:
            date = int(row["timestamp"])
            value = float(row["value"])
            ens = int(row.get("property", "forecast:0").split(";")[0].split(":")[1])
            logging.debug(
                f"Processing record - Date: {date}, Value: {value}, Forecast: {ens}"
            )

            # Convert timestamp to datetime
            forecast_date = datetime.fromtimestamp(date / 1000, tz=pytz.utc).date()

            # Store data in the WeatherForecast database
            weather_forecast = WeatherForecast(
                city_name=city,
                latitude=lat,
                longitude=lon,
                forecast_date=forecast_date,
                variable=VARIABLE,
                forecasted_value=value,
                ensemble_member=ens,
                source="IBM",
            )
            db.session.add(weather_forecast)
        except Exception as e:
            logging.error(f"Error processing record for {VARIABLE}: {e}")
            logging.error(f"Record data: {row}")
            continue

    db.session.commit()
    logging.info(f"Data points for city {city} stored successfully.")


def process_and_store_in_excel(df, city, lat, lon, VARIABLE):
    # Process and store data in an Excel file
    import os
    from openpyxl import Workbook, load_workbook
    from openpyxl.utils.dataframe import dataframe_to_rows

    # Create directory if it doesn't exist
    data_dir = "data"
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)

    # Define Excel file path for each variable
    file_path = os.path.join(
        data_dir, f"{city.replace(',', '').replace(' ', '_')}_{VARIABLE}.xlsx"
    )

    # Load or create workbook
    if os.path.exists(file_path):
        workbook = load_workbook(file_path)
    else:
        workbook = Workbook()
        if workbook.active:
            workbook.remove(workbook.active)

    # Create or get sheet for the data
    sheet_name = f"{VARIABLE}_data"
    if sheet_name not in workbook.sheetnames:
        sheet = workbook.create_sheet(title=sheet_name)
        # Add headers
        sheet.append(
            [
                "city_name",
                "latitude",
                "longitude",
                "forecast_date",
                "variable",
                "forecasted_value",
                "ensemble_member",
                "source",
            ]
        )
    else:
        sheet = workbook[sheet_name]

    # Append data to the sheet
    for _, row in df.iterrows():
        try:
            date = int(row["timestamp"])
            value = float(row["value"])
            ens = int(row.get("property", "forecast:0").split(";")[0].split(":")[1])

            # Convert timestamp to datetime
            forecast_date = datetime.fromtimestamp(date / 1000, tz=pytz.utc).date()

            # Append data in the format of the database
            sheet.append([city, lat, lon, forecast_date, VARIABLE, value, ens, "IBM"])
        except Exception as e:
            logging.error(f"Error processing record for {VARIABLE}: {e}")
            logging.error(f"Record data: {row}")
            continue

    # Save workbook periodically to minimize data loss risk
    workbook.save(file_path)
    logging.info(f"Data points for city {city} stored in Excel file {file_path}.")


def fetch_elevation_data(lat, lon):
    layers_ELEVATION = {"twc_elevation": 51219, "srtm_elevation": 49506}
    elevation = {}

    for VARIABLE in ["twc_elevation", "srtm_elevation"]:
        query_json = {
            "layers": [{"type": "raster", "id": layers_ELEVATION[VARIABLE]}],
            "spatial": {"type": "point", "coordinates": [lat, lon]},
            "temporal": {"intervals": [{"snapshot": "2020-01-01T00:00:00Z"}]},
        }
        try:
            logging.info(f"Submitting elevation data query for {VARIABLE}.")
            # df = query.submit(query_json).point_data_as_dataframe()
            df = query.submit(query_json, client=eis_client).point_data_as_dataframe()

            if len(df) > 0:
                elevation[VARIABLE] = float(df.iloc[0]["value"])
        except Exception as e:
            logging.error(f"Error retrieving elevation data for {VARIABLE}: {e}")

    if "twc_elevation" in elevation and "srtm_elevation" in elevation:
        # Compute lapse-rate correction of Temperature
        elevation_diff = elevation["srtm_elevation"] - elevation["twc_elevation"]
        temperature_adjustment = elevation_diff * (-0.0098)
        logging.info(
            f"Temperature adjustment based on elevation difference: {temperature_adjustment}"
        )
    else:
        temperature_adjustment = 0
        logging.warning(
            f"Could not calculate temperature adjustment due to missing elevation data."
        )

    return temperature_adjustment






# for climatology Data
# def fetch_and_store_climatology_data(start_climo_date, end_climo_date):
#     # IBM API Configuration
#     eis_client = get_client(
#         api_key=EIS_API_KEY, tenant_id=EIS_TENANT_ID, org_id=EIS_ORG_ID, legacy=False
#     )

#     # Climatology parameters
#     layers_ERA5 = {"PRECIP": 51198, "TAVG": 51199}
#     iso_8601 = "%Y-%m-%dT%H:%M:%SZ"

#     # List of cities with their latitude and longitude
#     cities = {
#         "Ensenada": {"lat": "31.86613056", "lon": "-116.59971944"},
#         "Baja Mx": {"lat": "28.0444", "lon": "-115.2062"},
#         "Culican": {"lat": "24.8091", "lon": "-107.3940"},
#         "Hendersonville, NC": {"lat": "35.3187", "lon": "-82.4610"},
#         "Cameron SC": {"lat": "33.5568", "lon": "-80.7151"},
#         "Adel, Ga": {"lat": "31.13633333", "lon": "-83.42216389"},
#         "Lake Park Ga": {"lat": "30.6844", "lon": "-83.1849"},
#         "Bowling Green Fl": {"lat": "27.6386", "lon": "-81.8265"},
#     }

#     # Loop over each city and variable
#     for city, coordinates in cities.items():
#         lat = float(coordinates["lat"])
#         lon = float(coordinates["lon"])
#         logging.info(
#             f"Starting climatology data query for city: {city} (lat: {lat}, lon: {lon})"
#         )

#         # Fetch elevation data for temperature adjustment
#         temperature_adjustment = fetch_elevation_data(lat, lon)

#         for VARIABLE in layers_ERA5.keys():
#             logging.info(f"Starting climatology data query for variable: {VARIABLE}")

#             # Construct query JSON payload
#             query_json = {
#                 "layers": [{"type": "raster", "id": layers_ERA5[VARIABLE]}],
#                 "spatial": {"type": "point", "coordinates": [lat, lon]},
#                 "temporal": {
#                     "intervals": [
#                         {
#                             "start": start_climo_date.strftime(iso_8601),
#                             "end": end_climo_date.strftime(iso_8601),
#                         }
#                     ]
#                 },
#                 "outputType": "json",
#             }
#             logging.info(f"Constructed query JSON for climatology data.")

#             # Submit the query and process the results
#             try:
#                 logging.info("Submitting query to IBM PAIRS API for climatology data.")
#                 # df = query.submit(query_json).point_data_as_dataframe()
#                 df = query.submit(query_json, client=eis_client).point_data_as_dataframe()

#                 if df.empty:
#                     logging.warning(
#                         f"No data returned for climatology data for {VARIABLE}"
#                     )
#                     continue

#                 # Apply temperature adjustment if the variable is TAVG
#                 if VARIABLE == "TAVG":
#                     df["value"] = df["value"].astype(float) + temperature_adjustment

#                 logging.info(
#                     f"Climatology data retrieved, processing {len(df)} records."
#                 )
#                 process_and_store_climatology_data(df, city, lat, lon, VARIABLE)
#                 gc.collect()
#                 df = None
#                 gc.collect()
#             except Exception as e:
#                 logging.error(
#                     f"Error during climatology data query for {VARIABLE}: {e}"
#                 )
#                 continue

#     logging.info("Climatology data query completed successfully.")
#     return "Climatology data query completed."



# Insertion and pruning

def fetch_and_store_climatology_data(start_climo_date, end_climo_date):
    # IBM API Configuration
    eis_client = get_client(
        api_key=EIS_API_KEY, tenant_id=EIS_TENANT_ID, org_id=EIS_ORG_ID, legacy=False
    )

    # Climatology parameters
    layers_ERA5 = {"PRECIP": 51198, "TAVG": 51199}
    iso_8601 = "%Y-%m-%dT%H:%M:%SZ"

    # List of cities with their latitude and longitude
    cities = {
        "Ensenada": {"lat": "31.86613056", "lon": "-116.59971944"},
        "Baja Mx": {"lat": "28.0444", "lon": "-115.2062"},
        "Culican": {"lat": "24.8091", "lon": "-107.3940"},
        "Hendersonville, NC": {"lat": "35.3187", "lon": "-82.4610"},
        "Cameron SC": {"lat": "33.5568", "lon": "-80.7151"},
        "Adel, Ga": {"lat": "31.13633333", "lon": "-83.42216389"},
        "Lake Park Ga": {"lat": "30.6844", "lon": "-83.1849"},
        "Bowling Green Fl": {"lat": "27.6386", "lon": "-81.8265"},
    }

    # Loop over each city and variable
    for city, coordinates in cities.items():
        lat = float(coordinates["lat"])
        lon = float(coordinates["lon"])
        logging.info(
            f"Starting climatology data query for city: {city} (lat: {lat}, lon: {lon})"
        )

        # Fetch elevation data for temperature adjustment (if TAVG)
        temperature_adjustment = fetch_elevation_data(lat, lon)

        for VARIABLE in layers_ERA5.keys():
            logging.info(f"Starting climatology data query for variable: {VARIABLE}")

            # Build the query JSON payload
            query_json = {
                "layers": [{"type": "raster", "id": layers_ERA5[VARIABLE]}],
                "spatial": {"type": "point", "coordinates": [lat, lon]},
                "temporal": {
                    "intervals": [
                        {
                            "start": start_climo_date.strftime(iso_8601),
                            "end": end_climo_date.strftime(iso_8601),
                        }
                    ]
                },
                "outputType": "json",
            }
            logging.info("Constructed query JSON for climatology data.")

            # Submit the query and process the results
            try:
                logging.info("Submitting query to IBM PAIRS API for climatology data.")
                df = query.submit(query_json, client=eis_client).point_data_as_dataframe()

                if df.empty:
                    logging.warning(f"No data returned for climatology data for {VARIABLE}")
                    continue

                # Apply temperature adjustment if the variable is TAVG
                if VARIABLE == "TAVG":
                    df["value"] = df["value"].astype(float) + temperature_adjustment

                logging.info(f"Climatology data retrieved, processing {len(df)} records.")

                # ------------------------------------------------------------------
                # Insert new rows and prune the oldest rows 1:1
                # ------------------------------------------------------------------
                new_rows = []
                for _, row in df.iterrows():
                    try:
                        timestamp_val = int(row["timestamp"])
                        value_val = float(row["value"])

                        # Convert timestamp (ms) to a Python date
                        cdate = datetime.utcfromtimestamp(timestamp_val / 1000).date()

                        # Build the ClimatologyData object
                        cdata = ClimatologyData(
                            city_name=city,
                            latitude=lat,
                            longitude=lon,
                            forecast_date=cdate,
                            variable=VARIABLE,
                            climatology_value=value_val,
                            source="IBM",
                        )
                        new_rows.append(cdata)
                    except Exception as row_e:
                        logging.error(f"Error parsing row for {VARIABLE}: {row_e}")
                        continue

                # Insert all new rows in bulk
                db.session.add_all(new_rows)
                db.session.flush()  # so they get assigned IDs

                # Prune the same number of oldest rows
                n_inserted = len(new_rows)
                if n_inserted > 0:
                    # Identify the oldest rows by ascending ID (or created_at if you prefer)
                    subq = (
                        db.session.query(ClimatologyData.id)
                        .order_by(ClimatologyData.id.asc())
                        .limit(n_inserted)
                        .subquery()
                    )
                    db.session.query(ClimatologyData).filter(
                        ClimatologyData.id.in_(subq)
                    ).delete(synchronize_session=False)

                # Commit once after insert + prune
                db.session.commit()

                # Cleanup
                gc.collect()
                df = None
                gc.collect()

            except Exception as e:
                logging.error(f"Error during climatology data query for {VARIABLE}: {e}")
                continue

    logging.info("Climatology data query completed successfully.")
    return "Climatology data query completed."





def process_and_store_climatology_data(df, city, lat, lon, VARIABLE):
    # Process and store data in the database
    for _, row in df.iterrows():
        try:
            date = int(row["timestamp"])
            value = float(row["value"])
            logging.debug(
                f"Processing climatology record - Date: {date}, Value: {value}"
            )

            # Convert timestamp to datetime
            forecast_date = datetime.utcfromtimestamp(date / 1000).date()

            # Store data in the Climatology database
            climatology_data = ClimatologyData(
                city_name=city,
                latitude=lat,
                longitude=lon,
                forecast_date=forecast_date,
                variable=VARIABLE,
                climatology_value=value,
                source="IBM",
            )
            db.session.add(climatology_data)
        except Exception as e:
            logging.error(f"Error processing climatology record for {VARIABLE}: {e}")
            logging.debug(f"Record data: {row}")
            continue

    db.session.commit()
    logging.info(f"Climatology data points for city {city} stored successfully.")


# Scheduler for API calls to USDA and Produce IQ
# Running the Scheduler
def schedule_jobs():
    # Define the Los Angeles timezone
    la_timezone = timezone("US/Pacific")

    scheduler = BackgroundScheduler(timezone=la_timezone)

    pk_timezone = timezone("Asia/Karachi")

    # Initialize the scheduler
    scheduler = BackgroundScheduler(timezone=pk_timezone)

    # Schedule ProduceIQ job to run every 2 hours but start at 12:25 AM to avoid overlap with weather forecast
    scheduler.add_job(
        func=fetch_daily_data,
        trigger=IntervalTrigger(
            hours=2, start_date="2024-10-01 00:25:00", timezone=la_timezone
        ),  # Runs every 2 hours, starting at 12:25 AM
        id="produce_iq_job",
    )

    # Schedule USDA job to run every 2 hours but 5 minutes after ProduceIQ job, i.e., at 12:30 AM
    scheduler.add_job(
        func=fetch_usda_daily_data,
        trigger=IntervalTrigger(
            hours=2, start_date="2024-10-01 00:30:00", timezone=la_timezone
        ),  # Runs every 2 hours, starting at 12:30 AM
        id="usda_job",
    )

    scheduler.start()
    logging.info(
        "Scheduler has started with adjusted timing for ProduceIQ, USDA, and Weather Forecast jobs."
    )


# Clean up sessions when the app context ends
@app.teardown_appcontext
def shutdown_session(exception=None):
    db.session.remove()


admin = Admin(app, name="Admin Panel")
admin.add_view(ModelView(User, db.session))
admin.add_view(ModelView(PriceData, db.session))  # Add PriceData to Admin panel


# User loader for Flask-Login
@login_manager.user_loader
def load_user(user_id):

    return User.query.get(int(user_id))


# Forms for login and registration
class RegisterForm(FlaskForm):
    username = StringField(
        "Username", validators=[InputRequired(), Length(min=4, max=150)]
    )
    email = StringField(
        "Email",
        validators=[InputRequired(), Email(message="Invalid email"), Length(max=150)],
    )
    password = PasswordField("Password", validators=[InputRequired(), Length(min=8)])
    confirm_password = PasswordField(
        "Confirm Password",
        validators=[
            InputRequired(),
            EqualTo("password", message="Passwords must match"),
        ],
    )
    role = SelectField(
        "Role", choices=[("sales", "Sales"), ("owner", "Owner"), ("admin", "Admin")]
    )
    submit = SubmitField("Register")


class LoginForm(FlaskForm):
    email = StringField(
        "Email", validators=[InputRequired(), Email(message="Invalid email")]
    )
    password = PasswordField("Password", validators=[InputRequired(), Length(min=8)])
    submit = SubmitField("Login")







# Home page
@app.route("/api/")
# @jwt_required()
def index():
    print("test1")
    if current_user.is_admin():
        return redirect(url_for("admin_dashboard"))
    elif current_user.is_owner():
        return redirect(url_for("owner_dashboard"))
    else:
        return redirect(url_for("sales_dashboard"))



# Current user route
@app.route("/api/current_user", methods=["GET"])
def get_current_user():
    print("Current User:", current_user)  # Debugging
    print("Is Authenticated:", current_user.is_authenticated)  # Check if true
    if current_user.is_authenticated:
        return jsonify({
            "isAuthenticated": True,
            "isAdmin": current_user.is_admin(),
            "isOwner": current_user.is_owner(),
            "username": current_user.username
        })
    return jsonify({
        "isAuthenticated": False,
        "isAdmin": False,
        "isOwner": False,
        "username": None
    })



# Dashboards
@app.route("/api/admin_dashboard", methods=["GET"])
# # @jwt_required()
def admin_dashboard():
    try:
        # Ensure current_user is available and authenticated
        if not current_user.is_authenticated:
            return jsonify({"error": "User not authenticated"}), 401

        # Return admin-specific data
        return jsonify({
            "message": "Welcome to the Admin Dashboard!",
            "username": current_user.username,
            "role": current_user.role,
        }), 200
    except Exception as e:
        # Log the exception
        app.logger.error(f"Error in /admin_dashboard: {str(e)}")
        return jsonify({"error": "Internal Server Error"}), 500

# @app.route("/admin_dashboard")
# @login_required
# def admin_dashboard():
#     return render_template("admin_dashboard.html")


@app.route("/api/owner_dashboard")
# # @jwt_required()
def owner_dashboard():
    return render_template("owner_dashboard.html")


@app.route("/api/weather_dashboard")
# # @jwt_required()
def weather_dashboard():
    return render_template("weather_dashboard.html")





@app.route("/api/sales_dashboard", methods=["GET"])
# @jwt_required()
def sales_dashboard_api():
    current_user = get_jwt_identity()

    # Role validation (optional)
    if current_user.get("role") not in ["admin", "sales"]:
        return jsonify({"error": "Access denied"}), 403

    try:
        selected_commodity = request.args.get("commodity", "Jalapeno")
        selected_source = request.args.get("source", "Historical")

        # Get the most recent year and day
        latest_year = db.session.query(db.func.max(PriceData.year)).scalar()
        latest_day = (
            db.session.query(db.func.max(PriceData.day))
            .filter_by(year=latest_year)
            .scalar()
        )

        # Query the best sell market
        best_market = (
            db.session.query(
                PriceData.city_name,
                db.func.max(PriceData.price).label("max_price"),
                PriceData.year,
                PriceData.day,
            )
            .filter(
                PriceData.commodity == selected_commodity,
                PriceData.source == selected_source,
                PriceData.year == latest_year,
                PriceData.day == latest_day,
            )
            .group_by(PriceData.city_name, PriceData.year, PriceData.day)
            .order_by(db.desc("max_price"))
            .all()
        )

        # Format the result
        formatted_best_market = [
            {
                "city_name": item.city_name,
                "max_price": item.max_price,
                "year": item.year,
                "day": item.day,
                "formatted_date": (datetime(item.year, 1, 1) + timedelta(days=item.day - 1)).strftime("%Y-%m-%d"),
            }
            for item in best_market
        ] if best_market else []

        return jsonify({
            "best_market": formatted_best_market,
            "selected_commodity": selected_commodity,
            "selected_source": selected_source,
        })

    except SQLAlchemyError as e:
        return jsonify({"error": "Database query failed", "details": str(e)}), 500



@app.route("/api/test_cache", methods=["GET"])
def test_cache():
    return jsonify({"message": "Hello from cache test"})



# Registration route
@app.route("/api/register", methods=["POST"])
def register():
    try:
        # Parse JSON data from the request
        data = request.json
        username = data.get("username")
        email = data.get("email")
        password = data.get("password")
        confirm_password = data.get("confirmPassword")
        role = data.get("role")

        # Validate the input data
        if not username or not email or not password or not confirm_password or not role:
            return jsonify({"error": "All fields are required"}), 400

        if password != confirm_password:
            return jsonify({"error": "Passwords do not match"}), 400

        # Check if the email already exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({"error": "Email is already registered"}), 400

        # Hash the password
        hashed_password = generate_password_hash(password)

        # Create a new user instance
        new_user = User(
            username=username,
            email=email,
            password=hashed_password,
            role=role,
            approved=False,  # Default to not approved
        )
        logging.info(f"Received registration data: {data}")


        # Add the new user to the database
        db.session.add(new_user)
        db.session.commit()

        return jsonify({"message": "Registration successful!"}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500




@app.route("/api/protected", methods=["GET"])
# @jwt_required()
def protected():
    current_user = get_jwt_identity()
    return jsonify({"logged_in_as": current_user}), 200


from datetime import timedelta

@app.route("/api/login", methods=["POST"])
def login():
    try:
        # Parse JSON data from the request
        data = request.json
        email = data.get("email")
        password = data.get("password")

        # Check if email and password are provided
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        # Fetch the user from the database
        user = User.query.filter_by(email=email).first()

        # Validate the user and password
        if user and check_password_hash(user.password, password):
            if not user.approved:
                return jsonify({"error": "Your account is not approved yet. Please wait for approval."}), 403

            # Create a JWT access token with an expiration time
        
            access_token = create_access_token(
    identity=str(user.id),  # Use user.id or a unique string identifier
    additional_claims={"username": user.username, "role": user.role},
    expires_delta=timedelta(hours=5)
)

            return jsonify({
                "message": "Login successful!",
                "token": access_token,
                "role": user.role,
                "username": user.username,
                "user_id": user.id,
            }), 200
        else:
            return jsonify({"error": "Invalid email or password"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500



# Logout route

@app.route("/api/logout", methods=["POST"])
# @jwt_required()
def logout():
    # Add the token's JTI (unique identifier) to the blacklist
    jti = get_jwt()["jti"]
    blacklist.add(jti)
    return jsonify({"message": "Successfully logged out"}), 200

# Route for approving users


@app.route("/api/users", methods=["GET"])
# @jwt_required()
def approve_users():
    try:
        current_user_id = get_jwt_identity()  # Fetch the identity (user ID)
        claims = get_jwt()  # Fetch additional claims

        # Check role
        if claims['role'] not in ['admin', 'owner']:
            return jsonify({"error": "Access denied"}), 403

        # Fetch unapproved users
        unapproved_users = User.query.filter_by(approved=False).all()
        users = [{"id": user.id, "username": user.username, "email": user.email, "role": user.role} for user in unapproved_users]

        return jsonify({"users": users}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route("/api/approve_user/<int:user_id>", methods=["POST"])
# @jwt_required()
def approve_user(user_id):
    try:
        current_user = get_jwt_identity()  # Fetch identity from the token
        claims = get_jwt()  # Fetch additional claims

        # Check if the current user is an owner
        if claims['role'] != 'owner':
            return jsonify({"error": "Access denied"}), 403

        # Fetch the user to be approved
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404

        user.approved = True  # Approve the user
        db.session.commit()

        return jsonify({"message": f"User {user.username} approved successfully."}), 200
    except Exception as e:
        print(f"Error approving user: {e}")  # Debug log
        return jsonify({"error": "An error occurred while approving the user."}), 500




# FrontEND API internal
@app.route("/api/best_sell_market", methods=["GET"])
# @jwt_required()
def api_best_sell_market():
    selected_commodity = request.args.get("commodity", "Jalapeno")
    selected_source = request.args.get("source", "USDA")  # Default to USDA
    last7Days = request.args.get("last7Days", "false").lower() == "true"

    # Handle special case: If the commodity is "Cubanelles" and the source is "USDA", search for "Cubanelle"
    if selected_commodity == "Cubanelles" and selected_source == "USDA":
        selected_commodity = "Cubanelle"

    # Define the static cities
    cities = [
        "Baltimore",
        "Boston",
        "Chicago",
        "Columbia",
        "Miami",
        "New York",
        "Philadelphia",
        "Los Angeles",
    ]

    # Get the current US time and calculate the date 7 days ago
    us_time = datetime.now(timezone("US/Eastern"))
    seven_days_ago = us_time - timedelta(days=7)
    print(f"Current US time: {us_time}, 7 Days Ago: {seven_days_ago}")

    best_market_data = []

    for city in cities:

        query = (
            db.session.query(
                func.min(PriceData.price).label("min_price"),
                func.max(PriceData.price).label("max_price"),
                PriceData.year,
                PriceData.day,
            )
            .filter(
                func.upper(PriceData.city_name)
                == city.upper(),  # Convert to uppercase for case-insensitive comparison
                PriceData.commodity == selected_commodity,
                PriceData.source.in_(
                    ["Historical", selected_source]
                ),  # Either Historical or selected source
            )
            .group_by(PriceData.year, PriceData.day)
            .order_by(PriceData.year.desc(), PriceData.day.desc())
        )

        if last7Days:
            # Filter the query further if 'Only Consider Last 7 Days' is checked
            query = query.filter(
                PriceData.year >= seven_days_ago.year,
                PriceData.day >= seven_days_ago.timetuple().tm_yday,
            )

        # Execute the query and get the latest prices
        latest_prices = query.first()

        # If prices are found, format the range and return the prices
        if latest_prices:
            actual_date = datetime.strptime(
                f"{latest_prices.year}-{latest_prices.day}", "%Y-%j"
            ).strftime("%Y-%m-%d")
            price_range = (
                f"${latest_prices.min_price:.2f} - ${latest_prices.max_price:.2f}"
                if latest_prices.min_price != latest_prices.max_price
                else f"${latest_prices.max_price:.2f}"
            )
            best_market_data.append(
                {
                    "city_name": city,
                    "price_range": price_range,
                    "max_price": latest_prices.max_price,  # This will be used for sorting
                    "date": actual_date,
                }
            )

        else:
            # If no data is found for this city, return 'N/A'
            best_market_data.append(
                {
                    "city_name": city,
                    "price_range": "-",
                    "max_price": 0,  # Sorting placeholder
                    "date": "-",
                }
            )

    # Sort the cities by max price (highest to lowest), ensuring '-' prices go to the bottom
    best_market_data = sorted(
        best_market_data,
        key=lambda x: (
            x["max_price"] != "-",
            float(x["max_price"]) if x["max_price"] != "-" else float("-inf"),
        ),
        reverse=True,
    )

    return jsonify({"best_market": best_market_data})




from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from sqlalchemy import func, or_, and_, true, select, over
from pytz import timezone

# Assume your app, SQLAlchemy (db), and PriceData model are already configured

@app.route("/api/most_recent_prices", methods=["GET"])
def api_most_recent_prices():
    # Define cities and commodities
    cities = [
        "Baltimore", "Boston", "Chicago", "Columbia",
        "Miami", "New York", "Philadelphia", "Los Angeles",
    ]
    commodities = [
        "Anaheim", "Cubanelles", "Fresno", "Habanero", "Hungarian Wax",
        "Jalapeno", "Long Hot", "Poblano", "Serrano", "Shishito",
    ]

    selected_source = request.args.get("source", "USDA")
    if selected_source == "Both":
        valid_sources = ["USDA", "ProduceIQ"]
    else:
        valid_sources = [selected_source]

    # Map commodities if needed
    commodity_map = {
        c: "Cubanelle" if (c == "Cubanelles" and selected_source == "USDA") else c
        for c in commodities
    }
    reverse_commodity_map = {v: k for k, v in commodity_map.items()}
    adjusted_commodities = list(commodity_map.values())

    # Create date filters for the past 7 days (US/Pacific timezone)
    tz = timezone("US/Pacific")
    seven_days_ago = datetime.now(tz) - timedelta(days=7)
    date_filters = [
        (d.year, d.timetuple().tm_yday)
        for d in [seven_days_ago + timedelta(days=i) for i in range(7)]
    ]

    city_lower_map = {city.lower(): city for city in cities}

    # Build filter conditions for cities and dates
    if cities:
        city_filter_conditions = or_(
            *[PriceData.city_name.ilike(city) for city in cities]
        )
    else:
        city_filter_conditions = true()

    if date_filters:
        date_filter_conditions = or_(
            *[and_(PriceData.year == year, PriceData.day == day) for year, day in date_filters]
        )
    else:
        date_filter_conditions = true()

    # --- First CTE: Aggregate average prices ---
    price_subquery_cte = (
        db.session.query(
            PriceData.commodity,
            PriceData.city_name,
            PriceData.year,
            PriceData.day,
            func.avg(func.nullif(PriceData.price, 0)).label("avg_price")
        )
        .filter(
            PriceData.commodity.in_(adjusted_commodities),
            city_filter_conditions,
            date_filter_conditions,
            PriceData.source.in_(valid_sources),
            PriceData.price != 0
        )
        .group_by(
            PriceData.commodity,
            PriceData.city_name,
            PriceData.year,
            PriceData.day,
        )
    ).cte("price_subquery")

    # --- Second CTE: Apply window function to rank prices ---
    window = over(
        func.row_number(),
        partition_by=[price_subquery_cte.c.commodity, price_subquery_cte.c.city_name],
        order_by=[price_subquery_cte.c.year.desc(), price_subquery_cte.c.day.desc()]
    )

    ranked_prices_cte = (
        select(
            price_subquery_cte.c.commodity,
            price_subquery_cte.c.city_name,
            price_subquery_cte.c.avg_price,
            window.label('rn')
        )
    ).cte("ranked_prices")

    # --- Final Query ---
    # Explicitly select from the ranked_prices_cte. Since that CTE
    # was built on price_subquery_cte, both will be included.
    final_query = (
        select(
            ranked_prices_cte.c.commodity,
            ranked_prices_cte.c.city_name,
            ranked_prices_cte.c.avg_price
        )
        .select_from(ranked_prices_cte)
        .where(ranked_prices_cte.c.rn == 1)
    )

    results = db.session.execute(final_query).all()

    # Build the dictionary for recent prices
    recent_prices = {
        commodity: {city: "-" for city in cities}
        for commodity in commodities
    }

    for row in results:
        original_commodity = reverse_commodity_map.get(row.commodity, row.commodity)
        normalized_city = row.city_name.lower()
        original_city = city_lower_map.get(normalized_city)
        if original_city and original_commodity in recent_prices:
            recent_prices[original_commodity][original_city] = float(row.avg_price) if row.avg_price is not None else "-"

    return jsonify({"prices": recent_prices})





# @app.route("/api/historical_data", methods=["GET"])
# # @jwt_required()
# def historical_data():
    try:
        # Fetch parameters from the frontend
        commodities = request.args.get("commodities", "").split(",")
        cities = request.args.get("cities", "").split(",")
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        avg_commodities = (
            request.args.get("averageCommodities", "false").lower() == "true"
        )
        avg_cities = request.args.get("averageCities", "false").lower() == "true"

   

        # Standardize Cubanelles
        standardized_commodities = [
            "Cubanelle" if commodity.lower().startswith("cubanelle") else commodity
            for commodity in commodities
        ]

        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")

        start_day = start_dt.timetuple().tm_yday
        end_day = end_dt.timetuple().tm_yday

        app.logger.info(f"Start Day: {start_day}, End Day: {end_day}")

        # Case-insensitive filter for commodity and city name
        query = PriceData.query.filter(
            func.upper(PriceData.commodity).in_([c.upper() for c in standardized_commodities]),
            func.upper(PriceData.city_name).in_([city.upper() for city in cities]),
            PriceData.source == "USDA",
        )

        if start_dt.year == end_dt.year:
            query = query.filter(
                PriceData.year == start_dt.year,
                PriceData.day.between(start_day, end_day),
            )
        else:
            query = query.filter(
                or_(
                    and_(PriceData.year == start_dt.year, PriceData.day >= start_day),
                    and_(PriceData.year == end_dt.year, PriceData.day <= end_day),
                    and_(PriceData.year > start_dt.year, PriceData.year < end_dt.year),
                )
            )

        query = query.order_by(PriceData.year.asc(), PriceData.day.asc())
        data = query.all()

        app.logger.info(f"Query Results: {len(data)} records fetched.")

        if not data:
            return jsonify({"labels": [], "datasets": []}), 200

        price_series = {}
        all_dates = set()

        for entry in data:
            entry_date = datetime(entry.year, 1, 1) + timedelta(days=entry.day - 1)

            if entry_date < start_dt or entry_date > end_dt:
                continue

            date_str = entry_date.strftime("%Y-%m-%d")
            all_dates.add(date_str)

            display_commodity = (
                "Cubanelles"
                if entry.commodity.lower().startswith("cubanelle")
                else entry.commodity.strip().title()
            )
            display_city = entry.city_name.strip().lower().title()


            if avg_commodities and avg_cities:
                series_key = "Average Price"
            elif avg_commodities:
                series_key = display_city
            elif avg_cities:
                series_key = display_commodity
            else:
                series_key = f"{display_commodity} - {display_city}"

            if series_key not in price_series:
                price_series[series_key] = {}

            if date_str not in price_series[series_key]:
                price_series[series_key][date_str] = {"sum": 0, "count": 0}

            price_series[series_key][date_str]["sum"] += entry.price
            price_series[series_key][date_str]["count"] += 1

        app.logger.info(f"Price Series: {price_series}")

        sorted_dates = sorted(list(all_dates))
        colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"]
        datasets = []

        for idx, (series_name, date_data) in enumerate(price_series.items()):
            series_data = []
            for date in sorted_dates:
                if date in date_data:
                    avg_price = date_data[date]["sum"] / date_data[date]["count"]
                    series_data.append(round(avg_price, 2))
                else:
                    series_data.append(None)

            datasets.append(
                {
                    "label": series_name,
                    "data": series_data,
                    "borderColor": colors[idx % len(colors)],
                    "backgroundColor": colors[idx % len(colors)],
                }
            )

        del data, price_series, all_dates
        gc.collect()

        app.logger.info(f"Datasets: {datasets}")

        return jsonify({"labels": sorted_dates, "datasets": datasets})

    except Exception as e:
        app.logger.error(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/historical_data", methods=["GET"])
def historical_data():
    try:
        # Fetch parameters from the frontend
        commodities = request.args.get("commodities", "").split(",")
        cities = request.args.get("cities", "").split(",")
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        avg_commodities = (
            request.args.get("averageCommodities", "false").lower() == "true"
        )
        avg_cities = request.args.get("averageCities", "false").lower() == "true"
        
        # Create a cache key based on the request parameters
        cache_key = f"historical_data:{start_date}:{end_date}:{','.join(commodities)}:{','.join(cities)}"
        
        # Check cache for existing data
        cached_data = cache.get(cache_key)
        if cached_data:
            return jsonify(cached_data)

        # Standardize Cubanelles
        standardized_commodities = [
            "Cubanelle" if commodity.lower().startswith("cubanelle") else commodity
            for commodity in commodities
        ]

        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")

        start_day = start_dt.timetuple().tm_yday
        end_day = end_dt.timetuple().tm_yday

        # Database query with optimized filters
        query = PriceData.query.filter(
            func.upper(PriceData.commodity).in_([c.upper() for c in standardized_commodities]),
            func.upper(PriceData.city_name).in_([city.upper() for city in cities]),
            PriceData.source == "USDA",
        )

        if start_dt.year == end_dt.year:
            query = query.filter(
                PriceData.year == start_dt.year,
                PriceData.day.between(start_day, end_day),
            )
        else:
            query = query.filter(
                or_(
                    and_(PriceData.year == start_dt.year, PriceData.day >= start_day),
                    and_(PriceData.year == end_dt.year, PriceData.day <= end_day),
                    and_(PriceData.year > start_dt.year, PriceData.year < end_dt.year),
                )
            )

        # Adding pagination or limiting the number of rows fetched (optional)
        query = query.limit(5000)  # Limit the number of rows to 5000

        data = query.all()

        if not data:
            return jsonify({"labels": [], "datasets": []}), 200

        price_series = {}
        all_dates = set()

        for entry in data:
            entry_date = datetime(entry.year, 1, 1) + timedelta(days=entry.day - 1)

            # if entry_date < start_dt or entry_date > end_dt:
            #     continue

            date_str = entry_date.strftime("%Y-%m-%d")
            all_dates.add(date_str)

            display_commodity = (
                "Cubanelles"
                if entry.commodity.lower().startswith("cubanelle")
                else entry.commodity.strip().title()
            )
            display_city = entry.city_name.strip().lower().title()


            # Group data based on averaging preferences
            if avg_commodities and avg_cities:
                series_key = "Average Price"
            elif avg_commodities:
                series_key = display_city
            elif avg_cities:
                series_key = display_commodity
            else:
                series_key = f"{display_commodity} - {display_city}"

            if series_key not in price_series:
                price_series[series_key] = {}

            if date_str not in price_series[series_key]:
                price_series[series_key][date_str] = {"sum": 0, "count": 0}

            price_series[series_key][date_str]["sum"] += entry.price
            price_series[series_key][date_str]["count"] += 1

        sorted_dates = sorted(list(all_dates))
        colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"]
        datasets = []

        for idx, (series_name, date_data) in enumerate(price_series.items()):
            series_data = []
            for date in sorted_dates:
                if date in date_data:
                    avg_price = date_data[date]["sum"] / date_data[date]["count"]
                    series_data.append(round(avg_price, 2))
                else:
                    series_data.append(None)

            datasets.append(
                {
                    "label": series_name,
                    "data": series_data,
                    "borderColor": colors[idx % len(colors)],
                    "backgroundColor": colors[idx % len(colors)],
                }
            )

        # Prepare the data to return
        result = {"labels": sorted_dates, "datasets": datasets}

        # Cache the result for future use
        cache.set(cache_key, result)

        del data, price_series, all_dates
        gc.collect()

        return jsonify(result)

    except Exception as e:
        app.logger.error(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500




#  route for the shipping point price
@app.route("/api/shipping_point_price", methods=["GET"])
# @jwt_required()
def shipping_point_price():
    try:
        # Fetch parameters from the frontend
        commodities = request.args.get("commodities", "").split(",")
        regions = request.args.get("regions", "").split(",")
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        source = request.args.get("source")
        avg_commodities = (
            request.args.get("averageCommodities", "false").lower() == "true"
        )
        avg_regions = request.args.get("averageRegions", "false").lower() == "true"

        # Debug: Log received parameters
        app.logger.info(f"Commodities: {commodities}")
        app.logger.info(f"Regions: {regions}")
        app.logger.info(f"Start Date: {start_date}, End Date: {end_date}")
        app.logger.info(f"Source: {source}")
        app.logger.info(f"Avg Commodities: {avg_commodities}, Avg Regions: {avg_regions}")

        # Convert dates
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")

        # Calculate day of year for both dates
        start_day = start_dt.timetuple().tm_yday
        end_day = end_dt.timetuple().tm_yday

        # Debug: Log date range
        app.logger.info(f"Start Day: {start_day}, End Day: {end_day}")

        # Query the database with proper date filtering
        query = ShippingPriceData.query.filter(
            ShippingPriceData.commodity.in_(commodities),
            func.upper(ShippingPriceData.region_name).in_(
                [region.upper() for region in regions]
            ),
            ShippingPriceData.source == source,
        )

        # Add year-specific conditions
        if start_dt.year == end_dt.year:
            query = query.filter(
                ShippingPriceData.year == start_dt.year,
                ShippingPriceData.day.between(start_day, end_day),
            )
        else:
            query = query.filter(
                or_(
                    and_(ShippingPriceData.year == start_dt.year, ShippingPriceData.day >= start_day),
                    and_(ShippingPriceData.year == end_dt.year, ShippingPriceData.day <= end_day),
                    and_(ShippingPriceData.year > start_dt.year, ShippingPriceData.year < end_dt.year),
                )
            )

        query = query.order_by(ShippingPriceData.year.asc(), ShippingPriceData.day.asc())
        data = query.all()

        # Debug: Log raw query results
        app.logger.info(f"Query Results: {len(data)} records fetched.")

        if not data:
            return jsonify({"labels": [], "datasets": []}), 200

        # Process data with dates we actually have
        price_series = {}
        all_dates = set()

        # Group data based on averaging preferences
        for entry in data:
            entry_date = datetime(entry.year, 1, 1) + timedelta(days=entry.day - 1)

            if entry_date < start_dt or entry_date > end_dt:
                continue

            date_str = entry_date.strftime("%Y-%m-%d")
            all_dates.add(date_str)

            if avg_commodities and avg_regions:
                series_key = "Average Price"
            elif avg_commodities:
                series_key = entry.region_name
            elif avg_regions:
                series_key = entry.commodity
            else:
                series_key = f"{entry.commodity} - {entry.region_name}"

            if series_key not in price_series:
                price_series[series_key] = {}

            if date_str not in price_series[series_key]:
                price_series[series_key][date_str] = {"sum": 0, "count": 0}

            price_series[series_key][date_str]["sum"] += entry.price
            price_series[series_key][date_str]["count"] += 1

        # Debug: Log processed series
        app.logger.info(f"Price Series: {price_series}")

        # Sort dates
        sorted_dates = sorted(list(all_dates))

        # Create datasets for each series
        colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"]
        datasets = []

        for idx, (series_name, date_data) in enumerate(price_series.items()):
            series_data = []
            for date in sorted_dates:
                if date in date_data:
                    avg_price = date_data[date]["sum"] / date_data[date]["count"]
                    series_data.append(round(avg_price, 2))
                else:
                    series_data.append(None)

            datasets.append(
                {
                    "label": series_name,
                    "data": series_data,
                    "borderColor": colors[idx % len(colors)],
                    "backgroundColor": colors[idx % len(colors)],
                }
            )

        # Cleanup
        del data, price_series, all_dates
        gc.collect()

        # Debug: Log datasets
        app.logger.info(f"Datasets: {datasets}")

        return jsonify({"labels": sorted_dates, "datasets": datasets})

    except Exception as e:
        app.logger.error(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500




@app.route("/api/download_historical_data", methods=["GET"])
def download_historical_data():
    # Fetch the parameters from the frontend
    commodities = request.args.get("commodities").split(",")
    cities = request.args.get("cities").split(",")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    source = request.args.get("source")

    # Handle special case for "Cubanelles"
    commodities = [
        "Cubanelle" if commodity == "Cubanelles" and source == "USDA" else commodity
        for commodity in commodities
    ]

    # Convert start_date and end_date into year and day of the year
    start_year = datetime.strptime(start_date, "%Y-%m-%d").year
    start_day = datetime.strptime(start_date, "%Y-%m-%d").timetuple().tm_yday
    end_year = datetime.strptime(end_date, "%Y-%m-%d").year
    end_day = datetime.strptime(end_date, "%Y-%m-%d").timetuple().tm_yday

    # Query the PriceData table based on the filters
    query = PriceData.query.filter(
        PriceData.commodity.in_(commodities),
        PriceData.city_name.in_(cities),
        PriceData.source == source,
        or_(
            (PriceData.year == start_year) & (PriceData.day >= start_day),
            (PriceData.year == end_year) & (PriceData.day <= end_day),
            (PriceData.year > start_year) & (PriceData.year < end_year),
        ),
    ).order_by(PriceData.year.asc(), PriceData.day.asc())

    # Fetch the data
    data = query.all()

    # Create an Excel file in memory
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output, {"in_memory": True})
    worksheet = workbook.add_worksheet()

    # Write the headers to the Excel file
    headers = ["Date", "City", "Commodity", "Price"]
    for col_num, header in enumerate(headers):
        worksheet.write(0, col_num, header)

    # Write the data rows to the Excel file
    for row_num, entry in enumerate(data, start=1):
        # Reconstruct the date from year and day
        actual_date = datetime.strptime(f"{entry.year}-{entry.day}", "%Y-%j").strftime(
            "%Y-%m-%d"
        )
        worksheet.write(row_num, 0, actual_date)
        worksheet.write(row_num, 1, entry.city_name)
        worksheet.write(row_num, 2, entry.commodity)
        worksheet.write(row_num, 3, entry.price)

    workbook.close()
    output.seek(0)

    # Send the Excel file as a response
    return send_file(
        output,
        as_attachment=True,
        download_name="historical_data.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


# The API endpoint to serve the stored weather data for a specific location
# helper functions for weather forecasting visualizations


# Helper function to aggregate climatology data across all years for each day of the year
def get_daily_climatology(lat, lon):
    climatology = ClimatologyData.query.filter_by(latitude=lat, longitude=lon).all()

    # Aggregate climatology by day of the year
    daily_climatology = {}
    for c in climatology:
        day_of_year = c.forecast_date.strftime("%m-%d")
        if day_of_year not in daily_climatology:
            daily_climatology[day_of_year] = []
        daily_climatology[day_of_year].append(c.climatology_value)

    # Average climatology data for each day of the year
    avg_daily_climatology = {
        day: np.mean(values) for day, values in daily_climatology.items()
    }
    return avg_daily_climatology


def get_daily_precip_climatology(lat, lon):
    climatology = ClimatologyData.query.filter_by(
        latitude=lat, longitude=lon, variable="PRECIP"
    ).all()

    # Aggregate climatology by day of the year (month and day)
    daily_climatology = {}
    for c in climatology:
        day_of_year = c.forecast_date.strftime("%m-%d")
        if day_of_year not in daily_climatology:
            daily_climatology[day_of_year] = []
        daily_climatology[day_of_year].append(c.climatology_value)

    # Calculate the average for each day of the year
    avg_daily_climatology = {
        day: np.mean(values) for day, values in daily_climatology.items()
    }

    return avg_daily_climatology


# Fetch and aggregate forecast data with min, max, and standard deviation by ensembles
def fetch_forecast_data(lat, lon, start_date, end_date):
    forecasts = (
        WeatherForecast.query.filter_by(latitude=lat, longitude=lon)
        .filter(
            WeatherForecast.forecast_date >= start_date,
            WeatherForecast.forecast_date <= end_date,
        )
        .all()
    )

    # Group forecast data by date and variable
    forecast_data = {"TAVG": {}, "PRECIP": {}}
    for f in forecasts:
        date_key = f.forecast_date.strftime("%Y-%m-%d")
        if date_key not in forecast_data[f.variable]:
            forecast_data[f.variable][date_key] = []
        forecast_data[f.variable][date_key].append(f.forecasted_value)

    # Calculate avg, min, max, and standard deviation for each day
    result = {
        "TAVG": {"dates": [], "avg": [], "min": [], "max": [], "std_dev": []},
        "PRECIP": {"dates": [], "avg": [], "min": [], "max": [], "std_dev": []},
    }

    for variable in forecast_data:
        for date, values in forecast_data[variable].items():
            avg = np.mean(values)
            min_val = np.min(values)
            max_val = np.max(values)
            std_dev = np.std(values)

            result[variable]["dates"].append(date)
            result[variable]["avg"].append(avg)
            result[variable]["min"].append(min_val)
            result[variable]["max"].append(max_val)
            result[variable]["std_dev"].append(std_dev)

    return result


# Calculate the accumulated climatology for the date range (blue line) and ensemble totals (gray bars)
def calculate_accumulated_precipitation(lat, lon, start_date, end_date):
    # Get daily climatology for precipitation
    daily_precip_climatology = get_daily_precip_climatology(lat, lon)

    # Calculate accumulated climatology precipitation
    accumulated_climo_precip = 0
    date = start_date
    while date <= end_date:
        day_of_year = date.strftime("%m-%d")
        if day_of_year in daily_precip_climatology:
            accumulated_climo_precip += daily_precip_climatology[day_of_year]
        date += timedelta(days=1)

    # Query forecasts
    forecasts = (
        WeatherForecast.query.filter_by(latitude=lat, longitude=lon, variable="PRECIP")
        .filter(
            WeatherForecast.forecast_date >= start_date,
            WeatherForecast.forecast_date <= end_date,
        )
        .all()
    )

    if not forecasts:
        print("Warning: No forecast data found for the given range.")
        return {
            "accumulated_climo_precip": accumulated_climo_precip,
            "ensemble_totals": [],
            "probability_below_climo": None,
        }

    # Initialize ensemble totals
    ensemble_totals = {}
    for f in forecasts:
        if f.ensemble_member not in ensemble_totals:
            ensemble_totals[f.ensemble_member] = 0
        ensemble_totals[f.ensemble_member] += f.forecasted_value

    if len(ensemble_totals) == 0:
        print("Warning: No ensemble data available.")
        return {
            "accumulated_climo_precip": accumulated_climo_precip,
            "ensemble_totals": [],
            "probability_below_climo": None,
        }

    # Calculate probability
    ensembles_below_climo = sum(
        1 for total in ensemble_totals.values() if total < accumulated_climo_precip
    )
    probability_below_climo = (ensembles_below_climo / len(ensemble_totals)) * 100

    return {
        "accumulated_climo_precip": accumulated_climo_precip,
        "ensemble_totals": list(ensemble_totals.values()),
        "probability_below_climo": probability_below_climo,
    }

# def calculate_accumulated_precipitation(lat, lon, start_date, end_date):
#     # Get daily climatology for precipitation (average per historical record per day of the year)
#     daily_precip_climatology = get_daily_precip_climatology(lat, lon)

#     # Calculate the accumulated climatology precipitation for the date range
#     accumulated_climo_precip = 0
#     date = start_date
#     while date <= end_date:
#         day_of_year = date.strftime("%m-%d")
#         if day_of_year in daily_precip_climatology:
#             accumulated_climo_precip += daily_precip_climatology[day_of_year]
#             print(accumulated_climo_precip)
#         date += timedelta(days=1)

#     # Calculate accumulated precipitation for each ensemble across the entire date range
#     forecasts = (
#         WeatherForecast.query.filter_by(latitude=lat, longitude=lon, variable="PRECIP")
#         .filter(
#             WeatherForecast.forecast_date >= start_date,
#             WeatherForecast.forecast_date <= end_date,
#         )
#         .all()
#     )

#     # Initialize ensemble totals as a dictionary
#     ensemble_totals = {}
#     for f in forecasts:
#         if f.ensemble_member not in ensemble_totals:
#             ensemble_totals[f.ensemble_member] = 0
#         # Accumulate values for each ensemble member over the entire date range
#         ensemble_totals[f.ensemble_member] += f.forecasted_value

#     # Calculate the probability (percentage) of ensembles predicting lower than climatology
#     ensembles_below_climo = sum(
#         1 for total in ensemble_totals.values() if total < accumulated_climo_precip
#     )
#     probability_below_climo = (ensembles_below_climo / len(ensemble_totals)) * 100

#     return {
#         "accumulated_climo_precip": accumulated_climo_precip,
#         "ensemble_totals": list(ensemble_totals.values()),
#         "probability_below_climo": probability_below_climo,
#     }


# Helper function to aggregate temperature climatology data across all years for each day of the year
def get_daily_tavg_climatology_v2(lat, lon):
    climatology = ClimatologyData.query.filter_by(
        latitude=lat, longitude=lon, variable="TAVG"
    ).all()

    # Aggregate climatology by day of the year (ignoring year)
    daily_climatology = {}
    for c in climatology:
        day_of_year = c.forecast_date.strftime("%m-%d")
        if day_of_year not in daily_climatology:
            daily_climatology[day_of_year] = []
        daily_climatology[day_of_year].append(c.climatology_value)

    # Average climatology data for each day of the year
    avg_daily_climatology = {
        day: np.mean(values) for day, values in daily_climatology.items()
    }
    return avg_daily_climatology


# Helper function to aggregate precipitation climatology data across all years for each day of the year
def get_daily_precip_climatology_v2(lat, lon):
    climatology = ClimatologyData.query.filter_by(
        latitude=lat, longitude=lon, variable="PRECIP"
    ).all()

    # Aggregate climatology by day of the year (ignoring year)
    daily_climatology = {}
    for c in climatology:
        day_of_year = c.forecast_date.strftime("%m-%d")
        if day_of_year not in daily_climatology:
            daily_climatology[day_of_year] = []
        daily_climatology[day_of_year].append(c.climatology_value)

    # Calculate the average for each day of the year
    avg_daily_climatology = {
        day: np.mean(values) for day, values in daily_climatology.items()
    }

    return avg_daily_climatology




# # Main API route: Serve aggregated forecast and climatology data
# @app.route("/api/weather_forecasts", methods=["GET"])
# def api_weather_forecasts():
#     lat = float(request.args.get("lat"))
#     lon = float(request.args.get("lon"))
#     start = request.args.get("start")
#     end = request.args.get("end")

#     # Set default date range if start or end dates are not provided
#     if not start:
#         start_date = datetime.now()
#     else:
#         start_date = datetime.strptime(start, "%Y-%m-%d")

#     if not end:
#         end_date = start_date + timedelta(
#             days=30
#         )  # Default to 30 days from start date if end date is not provided
#     else:
#         end_date = datetime.strptime(end, "%Y-%m-%d")

#     try:
#         # Fetch forecast data with min, max, std_dev for TAVG and PRECIP
#         forecast_data = fetch_forecast_data(lat, lon, start_date, end_date)

#         # Fetch climatology data for temperature and precipitation
#         daily_tavg_climatology = get_daily_tavg_climatology_v2(lat, lon)
#         daily_precip_climatology = get_daily_precip_climatology_v2(lat, lon)

#         # Combine TAVG and PRECIP into daily_climatology
#         daily_climatology = {
#             "TAVG": daily_tavg_climatology,
#             "PRECIP": daily_precip_climatology,
#         }

#         # Calculate accumulated precipitation and ensemble analysis for the selected date range
#         accumulation_data = calculate_accumulated_precipitation(
#             lat, lon, start_date, end_date
#         )

#         # Format response JSON
#         return jsonify(
#             {
#                 "forecast_data": forecast_data,
#                 "daily_climatology": daily_climatology,
#                 "accumulation_data": accumulation_data,
#             }
#         )
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500


@app.route("/api/weather_forecasts", methods=["GET"])
def api_weather_forecasts():
    try:
        lat = float(request.args.get("lat"))
        lon = float(request.args.get("lon"))
        start = request.args.get("start")
        end = request.args.get("end")

        print(f"Request Params - lat: {lat}, lon: {lon}, start: {start}, end: {end}")

        # Set default date range if start or end dates are not provided
        if not start:
            start_date = datetime.now()
        else:
            start_date = datetime.strptime(start, "%Y-%m-%d")

        if not end:
            end_date = start_date + timedelta(days=30)
        else:
            end_date = datetime.strptime(end, "%Y-%m-%d")

        print(f"Date Range - start_date: {start_date}, end_date: {end_date}")

        # Fetch data
        forecast_data = fetch_forecast_data(lat, lon, start_date, end_date)
        print("Forecast Data:", forecast_data)

        daily_tavg_climatology = get_daily_tavg_climatology_v2(lat, lon)
        daily_precip_climatology = get_daily_precip_climatology_v2(lat, lon)

        daily_climatology = {
            "TAVG": daily_tavg_climatology,
            "PRECIP": daily_precip_climatology,
        }
        print("Daily Climatology:", daily_climatology)

        accumulation_data = calculate_accumulated_precipitation(
            lat, lon, start_date, end_date
        )
        print("Accumulation Data:", accumulation_data)

        return jsonify(
            {
                "forecast_data": forecast_data,
                "daily_climatology": daily_climatology,
                "accumulation_data": accumulation_data,
            }
        )
    except Exception as e:
        print("Error in /api/weather_forecasts:", str(e))
        return jsonify({"error": str(e)}), 500



# City list for dropdowns
@app.route("/api/cities", methods=["GET"])
def get_cities():
    cities = [
        {"name": "Sinaloa", "lat": 25.1721, "lon": -107.4795},
        {"name": "Sonora", "lat": 29.2972, "lon": -110.3309},
        {"name": "Ensenada", "lat": 31.86613056, "lon": -116.59971944},
        {"name": "Baja Mx", "lat": 28.0444, "lon": -115.2062},
        {"name": "Culican", "lat": 24.8091, "lon": -107.3940},
        {"name": "Hendersonville, NC", "lat": 35.3187, "lon": -82.4610},
        {"name": "Cameron SC", "lat": 33.5568, "lon": -80.7151},
        {"name": "Adel, Ga", "lat": 31.13633333, "lon": -83.42216389},
        {"name": "Lake Park Ga", "lat": 30.6844, "lon": -83.1849},
        {"name": "Bowling Green Fl", "lat": 27.6386, "lon": -81.8265},
        {"name": "Immokalee Fl", "lat": 26.4187, "lon": -81.4173},
        {"name": "Palm Beach County, FL", "lat": 26.7153, "lon": -80.0534},
        {"name": "Vineland NJ", "lat": 39.4802, "lon": -75.0138},
        {"name": "Sodus, Michigan", "lat": 42.0086, "lon": -86.3614},
    ]
    return jsonify(cities)


# Forecast Calculator
def calculate_forecasted_price(variety, start_date, forecast_date):
    # Step 1: Determine the season of the forecast date
    season = determine_season_for_dashboard(forecast_date)

    # Step 2: Convert start date to year and day of the year
    start_year = start_date.year
    start_day = start_date.timetuple().tm_yday

    # Step 3: Query the PriceData for the given variety and season, starting from the start_date
    historical_data = (
        db.session.query(PriceData.price)
        .filter(
            PriceData.commodity == variety,          # Match the commodity (variety)
            PriceData.season == season,                # Match the season
            PriceData.year >= start_year,              # Consider data from the start year onward
            PriceData.day >= start_day,                # Ensure data is after the start date in the year
            PriceData.source.in_(["USDA", "Historical"])  # Data can be from USDA or Historical sources
        )
        .all()
    )

    # Step 4: Calculate the average price from the historical data
    if historical_data:
        total_price = sum(entry.price for entry in historical_data)
        average_price = total_price / len(historical_data)
    else:
        average_price = 0.0

    return average_price




@app.route("/api/calculate_forecast", methods=["POST"])
def calculate_forecast():
    data = request.json

    # Required form fields
    variety = data.get("variety")
    start_date_str = data.get("start_date")
    forecast_date_str = data.get("forecast_date")
    yield_per_acre = data.get("yield_per_acre")

    # NEW cost fields
    cost_per_acre = data.get("cost_per_acre", 0)
    harvest_cost_per_box = data.get("harvest_cost_per_box", 0)
    cost_of_box = data.get("cost_of_box", 0)
    boxes_bonus_per_yield = data.get("boxes_bonus_per_yield", 0)

    # Validate the main required fields
    if not all([variety, start_date_str, forecast_date_str, yield_per_acre]):
        return jsonify({"error": "All form fields are required"}), 400

    try:
        # Convert to correct data types
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
        forecast_date = datetime.strptime(forecast_date_str, "%Y-%m-%d")
        yield_per_acre = float(yield_per_acre)

        # Convert the cost fields to float; default to 0 if missing
        cost_per_acre = float(cost_per_acre) if cost_per_acre else 0
        harvest_cost_per_box = float(harvest_cost_per_box) if harvest_cost_per_box else 0
        cost_of_box = float(cost_of_box) if cost_of_box else 0
        boxes_bonus_per_yield = float(boxes_bonus_per_yield) if boxes_bonus_per_yield else 0

    except ValueError:
        return jsonify({"error": "Invalid date or numeric format."}), 400

    # 1) Calculate the forecasted price (already have your helper function):
    forecasted_price = calculate_forecasted_price(variety, start_date, forecast_date)
    revenue_per_acre = forecasted_price * yield_per_acre

    # 2) Determine the season
    season = determine_season_for_dashboard(forecast_date)

    # 3) Calculate total costs:
    # cost_per_acre + (harvest_cost_per_box * yield_per_acre) + (cost_of_box * yield_per_acre) + (boxes_bonus_per_yield)
    total_costs = cost_per_acre  + (harvest_cost_per_box * yield_per_acre)  + (cost_of_box * yield_per_acre)  + (boxes_bonus_per_yield)

    # 4) Subtract total costs from revenue
    revenue_after_costs = revenue_per_acre - total_costs


        # Add the debug print here:
    print("DEBUG: forecasted_price =", forecasted_price,
          " revenue_per_acre_after_costings =", revenue_after_costs)


    return jsonify({
        "forecasted_price": round(forecasted_price, 2),
        "revenue_per_acre": round(revenue_per_acre, 2),
        "revenue_per_acre_after_costings": round(revenue_after_costs, 2),
        "season": season,
    })



# Endpoint to get price averages with normalized commodity names
@app.route('/api/price_averages', methods=['GET'])
def get_price_averages():
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        source = request.args.get('source', 'both').lower()
        city = request.args.get('city', 'All cities')

        if not start_date or not end_date:
            return jsonify({'error': 'Both start and end dates are required'}), 400

        # Convert dates to year/day-of-year
        start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
        end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
        start_year, start_day = start_date_obj.year, start_date_obj.timetuple().tm_yday
        end_year, end_day = end_date_obj.year, end_date_obj.timetuple().tm_yday

        # Mapping USDA city names to normalized names
        usda_city_mapping = {
            "BALTIMORE": "Baltimore",
            "BOSTON": "Boston",
            "CHICAGO": "Chicago",
            "COLUMBIA": "Columbia",
            "LOS ANGELES": "Los Angeles",
            "MIAMI": "Miami",
            "NEW YORK": "New York",
            "PHILADELPHIA": "Philadelphia",
        }

        # Normalize city names using a SQLAlchemy CASE expression
        normalized_city = case(
            *[(PriceData.city_name == key, value) for key, value in usda_city_mapping.items()],
            else_=PriceData.city_name
        ).label("normalized_city")

        # Normalize commodity by trimming whitespace and converting to lowercase
        normalized_commodity = func.trim(func.lower(PriceData.commodity)).label("normalized_commodity")

        # Build the query filtering by date range
        query = db.session.query(
            normalized_city,
            normalized_commodity,
            PriceData.source,
            func.avg(PriceData.price).label('avg_price')
        ).filter(
            or_(
                and_(PriceData.year == start_year, PriceData.day >= start_day),
                and_(PriceData.year == end_year, PriceData.day <= end_day)
            )
        )

        # Apply source filter if specified
        if source == 'usda':
            query = query.filter(PriceData.source == "USDA")
        elif source == 'produceiq':
            query = query.filter(PriceData.source == "ProduceIQ")

        # Apply city filter if not "All cities"
        if city.lower() != 'all cities':
            query = query.filter(normalized_city == city)

        # Group and order by normalized city, normalized commodity, and source
        query = query.group_by(normalized_city, normalized_commodity, PriceData.source)
        query = query.order_by(normalized_city, normalized_commodity, PriceData.source)

        results = query.all()

        # Format the results
        price_averages = [
            {
                'city_name': row.normalized_city,
                'commodity': row.normalized_commodity,
                'source': row.source,
                'avg_price': round(row.avg_price, 2)
            }
            for row in results
        ]

        return jsonify({'price_averages': price_averages}), 200

    except Exception as e:
        app.logger.error(f'Error fetching price averages: {str(e)}')
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500



# API FOR Forecast visual
@app.route("/api/seasonal_prices", methods=["GET"])
# @jwt_required()
def get_seasonal_prices():
    variety = request.args.get("variety")

    # Check if variety is missing
    if not variety:
        return jsonify({"error": "Missing variety"}), 400

    # Initialize seasonal_prices dictionary to store prices for each season
    seasonal_prices = {"Spring": 0, "Summer": 0, "Autumn": 0, "Winter": 0}

    # Define the start date as January 1st, 2018
    start_date = datetime(2018, 1, 1)

    # Loop through each season and calculate the average price
    for season in seasonal_prices.keys():
        # Query data for the given variety and season, starting from the start_date
        historical_data = (
            db.session.query(PriceData.price)
            .filter(
                PriceData.commodity == variety,  # Match the commodity (variety)
                PriceData.season == season,  # Match the season
                PriceData.year >= start_date.year,  # Consider data from 2018 onward
                PriceData.day
                >= start_date.timetuple().tm_yday,  # Ensure data is after the start date
                PriceData.source.in_(
                    ["USDA", "Historical"]
                ),  # Data can be from USDA or Historical sources
            )
            .all()
        )

        # Calculate the average price from the historical data
        if historical_data:
            total_price = sum([entry.price for entry in historical_data])
            average_price = total_price / len(historical_data)
            seasonal_prices[season] = round(
                average_price, 2
            )  # Store the average price for this season
        else:
            seasonal_prices[season] = 0.0

    return jsonify(seasonal_prices)


@app.route("/api/sales_seasonal_prices", methods=["GET"])
def get_sales_seasonal_prices():
    # Fetch request parameters
    commodities_str = request.args.get("commodities")
    cities_str = request.args.get("cities")
    start_date_str = request.args.get("start_date")
    end_date_str = request.args.get("end_date")

    # Log received parameters
    app.logger.info(f"Received request with commodities: {commodities_str}, cities: {cities_str}, start_date: {start_date_str}, end_date: {end_date_str}")

    # Convert commodities and cities to lists if provided, else use all
    if commodities_str:
        commodities = commodities_str.split(",")
        commodities = [
            "Cubanelle" if commodity == "Cubanelles" else commodity
            for commodity in commodities
        ]
    else:
        commodities = [
            row[0] for row in db.session.query(PriceData.commodity).distinct().all()
        ]

    if cities_str:
        cities = cities_str.split(",")
       
    else:
        cities = [
            row[0] for row in db.session.query(PriceData.city_name).distinct().all()
        ]

    # Log converted commodities and cities
    app.logger.info(f"Commodities: {commodities}")
    app.logger.info(f"Cities: {cities}")

    # Convert start_date and end_date to datetime objects if provided
    start_date = None
    end_date = None
    if start_date_str and end_date_str:
        try:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d")
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

        if start_date > end_date:
            return jsonify({"error": "Start date cannot be after end date."}), 400

    # Log the dates
    app.logger.info(f"Start Date: {start_date}, End Date: {end_date}")

    # Prepare the query
    query = db.session.query(PriceData.season, PriceData.price).filter(
        PriceData.commodity.in_(commodities),
        func.lower(PriceData.city_name).in_([city.lower() for city in cities]),
        PriceData.source.in_(["USDA", "Historical"]),
    )

    # Apply date filters if both start_date and end_date are provided
    if start_date and end_date:
        start_year = start_date.year
        start_day = start_date.timetuple().tm_yday
        end_year = end_date.year
        end_day = end_date.timetuple().tm_yday

        # Log the filter conditions for date range
        app.logger.info(f"Query Filters: Commodities: {commodities}, Cities: {cities}, Start Year: {start_year}, End Year: {end_year}, Start Day: {start_day}, End Day: {end_day}")

        if start_year == end_year:
            query = query.filter(
                PriceData.year == start_year,
                PriceData.day >= start_day,
                PriceData.day <= end_day,
            )
        else:
            query = query.filter(
                or_(
                    and_(PriceData.year == start_year, PriceData.day >= start_day),
                    and_(PriceData.year == end_year, PriceData.day <= end_day),
                    and_(PriceData.year > start_year, PriceData.year < end_year),
                )
            )

    # Retrieve data - Ensure this happens in the proper order
    try:
        data = query.all()
        app.logger.info(f"Retrieved data: {data}")
    except Exception as e:
        app.logger.error(f"Error during query execution: {str(e)}")
        return jsonify({"error": "Error retrieving data from the database."}), 500

    # Calculate average prices per season
    seasonal_prices = {}
    season_price_data = {}

    for season, price in data:
        if season not in season_price_data:
            season_price_data[season] = []
        season_price_data[season].append(price)

    # Log the seasonal price data
    app.logger.info(f"Seasonal price data: {season_price_data}")

    # Calculate average price for each season
    for season in ["Spring", "Summer", "Autumn", "Winter"]:
        prices = season_price_data.get(season, [])
        if prices:
            average_price = sum(prices) / len(prices)
            seasonal_prices[season] = round(average_price, 2)
        else:
            seasonal_prices[season] = 0.0

    # Log final seasonal prices
    app.logger.info(f"Final seasonal prices: {seasonal_prices}")

    return jsonify(seasonal_prices)


# TEST ROUTE
@app.route("/api/trigger_usda_fetch", methods=["GET"])
def trigger_usda_fetch():
    fetch_usda_daily_data()
    fetch_shipping_point_data()
    fetch_daily_data()
    return "USDA Data Fetch Triggered"


# Function to check file extension
def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# Route for uploading historical data automatically on route trigger
@app.route("/api/upload_historical", methods=["GET"])
def upload_historical():
    try:
        # Log when the upload process starts
        logging.info("Starting upload of historical data from 'data/' directory")

        # Loop through all CSV files in the 'data/' directory
        for csv_file in os.listdir(CSV_DIRECTORY):
            # Ensure we're only processing CSV files
            if csv_file.endswith(".csv"):
                commodity = os.path.splitext(csv_file)[
                    0
                ]  # Commodity name is the filename without extension
                file_path = os.path.join(CSV_DIRECTORY, csv_file)

                logging.info(f"Processing file: {csv_file}")

                # Open the CSV file and insert data into the PriceData table
                with open(file_path, newline="", encoding="utf-8") as csvfile:
                    reader = csv.DictReader(csvfile)

                    for row in reader:
                        city_name = row["CityName"]
                        year = int(row["Year"])
                        day = int(row["Day"])
                        price_str = row["Price"]

                        # Check if the price is empty or not a valid float
                        if price_str.strip() == "":
                            logging.warning(
                                f"Skipping row with empty price for {city_name} on day {day} in year {year}"
                            )
                            continue

                        try:
                            price = float(price_str)
                        except ValueError:
                            logging.error(
                                f"Invalid price value: {price_str} for {city_name} on day {day} in year {year}"
                            )
                            continue

                        source = "ProduceIQ"

                        # Correct the season logic using proper year-day conversion
                        try:
                            report_date = datetime.strptime(
                                f"{year}-{day}", "%Y-%j"
                            )  # %Y-%j converts year and day of year
                            season = determine_season(
                                report_date.strftime("%m/%d/%Y")
                            )  # Convert date to month/day/year format
                        except Exception as e:
                            logging.error(
                                f"Error converting year-day to date for {year}-{day}: {str(e)}"
                            )
                            continue

                        # Insert the data into the PriceData table
                        new_price_data = PriceData(
                            city_name=city_name,
                            commodity=commodity,
                            year=year,
                            day=day,
                            price=price,
                            source=source,
                            season=season,
                        )
                        db.session.add(new_price_data)

                    # Commit after processing each file
                    db.session.commit()
                    logging.info(
                        f"Data for {commodity} uploaded successfully from {csv_file}"
                    )

        logging.info("Historical data upload process completed")
        return "Historical data upload process completed", 200

    except Exception as e:
        logging.error(f"Error during upload: {str(e)}")
        return f"Error during upload: {str(e)}", 500




from sqlalchemy.sql import text  # Import `text` from SQLAlchemy
        
import plotly.graph_objects as go
from flask import jsonify


# voilin plot for terminal data

@app.route("/api/terminal_price_violin", methods=["GET"])
def terminal_price_violin():
    try:
        app.logger.info("Generating terminal violin plots for USDA and ProduceIQ without downsampling...")

        # Get the time frame from query parameters (default to '7d')
        time_frame = request.args.get("timeFrame", "7d")

        # Map timeFrame to PostgreSQL-compatible intervals
        time_intervals = {
            "3d": "3 days",
            "7d": "7 days",
            "1m": "1 month",
            "3m": "3 months",
            "1y": "1 year",
        }

        # Get the corresponding PostgreSQL interval for the time frame
        postgres_interval = time_intervals.get(time_frame.lower(), "7 days")

        # PostgreSQL-compatible query to fetch data filtered by source and time range
        query = text(f"""
            SELECT commodity, price, source
            FROM price_data
            WHERE source IN ('USDA', 'ProduceIQ')
            AND make_date(year, 1, 1) + (day - 1) * INTERVAL '1 day' >= NOW() - INTERVAL '{postgres_interval}'
            AND price > 2
        """)
        result = db.session.execute(query).fetchall()

        # Group data by source and commodity
        grouped_data = {"USDA": {}, "ProduceIQ": {}}
        for row in result:
            commodity, price, source = row
            if commodity not in grouped_data[source]:
                grouped_data[source][commodity] = []
            grouped_data[source][commodity].append(price)

        # Create violin traces for USDA
        usda_traces = [
            go.Violin(
                y=prices,
                name=commodity,
                box_visible=True,
                meanline_visible=True,
                marker_color='blue'  # Color for USDA
            )
            for commodity, prices in grouped_data["USDA"].items()
        ]

        # Create violin traces for ProduceIQ
        produceiq_traces = [
            go.Violin(
                y=prices,
                name=commodity,
                box_visible=True,
                meanline_visible=True,
                marker_color='green'  # Color for ProduceIQ
            )
            for commodity, prices in grouped_data["ProduceIQ"].items()
        ]

        # Layout for USDA
        usda_layout = {
            "title": {"text": "USDA Terminal Price Distribution by Commodity", "font": {"size": 16, "weight": "bold"}},
            "xaxis": {"title": {"text": "Commodity", "font": {"size": 14, "weight": "bold"}}, "automargin": True},
            "yaxis": {"title": {"text": "Price", "font": {"size": 14, "weight": "bold"}}, "zeroline": True, "automargin": True},
            "height": 500,
            "width": 700,
            "showlegend": False,
            "plot_bgcolor": "#f0f8ff",
            "paper_bgcolor": "white",
        }

        # Layout for ProduceIQ
        produceiq_layout = {
            "title": {"text": "ProduceIQ Terminal Price Distribution by Commodity", "font": {"size": 16, "weight": "bold"}},
            "xaxis": {"title": {"text": "Commodity", "font": {"size": 14, "weight": "bold"}}, "automargin": True},
            "yaxis": {"title": {"text": "Price", "font": {"size": 14, "weight": "bold"}}, "automargin": True},
            "height": 500,
            "width": 700,
            "showlegend": False,
            "plot_bgcolor": "#f0f8ff",
            "paper_bgcolor": "white",
        }

        # Convert traces to JSON serializable format
        usda_traces_json = [trace.to_plotly_json() for trace in usda_traces]
        produceiq_traces_json = [trace.to_plotly_json() for trace in produceiq_traces]

        # Return JSON response containing separate charts for USDA and ProduceIQ
        return jsonify({
            "usda": {"data": usda_traces_json, "layout": usda_layout},
            "produceiq": {"data": produceiq_traces_json, "layout": produceiq_layout}
        }), 200

    except Exception as e:
        app.logger.error(f"Error generating terminal violin plots: {str(e)}")
        return jsonify({"error": "Failed to generate terminal violin plots"}), 500




@app.route("/api/shipping_price_violin", methods=["GET"])
def shipping_price_violin():
    try:
        app.logger.info("Fetching data for shipping violin plot...")

        # Get the time frame from query parameters (default to '7d')
        time_frame = request.args.get("timeFrame", "7d")

        # Map timeFrame to PostgreSQL-compatible interval
        time_intervals = {
            "3d": "'3 days'",
            "7d": "'7 days'",
            "1m": "'1 month'",
            "3m": "'3 months'",
            "1y": "'1 year'",
        }

        # Get the corresponding PostgreSQL interval for the time frame
        postgres_interval = time_intervals.get(time_frame.lower(), "'7 days'")

        # SQL query to fetch data filtered by source and time range
        query = text(f"""
    SELECT commodity, price
    FROM shipping_price_data
    WHERE source = 'ProduceIQ'
      AND TO_DATE(year || '-01-01', 'YYYY-MM-DD') + (day - 1) * interval '1 day' >= NOW() - INTERVAL {postgres_interval}
      AND price > 1  
        """)

        result = db.session.execute(query).fetchall()

        # Group data by commodity
        data = {}
        for row in result:
            commodity = row[0]  # Commodity (varietyName)
            price = row[1]  # Price
            if commodity not in data:
                data[commodity] = []
            data[commodity].append(price)

        # Create violin traces for each commodity
        traces = []
        for commodity, prices in data.items():
            traces.append(
                go.Violin(
                    y=prices,
                    name=commodity,
                    box_visible=True,
                    meanline_visible=True,
                    marker_color='green',  # Custom color

                )
            )

        # Create the layout for the chart
        layout = {
            "title": {"text": "Shipping Price Distribution by Commodity", "font": {"size": 16, "weight": "bold"}},
            "xaxis": {"title": {"text": "Commodity", "font": {"size": 14, "weight": "bold"}}, "automargin": True},
            "yaxis": {"title": {"text": "Shipping Price", "font": {"size": 14, "weight": "bold"}}, "automargin": True},
            "height": 500,
            "width": 700,
            "showlegend": False,
            "plot_bgcolor": "#f0f8ff",
            "paper_bgcolor": "white",
        }

        # Return the chart data and layout as JSON
        return jsonify({"data": [trace.to_plotly_json() for trace in traces], "layout": layout}), 200

    except Exception as e:
        app.logger.error(f"Error generating shipping violin plot: {str(e)}")
        return jsonify({"error": "Failed to generate shipping violin plot"}), 500




# terminal empricial probability chart fetch

from sqlalchemy import func

@app.route('/api/terminal_empricial_probability', methods=['GET'])
def get_terminal_empricial_probability():
    try:
        # Query to get mean and standard deviation directly from the database
        data = db.session.query(
            PriceData.commodity,
            func.avg(PriceData.price).label('avg_price'),
            func.stddev(PriceData.price).label('std_dev_price')
        ).filter(PriceData.source == 'USDA') \
         .group_by(PriceData.commodity).all()

        if not data:
            return jsonify([])

        # Prepare chart data
        charts = []

        for commodity, avg_price, std_dev_price in data:
            # Create histogram (you may still need to calculate this in memory)
            prices = db.session.query(PriceData.price).filter(PriceData.commodity == commodity, PriceData.source == 'USDA').all()
            prices = [price[0] for price in prices]  # Extract price values from tuples

            hist, bin_edges = np.histogram(prices, bins=50)

            # Create traces for the histogram, mean, and standard deviation
            histogram_trace = go.Bar(
                x=bin_edges[:-1].tolist(), 
                y=hist.tolist(),
                name=f"{commodity} Histogram",
                marker_color="#636EFA"
            )
            mean_trace = go.Scatter(
                x=[avg_price, avg_price], 
                y=[0, max(hist)], 
                mode="lines", 
                line=dict(color="red", dash="dash"), 
                name=f"{commodity} Mean"
            )
            std_dev_trace = go.Scatter(
                x=[avg_price - std_dev_price, avg_price + std_dev_price], 
                y=[0, 0], 
                mode="markers", 
                marker=dict(color="blue", size=8, symbol="cross"), 
                name=f"{commodity} Std Dev"
            )

            # Prepare layout
            layout = {
                "title": f"{commodity} Price Distribution",
                "xaxis": {"title": "Price", "automargin": True},
                "yaxis": {"title": "Frequency", "automargin": True},
                "height": 400,
                "width": 370,
                "showlegend": False,
                "plot_bgcolor": "#f0f8ff",
                "paper_bgcolor": "white",
            }

            # Append chart JSON
            charts.append({
                "commodity": commodity,
                "data": [histogram_trace.to_plotly_json(), mean_trace.to_plotly_json(), std_dev_trace.to_plotly_json()],
                "layout": layout,
            })

        return jsonify(charts), 200

    except Exception as e:
        import traceback
        error_message = traceback.format_exc()
        print("Error Traceback:", error_message)
        return jsonify({"error": str(e)}), 500







# shipping empricial probability chart fetch ProduceIQ
@app.route('/api/shipping_empricial_probability', methods=['GET'])
def get_shipping_empricial_probability():
    try:
        # Query the database
        data = db.session.query(ShippingPriceData.commodity, ShippingPriceData.price).filter(ShippingPriceData.source == 'ProduceIQ').all()
        if not data:
            return jsonify([])

        # Convert data to DataFrame
        df = pd.DataFrame(data, columns=['commodity', 'price'])
        df['price'] = pd.to_numeric(df['price'], errors='coerce')
        df = df.dropna(subset=['price'])

        # Prepare chart data
        charts = []
        grouped = df.groupby('commodity')

        for commodity, group in grouped:
            prices = group['price'].values
            if len(prices) == 0:
                continue

            mean = prices.mean()
            std_dev = prices.std()

            # Create histogram and traces
            hist, bin_edges = np.histogram(prices, bins=50)
            histogram_trace = go.Bar(x=bin_edges[:-1].tolist(), y=hist.tolist(), name=f"{commodity} Histogram", marker_color="green")
            mean_trace = go.Scatter(x=[mean, mean], y=[0, max(hist)], mode="lines", line=dict(color="red", dash="dash"), name=f"{commodity} Mean")
            std_dev_trace = go.Scatter(x=[mean - std_dev, mean + std_dev], y=[0, 0], mode="markers", marker=dict(color="green", size=8, symbol="cross"), name=f"{commodity} Std Dev")

            # Prepare layout
            layout = {
                "title": f"{commodity} Price Distribution",
                "xaxis": {"title": "Price", "automargin": True},
                "yaxis": {"title": "Frequency", "automargin": True},
                "height": 400,
                "width": 370,
                "showlegend": False,
                "plot_bgcolor": "#f0f8ff",
                "paper_bgcolor": "white",
            }

            # Append chart JSON
            charts.append({
                "commodity": commodity,
                "data": [histogram_trace.to_plotly_json(), mean_trace.to_plotly_json(), std_dev_trace.to_plotly_json()],
                "layout": layout,
            })

        return jsonify(charts), 200

    except Exception as e:
        import traceback
        error_message = traceback.format_exc()
        print("Error Traceback:", error_message)
        return jsonify({"error": str(e)}), 500






@app.route("/api/terminal_correlation", methods=["GET"])
def get_terminal_correlation():
    try:
        # Query data with proper filtering
        source = request.args.get('source', 'ProduceIQ')  # Default to USDA
        query = text("""
            SELECT 
                commodity,
                price,
                DATE(CONCAT(year, '-01-01')::date + (day - 1) * INTERVAL '1 day') as date
            FROM price_data
            WHERE source = :source
            ORDER BY date, commodity
        """)
        
        result = db.session.execute(query, {'source': source}).fetchall()
        print(f"Query result length: {len(result)}")  # Debugging log

        if not result:
            return jsonify({"error": "No data found"}), 404

        # Create DataFrame and process data
        df = pd.DataFrame(result, columns=['commodity', 'price', 'date'])
        print(f"Initial DataFrame shape: {df.shape}")  # Debugging log

        # Ensure 'date' column is treated as datetime
        df['date'] = pd.to_datetime(df['date'])

        # Handle duplicate (date, commodity) entries by aggregating
        df = df.groupby(['date', 'commodity'], as_index=False)['price'].mean()
        print(f"DataFrame shape after grouping: {df.shape}")  # Debugging log

        # Create pivot table
        pivot_df = df.pivot(index='date', columns='commodity', values='price')
        print(f"Pivot table shape: {pivot_df.shape}")  # Debugging log

        del df
        import gc
        gc.collect()

        # Forward fill missing values before calculating percentage change
        pivot_df = pivot_df.ffill(limit=3)  # Forward fill up to 3 missing values
        returns = pivot_df.pct_change()  # Calculate percentage change
        print(f"Returns DataFrame shape before filtering: {returns.shape}")  # Debugging log

        # Remove columns with too many missing values
        min_valid_ratio = 0.3  # At least 30% valid data
        valid_columns = returns.columns[returns.count() > len(returns) * min_valid_ratio]
        returns = returns[valid_columns]
        print(f"Returns DataFrame shape after filtering: {returns.shape}")  # Debugging log

        del pivot_df
        gc.collect()

        # Calculate correlation matrix
        correlation_matrix = returns.corr(method='pearson')
        correlation_matrix.fillna(0, inplace=True)
        print(f"Correlation matrix shape: {correlation_matrix.shape}")  # Debugging log

        # Prepare data for plotting
        labels = correlation_matrix.columns.tolist()
        z_values = correlation_matrix.values.tolist()

        # Reverse the order of y-axis labels and rows in z_values
        reversed_labels = labels[::-1]  # Reverse the y-axis labels
        reversed_z_values = z_values[::-1]  # Reverse the rows of the correlation matrix

        # Create annotations dynamically for reversed labels and z_values
        annotations = [
            {
                "x": labels[col],
                "y": reversed_labels[row],  # Adjust for reversed y-axis
                "text": f"{reversed_z_values[row][col]:.2f}",  # Use reversed data
                "showarrow": False,
                "font": {
                    "color": "white",
                    "size": 10,
                },
            }
            for row in range(len(reversed_labels))
            for col in range(len(labels))
        ]

        # Prepare Plotly chart
        chart = {
            "data": [
                {
                    "z": reversed_z_values,  # Use reversed rows for heatmap
                    "x": labels,
                    "y": reversed_labels,  # Use reversed y-axis labels
                    "type": "heatmap",
                    "colorscale": "CoolWarm",
                    "showscale": True,
                    "text": [[f"{val:.2f}" for val in row] for row in reversed_z_values],
                    "hoverinfo": "text",
                }
            ],
            "layout": {
                "title": "Correlation Matrix of Terminal Market Prices",
                "xaxis": {
                    "title": "Commodities",
                    "tickangle": -45,
                    "automargin": True,
                },
                "yaxis": {
                    "title": "Commodities",
                    "automargin": True,
                },
                "height": 600,
                "width": 600,
                "annotations": annotations,
            },
        }

        # Add summary statistics
        summary_stats = {
            "total_records": len(returns),  # Updated to use 'returns'
            "unique_commodities": len(labels),
            "date_range": {
                "start": returns.index.min().strftime('%Y-%m-%d'),
                "end": returns.index.max().strftime('%Y-%m-%d'),
            },
            "average_correlation": float(correlation_matrix.mean().mean()),
        }

        print(f"Final chart labels: {len(labels)}, annotations: {len(annotations)}")  # Debugging log

        return jsonify({"chart": chart, "stats": summary_stats}), 200

    except Exception as e:
        app.logger.error(f"Error generating terminal correlation chart: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500








@app.route("/api/shipping_correlation", methods=["GET"])
def get_shipping_correlation():
    try:
        # Query data with proper filtering
        source = request.args.get('source', 'ProduceIQ')  # Default to USDA
        query = text("""
            SELECT 
                commodity,
                price,
                DATE(CONCAT(year, '-01-01')::date + (day - 1) * INTERVAL '1 day') as date
            FROM shipping_price_data
            WHERE source = :source
            ORDER BY date, commodity
        """)
        
        result = db.session.execute(query, {'source': source}).fetchall()
        print(f"Query result length: {len(result)}")  # Debugging log

        if not result:
            return jsonify({"error": "No data found"}), 404

        # Create DataFrame and process data
        df = pd.DataFrame(result, columns=['commodity', 'price', 'date'])
        print(f"Initial DataFrame shape: {df.shape}")  # Debugging log

        # Ensure 'date' column is treated as datetime
        df['date'] = pd.to_datetime(df['date'])

        # Handle duplicate (date, commodity) entries by aggregating
        df = df.groupby(['date', 'commodity'], as_index=False)['price'].mean()
        print(f"DataFrame shape after grouping: {df.shape}")  # Debugging log

        # Create pivot table
        pivot_df = df.pivot(index='date', columns='commodity', values='price')
        print(f"Pivot table shape: {pivot_df.shape}")  # Debugging log

        del df
        import gc
        gc.collect()

        # Calculate returns and handle missing values
        pivot_df = pivot_df.ffill(limit=3)  # Forward fill missing values up to 3 days
        returns = pivot_df.pct_change()  # Calculate percentage change
        print(f"Returns DataFrame shape before filtering: {returns.shape}")  # Debugging log

        # Remove columns with too many missing values
        min_valid_ratio = 0.3  # At least 30% valid data
        valid_columns = returns.columns[returns.count() > len(returns) * min_valid_ratio]
        returns = returns[valid_columns]
        print(f"Returns DataFrame shape after filtering: {returns.shape}")  # Debugging log

        del pivot_df
        gc.collect()

        # Calculate correlation matrix
        correlation_matrix = returns.corr(method='pearson')
        correlation_matrix.fillna(0, inplace=True)
        print(f"Correlation matrix shape: {correlation_matrix.shape}")  # Debugging log

        # Prepare data for plotting
        labels = correlation_matrix.columns.tolist()
        z_values = correlation_matrix.values.tolist()

        # Reverse the order of y-axis labels and rows in z_values
        reversed_labels = labels[::-1]  # Reverse the y-axis labels
        reversed_z_values = z_values[::-1]  # Reverse the rows of the correlation matrix

        # Create annotations dynamically for reversed labels and z_values
        annotations = [
            {
                "x": labels[col],
                "y": reversed_labels[row],  # Adjust for reversed y-axis
                "text": f"{reversed_z_values[row][col]:.2f}",  # Use reversed data
                "showarrow": False,
                "font": {
                    "color": "white",
                    "size": 10,
                },
            }
            for row in range(len(reversed_labels))
            for col in range(len(labels))
        ]

        # Prepare Plotly chart
        chart = {
            "data": [
                {
                    "z": reversed_z_values,  # Use reversed rows for heatmap
                    "x": labels,
                    "y": reversed_labels,  # Use reversed y-axis labels
                    "type": "heatmap",
                    "colorscale": "CoolWarm",
                    "showscale": True,
                    "text": [[f"{val:.2f}" for val in row] for row in reversed_z_values],
                    "hoverinfo": "text",
                }
            ],
            "layout": {
                "title": "Correlation Matrix of Shipping Prices",
                "xaxis": {
                    "title": "Commodities",
                    "tickangle": -45,
                    "automargin": True,
                },
                "yaxis": {
                    "title": "Commodities",
                    "automargin": True,
                },
                "height": 600,
                "width": 600,
                "annotations": annotations,
            },
        }

        # Add summary statistics
        summary_stats = {
            "total_records": len(returns),  # Updated to use 'returns'
            "unique_commodities": len(labels),
            "date_range": {
                "start": returns.index.min().strftime('%Y-%m-%d'),
                "end": returns.index.max().strftime('%Y-%m-%d'),
            },
            "average_correlation": float(correlation_matrix.mean().mean()),
        }

        print(f"Final chart labels: {len(labels)}, annotations: {len(annotations)}")  # Debugging log

        return jsonify({"chart": chart, "stats": summary_stats}), 200

    except Exception as e:
        app.logger.error(f"Error generating shipping correlation chart: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500





# terminal scatterplot for usda data
@app.route("/api/terminal_scatterplot_matrix", methods=["POST"])
def get_terminal_scatterplot_matrix():
    try:
        # Parse input from the frontend
        data = request.get_json()
        commodity_x = data.get("commodity_x")
        commodity_y = data.get("commodity_y")
        source = data.get("source", "ProduceIQ")  # Default to 'USDA'

        if not commodity_x or not commodity_y:
            return jsonify({"error": "Both commodities must be provided"}), 400

        # Query data for the selected commodities from PriceData where source is 'USDA'
        result = db.session.query(PriceData.commodity, PriceData.price).filter(
            PriceData.commodity.in_([commodity_x, commodity_y]),
            PriceData.source == source
        ).all()

        if not result:
            return jsonify({"error": "No data found for the selected commodities"}), 404

        # Create a DataFrame
        df = pd.DataFrame(result, columns=["commodity", "price"]).dropna()

        if df.empty:
            return jsonify({"error": "No valid data available"}), 404

        # Separate data for each commodity
        x_data = df[df['commodity'] == commodity_x]['price'].tolist()
        y_data = df[df['commodity'] == commodity_y]['price'].tolist()

        # Get the minimum length to ensure equal pairs
        min_length = min(len(x_data), len(y_data))

        if min_length == 0:
            scatter_plot = {
                "data": [],
                "layout": {
                    "title": "No Data Available",
                    "xaxis": {"title": f"{commodity_x} Prices"},
                    "yaxis": {"title": f"{commodity_y} Prices"},
                    "annotations": [
                        {
                            "text": "No valid data available for the selected commodities.",
                            "xref": "paper",
                            "yref": "paper",
                            "showarrow": False,
                            "font": {"size": 14},
                        }
                    ],
                    "height": 600,
                    "width": 600,
                },
            }
            return jsonify(scatter_plot), 200

        # Generate scatter plot JSON
        scatter_plot = {
            "data": [
                {
                    "x": x_data[:min_length],
                    "y": y_data[:min_length],
                    "mode": "markers",
                    "marker": {"size": 5, "opacity": 0.8, "color": "#33b1a7"},
                    "type": "scatter",
                }
            ],
            "layout": {
                "title": f"Scatter Plot: {commodity_x} vs {commodity_y}",
                "xaxis": {"title": f"{commodity_x} Prices"},
                "yaxis": {"title": f"{commodity_y} Prices"},
                "height": 600,
                "width": 600,
                "font": {"family": "Arial"},
            },
        }

        # Debug logs
        app.logger.info(f"{commodity_x} data (first 5): {x_data[:5]}")
        app.logger.info(f"{commodity_y} data (first 5): {y_data[:5]}")
        app.logger.info(f"Total points being plotted: {min_length}")

        return jsonify(scatter_plot), 200

    except Exception as e:
        app.logger.error(f"Error generating terminal scatterplot: {str(e)}")
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500






# shipping scatterplot for ProduceIQ data
@app.route("/api/shipping_scatterplot_matrix", methods=["POST"])
def get_shipping_scatterplot_matrix():
    try:
        # Parse input from the frontend
        data = request.get_json()
        commodity_x = data.get("commodity_x")
        commodity_y = data.get("commodity_y")
        source = data.get("source", "ProduceIQ")  # Default to 'USDA'

        if not commodity_x or not commodity_y:
            return jsonify({"error": "Both commodities must be provided"}), 400

        # Query data for the selected commodities from ShippingPriceData where source is 'ProduceIQ'
        result = db.session.query(ShippingPriceData.commodity, ShippingPriceData.price).filter(
            ShippingPriceData.commodity.in_([commodity_x, commodity_y]),
            ShippingPriceData.source == source
        ).all()

        if not result:
            return jsonify({"error": "No data found for the selected commodities"}), 404

        # Create a DataFrame
        df = pd.DataFrame(result, columns=["commodity", "price"]).dropna()

        if df.empty:
            return jsonify({"error": "No valid data available"}), 404

        # Separate data for each commodity
        x_data = df[df['commodity'] == commodity_x]['price'].tolist()
        y_data = df[df['commodity'] == commodity_y]['price'].tolist()

        # Get the minimum length to ensure equal pairs
        min_length = min(len(x_data), len(y_data))

        if min_length == 0:
            scatter_plot = {
                "data": [],
                "layout": {
                    "title": "No Data Available",
                    "xaxis": {"title": f"{commodity_x} Prices"},
                    "yaxis": {"title": f"{commodity_y} Prices"},
                    "annotations": [
                        {
                            "text": "No valid data available for the selected commodities.",
                            "xref": "paper",
                            "yref": "paper",
                            "showarrow": False,
                            "font": {"size": 14},
                        }
                    ],
                    "height": 600,
                    "width": 600,
                },
            }
            return jsonify(scatter_plot), 200

        # Generate scatter plot JSON
        scatter_plot = {
            "data": [
                {
                    "x": x_data[:min_length],
                    "y": y_data[:min_length],
                    "mode": "markers",
                    "marker": {"size": 5, "opacity": 0.8, "color": "#33b1a7"},
                    "type": "scatter",
                }
            ],
            "layout": {
                "title": f"Scatter Plot: {commodity_x} vs {commodity_y}",
                "xaxis": {"title": f"{commodity_x} Prices"},
                "yaxis": {"title": f"{commodity_y} Prices"},
                "height": 600,
                "width": 600,
                "font": {"family": "Arial"},
            },
        }

        # Debug logs
        app.logger.info(f"{commodity_x} data (first 5): {x_data[:5]}")
        app.logger.info(f"{commodity_y} data (first 5): {y_data[:5]}")
        app.logger.info(f"Total points being plotted: {min_length}")

        return jsonify(scatter_plot), 200

    except Exception as e:
        app.logger.error(f"Error generating shipping scatterplot: {str(e)}")
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500






# Rolling Correlations for Terminal prices

import plotly.express as px

def calculate_rolling_price_correlations(window, source_df, series1, series2):
    """
    Calculate rolling correlations between two price series.
    """
    try:
        # Sort index to ensure proper time-based calculations
        source_df = source_df.sort_index()
        
        # Forward fill missing values (up to 7 days)
        source_df = source_df.fillna(method='ffill', limit=7)
        
        # Calculate rolling correlation
        roll_corr = source_df[series1].rolling(
            window=window,
            min_periods=window // 2  # Allow for some missing data
        ).corr(source_df[series2])
        
        # Create result DataFrame
        result_df = pd.DataFrame({
            'date': roll_corr.index,
            'correlation': roll_corr.values
        })

        # Convert numpy values to Python native types
        result_df['correlation'] = result_df['correlation'].astype(float)
        result_df['date'] = result_df['date'].dt.strftime('%Y-%m-%d')

        # Clean up memory
        del roll_corr
        gc.collect()

        return result_df

    except KeyError as e:
        raise ValueError(f"KeyError: {e}. At least one of the selected varieties has no price data.")
    except Exception as e:
        raise ValueError(f"Unexpected error: {str(e)}")


def plot_rolling_price_correlations(roll_corr_df, series1, series2, window):
    """
    Create a plotly figure for rolling correlations.
    """
    try:
        # Convert date strings back to datetime for plotting
        roll_corr_df['date'] = pd.to_datetime(roll_corr_df['date'])
        
        # Create the plot
        fig_roll_corr = px.line(
            roll_corr_df,
            x='date',
            y='correlation',
            title=f"{window}-day rolling correlation between {series1} and {series2}"
        )

        fig_roll_corr.update_layout(
            title={
                "text": f"{window}-day rolling correlation between {series1} and {series2}",
                "x": 0.5,
                "y": 0.9,
                "xanchor": "center",
                "yanchor": "top"
            },
            xaxis_title="Date",
            yaxis_title="Correlation Coefficient",
            yaxis=dict(
                tickformat='.2f',
                range=[-1, 1]  # Correlation coefficient ranges from -1 to 1
            ),
            height=600,
            width=600,
            showlegend=False
        )

        # Add reference lines
        fig_roll_corr.add_hline(y=0, line_dash="dash", line_color="gray", opacity=0.5)
        fig_roll_corr.add_hline(y=1, line_dash="dot", line_color="gray", opacity=0.3)
        fig_roll_corr.add_hline(y=-1, line_dash="dot", line_color="gray", opacity=0.3)

        # Clean up memory
        del roll_corr_df
        gc.collect()

        return fig_roll_corr

    except Exception as e:
        raise ValueError(f"Error creating plot: {str(e)}")



# terminal correlations for usda data

@app.route("/api/terminal_rolling_correlations", methods=["POST"])
def terminal_rolling_correlations():
    try:
        # Parse input from the frontend
        data = request.get_json()
        series1 = data.get("series1")
        series2 = data.get("series2")
        window = int(data.get("window", 30))  # Default to 30 days
        source = data.get("source", "ProduceIQ")  # Default to USDA

        if not series1 or not series2:
            return jsonify({"error": "Both commodities must be provided"}), 400

        if window < 5:
            return jsonify({"error": "Window size must be at least 5 days"}), 400

        # Fetch data from the database, filtering by source 'USDA'
        result = db.session.query(
            PriceData.year,
            PriceData.day,
            PriceData.commodity,
            PriceData.price
        ).filter(
            PriceData.commodity.in_([series1, series2]),
            PriceData.price > 0,  # Ensure we only get valid prices
            PriceData.source == source  # Use selected source
        ).all()

        if not result:
            return jsonify({"error": "No data found for the selected commodities"}), 404

        # Create a DataFrame
        df = pd.DataFrame(result, columns=["year", "day", "commodity", "price"])

        # Generate a date column from year and day
        df["date"] = pd.to_datetime(
            df.apply(lambda row: f"{row.year}-{row.day}", axis=1),
            format="%Y-%j"
        )

        # Pivot the data for rolling correlation
        pivot_data = df.pivot_table(
            values="price",
            index="date",
            columns="commodity",
            aggfunc="mean"
        ).sort_index()

        # Clean up the main DataFrame after pivoting
        del df
        gc.collect()

        # Check for minimum data points
        min_required_points = window * 2
        if len(pivot_data) < min_required_points:
            del pivot_data
            gc.collect()
            return jsonify({
                "error": f"Insufficient data points. Need at least {min_required_points} days of data for {window}-day window"
            }), 400

        # Calculate rolling correlation
        roll_corr_df = calculate_rolling_price_correlations(
            window=window,
            source_df=pivot_data,
            series1=series1,
            series2=series2
        )

        # Clean up the pivot DataFrame after rolling correlation
        del pivot_data
        gc.collect()

        # Create the Plotly figure directly
        fig_roll_corr = px.line(
            roll_corr_df,
            x="date",
            y="correlation",
            title=f"{window}-day rolling correlation between {series1} and {series2}"
        )

        # Customize the layout
        fig_roll_corr.update_layout(
            title={
                "text": f"{window}-day rolling correlation between {series1} and {series2}",
                "x": 0.5,
                "y": 0.9,
                "xanchor": "center",
                "yanchor": "top"
            },
            xaxis_title="Date",
            yaxis_title="Correlation Coefficient",
            yaxis=dict(
                tickformat='.2f',
                range=[-1, 1]  # Correlation coefficient ranges from -1 to 1
            ),
            height=600,
            width=600,
            showlegend=False
        )

        # Add reference lines
        fig_roll_corr.add_hline(y=0, line_dash="dash", line_color="gray", opacity=0.5)
        fig_roll_corr.add_hline(y=1, line_dash="dot", line_color="gray", opacity=0.3)
        fig_roll_corr.add_hline(y=-1, line_dash="dot", line_color="gray", opacity=0.3)

        # Convert the Plotly figure to JSON, ensuring all values are serializable
        fig_json = fig_roll_corr.to_json()

        # Return the chart as JSON
        return app.response_class(
            response=fig_json,
            status=200,
            mimetype='application/json'
        )

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        app.logger.error(f"Error generating terminal rolling correlations: {str(e)}")
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500





# Rolling Correlations for Shipping prices

def calculate_rolling_price_correlations(window, source_df, series1, series2):
    """
    Calculate rolling correlations between two price series.
    """
    try:
        # Sort index to ensure proper time-based calculations
        source_df = source_df.sort_index()
        
        # Forward fill missing values (up to 7 days)
        source_df = source_df.ffill(limit=7)  # Use .ffill() instead of fillna(method='ffill')

        # Calculate rolling correlation
        roll_corr = source_df[series1].rolling(
            window=window,
            min_periods=window // 2  # Allow for some missing data
        ).corr(source_df[series2])
        
        # Create result DataFrame
        result_df = pd.DataFrame({
            'date': roll_corr.index,
            'correlation': roll_corr.values
        })

        # Convert numpy values to Python native types
        result_df['correlation'] = result_df['correlation'].astype(float)
        result_df['date'] = result_df['date'].dt.strftime('%Y-%m-%d')

        # Clean up memory
        del roll_corr
        gc.collect()

        return result_df

    except KeyError as e:
        raise ValueError(f"KeyError: {e}. At least one of the selected varieties has no price data.")
    except Exception as e:
        raise ValueError(f"Unexpected error: {str(e)}")



def plot_rolling_price_correlations(roll_corr_df, series1, series2, window):
    """
    Create a Plotly figure for rolling correlations and convert it to JSON.
    """
    try:
        # Convert date strings back to datetime for plotting
        roll_corr_df['date'] = pd.to_datetime(roll_corr_df['date'])
        
        # Create the Plotly figure
        fig_roll_corr = px.line(
            roll_corr_df,
            x='date',
            y='correlation',
            title=f"{window}-day Rolling Correlation between {series1} and {series2}",
            labels={'correlation': 'Correlation Coefficient', 'date': 'Date'}
        )

        # Update layout for better visualization
        fig_roll_corr.update_layout(
            title={
                "x": 0.5,
                "y": 0.9,
                "xanchor": "center",
                "yanchor": "top"
            },
            xaxis=dict(title="Date"),
            yaxis=dict(
                title="Correlation Coefficient",
                tickformat='.2f',
                range=[-1, 1]  # Correlation coefficient ranges from -1 to 1
            ),
            height=600,
            width=600,
            showlegend=False
        )

        # Add reference lines
        fig_roll_corr.add_hline(y=0, line_dash="dash", line_color="gray", opacity=0.5)
        fig_roll_corr.add_hline(y=1, line_dash="dot", line_color="gray", opacity=0.3)
        fig_roll_corr.add_hline(y=-1, line_dash="dot", line_color="gray", opacity=0.3)

        # Return the Plotly figure as JSON
        return fig_roll_corr.to_json()

    except Exception as e:
        raise ValueError(f"Error creating plot: {str(e)}")



# rolling correlations for shipping produceiq
@app.route("/api/shipping_rolling_correlations", methods=["POST"])
def shipping_rolling_correlations():
    """
    Endpoint to calculate and return rolling correlations chart for shipping price data.
    """
    try:
        # Parse input from the frontend
        data = request.get_json()
        series1 = data.get("series1")
        series2 = data.get("series2")
        window = int(data.get("window", 30))  # Default to 30 days
        source = data.get("source", "ProduceIQ")  # Default to USDA

        if not series1 or not series2:
            return jsonify({"error": "Both commodities must be provided"}), 400

        if window < 5:
            return jsonify({"error": "Window size must be at least 5 days"}), 400

        # Fetch data from the database
        result = db.session.query(
            ShippingPriceData.year,
            ShippingPriceData.day,
            ShippingPriceData.commodity,
            ShippingPriceData.price
        ).filter(
            ShippingPriceData.commodity.in_([series1, series2]),
            ShippingPriceData.price > 0,  # Ensure we only get valid prices
            ShippingPriceData.source == source  # Use selected source
        ).all()

        if not result:
            return jsonify({"error": "No data found for the selected commodities"}), 404

        # Create a DataFrame
        df = pd.DataFrame(result, columns=["year", "day", "commodity", "price"])

        # Generate a date column from year and day
        df["date"] = pd.to_datetime(
            df.apply(lambda row: f"{row.year}-{row.day}", axis=1),
            format="%Y-%j"
        )

        # Pivot the data for rolling correlation
        pivot_data = df.pivot_table(
            values="price",
            index="date",
            columns="commodity",
            aggfunc="mean"
        ).sort_index()

        # Check for minimum data points
        min_required_points = window * 2
        if len(pivot_data) < min_required_points:
            return jsonify({
                "error": f"Insufficient data points. Need at least {min_required_points} days of data for {window}-day window"
            }), 400

        # Calculate rolling correlation
        roll_corr_df = calculate_rolling_price_correlations(
            window=window,
            source_df=pivot_data,
            series1=series1,
            series2=series2
        )

        # Plot and serialize the rolling correlation chart
        fig_json = plot_rolling_price_correlations(
            roll_corr_df=roll_corr_df,
            series1=series1,
            series2=series2,
            window=window
        )

        return app.response_class(
            response=fig_json,
            status=200,
            mimetype='application/json'
        )

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        app.logger.error(f"Error generating shipping rolling correlations: {str(e)}")
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500



# Run the app
if __name__ == "__main__":
    app.run(debug=True)

# Initialize the cache extension
