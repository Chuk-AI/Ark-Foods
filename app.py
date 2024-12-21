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
from sqlalchemy import and_, or_
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
from sqlalchemy import text, func, or_
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



# Configuration for Logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)


CSV_DIRECTORY = "data/"

# Initialize Flask app
app = Flask(__name__, static_folder="frontend/build")
app.config['JWT_SECRET_KEY'] = 'your_secret_key'  # Replace with a strong secret key
jwt = JWTManager(app)

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, "index.html")

CORS(app, supports_credentials=True, resources={r"/*": {"origins": "http://localhost:3000"}})



@jwt.unauthorized_loader
def custom_unauthorized_response(err):
    return jsonify({"error": "Unauthorized. Please log in."}), 401

load_dotenv()

# setting up env variable for IBM API keys
EIS_API_KEY = os.getenv("EIS_API_KEY")
EIS_TENANT_ID = os.getenv("EIS_TENANT_ID")
EIS_ORG_ID = os.getenv("EIS_ORG_ID")
if not all([EIS_API_KEY, EIS_TENANT_ID, EIS_ORG_ID]):
    logging.error(
        "One or more IBM credentials are missing in the environment variables."
    )
print(f"API Key: {os.getenv('EIS_API_KEY')}")
print(f"Tenant ID: {os.getenv('EIS_TENANT_ID')}")
print(f"Endpoint: https://api.ibm.com/geospatial/run/na/core/v3/query")


# Enable CORS
CORS(app, supports_credentials=True, origins=["http://localhost:3000", "http://127.0.0.1"])


# Set the secret key for session handling


# app.config["SECRET_KEY"] = "your_secret_key_here"

app.config['JWT_BLACKLIST_ENABLED'] = True
app.config['JWT_BLACKLIST_TOKEN_CHECKS'] = ['access']
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=5)


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
    id = db.Column(db.Integer, primary_key=True)
    city_name = db.Column(db.String(100), nullable=False)
    commodity = db.Column(db.String(100), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    day = db.Column(db.Integer, nullable=False)  # Day of the year
    price = db.Column(db.Float, nullable=False)
    source = db.Column(db.String(50), nullable=False)
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

                    city_name = item.get("terminalMarketCityName")
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


import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
import ibmpairs.query as query
from ibmpairs.client import get_client
import logging


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

    # Ensure 'start_forecast_horizon_date' and 'end_forecast_horizon_date' are datetime objects
    if isinstance(start_forecast_horizon_date, str):
        start_forecast_horizon_date = datetime.strptime(
            start_forecast_horizon_date, "%Y-%m-%d"
        )
    if isinstance(end_forecast_horizon_date, str):
        end_forecast_horizon_date = datetime.strptime(
            end_forecast_horizon_date, "%Y-%m-%d"
        )

    # Ensure 'start_forecast_date' is a datetime object
    if isinstance(start_forecast_date, str):
        start_forecast_date = datetime.strptime(start_forecast_date, "%Y-%m-%d")

    # Generate valid dates and horizons
    valid_dates_horizons = []
    count = 0
    date = start_forecast_horizon_date
    while date <= end_forecast_horizon_date:
        valid_date = date
        horizon = (valid_date - start_forecast_date).days
        valid_dates_horizons.append((valid_date, horizon))
        count += 1
        date += timedelta(days=1)
    logging.info(f"Generated {len(valid_dates_horizons)} forecast horizons.")

    # Ensemble members in smaller batches
    ensemble_members_batches = [
        [str(x).zfill(2) for x in range(i, min(i + 1, end_ensembles + 1))]
        for i in range(start_ensembles, end_ensembles + 1)
    ]

    # Loop over each city, variable, and ensemble members in batches
    for city, coordinates in cities.items():
        lat = float(coordinates["lat"])
        lon = float(coordinates["lon"])
        logging.info(f"Starting data query for city: {city} (lat: {lat}, lon: {lon})")
        temperature_adjustment = fetch_elevation_data(lat, lon)

        for VARIABLE in layers_TWC.keys():
            logging.info(f"Starting data query for variable: {VARIABLE}")
            for ensemble_members in ensemble_members_batches:
                logging.info(f"Querying ensemble members: {ensemble_members}")

                query_layers = []
                for valid_date, horizon in valid_dates_horizons:
                    for ens in ensemble_members:
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
                                    {"name": "forecast", "value": ens},
                                    {"name": "horizon", "value": horizon},
                                ],
                            }
                        )

                # Construct query JSON payload
                query_json = {
                    "layers": query_layers,
                    "spatial": {"type": "point", "coordinates": [lat, lon]},
                    "temporal": {"intervals": [{"snapshot": "1982-01-01"}]},
                    "outputType": "json",
                }
                logging.info(
                    f"Constructed query JSON for ensemble members {ensemble_members}."
                )

                # Submit the query and process the results
                try:
                    logging.info("Submitting query to IBM PAIRS API.")
                    df = query.submit(query_json).point_data_as_dataframe()
                    if df.empty:
                        logging.warning(
                            f"No data returned for ensemble members {ensemble_members}"
                        )
                        continue

                    logging.info(f"Data retrieved, processing {len(df)} records.")
                    if VARIABLE == "TAVG":
                        df["value"] = df["value"].astype(float) + temperature_adjustment
                    if store_in_excel == 1:
                        process_and_store_in_excel(df, city, lat, lon, VARIABLE)
                    else:
                        process_and_store_data(df, city, lat, lon, VARIABLE)
                    gc.collect()
                    df = None
                    gc.collect()
                except Exception as e:
                    logging.error(f"Error during query submission for {VARIABLE}: {e}")
                    continue

    logging.info("Weather forecast data query completed successfully.")
    return "Weather forecast data query completed."


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
            df = query.submit(query_json).point_data_as_dataframe()
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

        # Fetch elevation data for temperature adjustment
        temperature_adjustment = fetch_elevation_data(lat, lon)

        for VARIABLE in layers_ERA5.keys():
            logging.info(f"Starting climatology data query for variable: {VARIABLE}")

            # Construct query JSON payload
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
            logging.info(f"Constructed query JSON for climatology data.")

            # Submit the query and process the results
            try:
                logging.info("Submitting query to IBM PAIRS API for climatology data.")
                df = query.submit(query_json).point_data_as_dataframe()
                if df.empty:
                    logging.warning(
                        f"No data returned for climatology data for {VARIABLE}"
                    )
                    continue

                # Apply temperature adjustment if the variable is TAVG
                if VARIABLE == "TAVG":
                    df["value"] = df["value"].astype(float) + temperature_adjustment

                logging.info(
                    f"Climatology data retrieved, processing {len(df)} records."
                )
                process_and_store_climatology_data(df, city, lat, lon, VARIABLE)
                gc.collect()
                df = None
                gc.collect()
            except Exception as e:
                logging.error(
                    f"Error during climatology data query for {VARIABLE}: {e}"
                )
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

# # testing db connection
# @app.route("/test_db")
# def test_db():
#     try:
#         # Fetch the first 5 users from the database
#         users = User.query.all()
#         if users:
#             # Create a response string with usernames and passwords
#             response = "First 5 users:\n"
#             for user in users:
#                 response += f"Username: {user.email}, Password: {user.password}\n"
#             return response
#         else:
#             return "Database is connected, but no users found."
#     except Exception as e:
#         return f"Error: {e}"

# @app.route("/api/test_users", methods=["GET"])
# def test_users():
#     users = User.query.all()
#     user_list = [
#         {"id": user.id, "username": user.username, "email": user.email, "role": user.role, "password": user.password}
#         for user in users
#     ]
#     return jsonify(user_list)



# Home page
@app.route("/api/")
@jwt_required()
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
@jwt_required()
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
@jwt_required()
def owner_dashboard():
    return render_template("owner_dashboard.html")


@app.route("/api/weather_dashboard")
@jwt_required()
def weather_dashboard():
    return render_template("weather_dashboard.html")


# @app.route("/sales_dashboard", methods=["GET"])
# # @login_required
# def sales_dashboard():
#     selected_commodity = request.args.get("commodity", "Jalapeno")
#     selected_source = request.args.get("source", "Historical")

#     # Get the most recent year and day
#     latest_year = db.session.query(db.func.max(PriceData.year)).scalar()
#     latest_day = (
#         db.session.query(db.func.max(PriceData.day))
#         .filter_by(year=latest_year)
#         .scalar()
#     )

#     # Query the best sell market (city with the highest recent price)
#     best_market = (
#         db.session.query(
#             PriceData.city_name,
#             db.func.max(PriceData.price).label("max_price"),
#             PriceData.year,
#             PriceData.day,
#         )
#         .filter(
#             PriceData.commodity == selected_commodity,
#             PriceData.source == selected_source,
#             PriceData.year == latest_year,
#             PriceData.day == latest_day,
#         )
#         .group_by(PriceData.city_name, PriceData.year, PriceData.day)
#         .order_by(db.desc("max_price"))
#         .all()
#     )

#     # Check if query was successful
#     if not best_market:
#         best_market = []

#     # Render the template and pass the variables
#     return render_template(
#         "sales_dashboard.html",
#         best_market=best_market,  # Make sure to pass this variable
#         selected_commodity=selected_commodity,
#         selected_source=selected_source,
#         datetime=datetime,  # Pass datetime to handle date formatting in the template
#     )



@app.route("/api/sales_dashboard", methods=["GET"])
@jwt_required()
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

# @app.route("/register", methods=["GET", "POST"])
# def register():
#     form = RegisterForm()
#     if form.validate_on_submit():
#         hashed_password = generate_password_hash(form.password.data, method="scrypt")
#         new_user = User(
#             username=form.username.data,
#             email=form.email.data,
#             password=hashed_password,
#             role=form.role.data,
#             approved=False,
#         )
#         db.session.add(new_user)
#         db.session.commit()
#         flash(
#             f"Registration successful! You registered as {form.role.data}. Your account must be approved by an admin or owner.",
#             "success",
#         )
#         return redirect(url_for("login"))
#     return render_template("register.html", form=form)




# @app.route("/login", methods=["GET", "POST"])
# def login():
#     try:
#         # Parse JSON data from the request
#         data = request.json
#         email = data.get("email")
#         password = data.get("password")

#         # Check if email and password are provided
#         if not email or not password:
#             return jsonify({"error": "Email and password are required"}), 400

#         # Fetch the user from the database
#         user = User.query.filter_by(email=email).first()

#         # Validate the user and password
#         if user and check_password_hash(user.password, password):
#             if not user.approved:
#                 return jsonify({"error": "Your account is not approved yet. Please wait for approval."}), 403

#             # Log the user in
#             login_user(user)

#             # Set session variables
#             session["username"] = user.username
#             session["role"] = user.role
#             session.permanent = True
#             session['user_id'] = user.id

#             return jsonify({
#                 "message": "Login successful!",
#                 "role": user.role,
#                 "username": user.username,
#                 "user_id": user.id,
#             }), 200
#         else:
#             return jsonify({"error": "Invalid email or password"}), 401
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

@app.route("/api/protected", methods=["GET"])
@jwt_required()
def protected():
    current_user = get_jwt_identity()
    return jsonify({"logged_in_as": current_user}), 200


from flask_jwt_extended import create_access_token
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
@jwt_required()
def logout():
    # Add the token's JTI (unique identifier) to the blacklist
    jti = get_jwt()["jti"]
    blacklist.add(jti)
    return jsonify({"message": "Successfully logged out"}), 200

# Route for approving users


@app.route("/api/users", methods=["GET"])
@jwt_required()
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
@jwt_required()
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



# @app.route("/users", methods=["GET"])
# # @login_required
# def approve_users():
#     # Check if the user is authenticated
#     if not current_user.is_authenticated:
#         return jsonify({"error": "User not authenticated"}), 401

#     # Check if the user is an admin or owner
#     if not current_user.is_admin() and not current_user.is_owner():
#         return jsonify({"error": "Access denied!"}), 403

#     # Fetch unapproved users
#     unapproved_users = User.query.filter_by(approved=False).all()
#     users = [
#         {"id": user.id, "username": user.username, "email": user.email, "role": user.role}
#         for user in unapproved_users
#     ]
#     return jsonify({"users": users}), 200


# FrontEND API internal
@app.route("/api/best_sell_market", methods=["GET"])
@jwt_required()
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


@app.route("/api/most_recent_prices", methods=["GET"])
@jwt_required()
def api_most_recent_prices():
    # List of cities and commodities
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
    commodities = [
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

    # Get source from request, default to 'USDA'
    selected_source = request.args.get("source", "USDA")

    # Calculate the date 7 days ago
    seven_days_ago = datetime.now(timezone("US/Pacific")) - timedelta(days=7)

    recent_prices = {commodity: {} for commodity in commodities}

    # Fetch the most recent maximum prices for each commodity and city within the last 7 days
    for commodity in commodities:
        # Handle special case: If the commodity is "Cubanelles" and the source is "USDA", search for "Cubanelle"
        if commodity == "Cubanelles" and selected_source == "USDA":

            commodity_to_query = "Cubanelle"
        else:
            commodity_to_query = commodity

        for city in cities:
            price_entry = (
                db.session.query(
                    func.max(PriceData.price).label("max_price"),
                    PriceData.year,
                    PriceData.day,
                )
                .filter(
                    PriceData.commodity
                    == commodity_to_query,  # Use the adjusted commodity name
                    func.upper(PriceData.city_name) == city.upper(),
                    PriceData.year >= seven_days_ago.year,
                    PriceData.day >= seven_days_ago.timetuple().tm_yday,
                )
                .group_by(PriceData.year, PriceData.day)
                .order_by(PriceData.year.desc(), PriceData.day.desc())
                .first()
            )

            # If a price is found, store it; otherwise, store '-'
            if price_entry:
                recent_prices[commodity][city] = price_entry.max_price
            else:
                recent_prices[commodity][city] = "-"

    return jsonify({"prices": recent_prices})

@app.route("/api/historical_data", methods=["GET"])
def historical_data():
    try:
        # Fetch parameters from the frontend
        commodities = request.args.get("commodities", "").split(",")
        cities = request.args.get("cities", "").split(",")
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        source = request.args.get("source")
        avg_commodities = (
            request.args.get("averageCommodities", "false").lower() == "true"
        )
        avg_cities = request.args.get("averageCities", "false").lower() == "true"

        # Debug: Log received parameters
        app.logger.info(f"Commodities: {commodities}")
        app.logger.info(f"Cities: {cities}")
        app.logger.info(f"Start Date: {start_date}, End Date: {end_date}")
        app.logger.info(f"Source: {source}")
        app.logger.info(f"Avg Commodities: {avg_commodities}, Avg Cities: {avg_cities}")

        # Standardize Cubanelles based on source
        standardized_commodities = []
        for commodity in commodities:
            if commodity.lower().startswith("cubanelle"):
                if source == "USDA":
                    standardized_commodities.append("Cubanelle")
                else:  # ProduceIQ
                    standardized_commodities.append("Cubanelles")
            else:
                standardized_commodities.append(commodity)

        # Debug: Log standardized commodities
        app.logger.info(f"Standardized Commodities: {standardized_commodities}")

        # Convert dates
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")

        # Calculate day of year for both dates
        start_day = start_dt.timetuple().tm_yday
        end_day = end_dt.timetuple().tm_yday

        # Debug: Log date range
        app.logger.info(f"Start Day: {start_day}, End Day: {end_day}")

        # Query the database with proper date filtering
        query = PriceData.query.filter(
            PriceData.commodity.in_(standardized_commodities),
            func.upper(PriceData.city_name).in_([city.upper() for city in cities]),
            PriceData.source == source,
        )

        # Add year-specific conditions
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

        # Debug: Log raw query results
        app.logger.info(f"Query Results: {data}")

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

            display_commodity = (
                "Cubanelles"
                if entry.commodity.lower().startswith("cubanelle")
                else entry.commodity
            )

            if avg_commodities and avg_cities:
                series_key = "Average Price"
            elif avg_commodities:
                series_key = entry.city_name
            elif avg_cities:
                series_key = display_commodity
            else:
                series_key = f"{display_commodity} - {entry.city_name}"

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
    # Get daily climatology for precipitation (average per historical record per day of the year)
    daily_precip_climatology = get_daily_precip_climatology(lat, lon)

    # Calculate the accumulated climatology precipitation for the date range
    accumulated_climo_precip = 0
    date = start_date
    while date <= end_date:
        day_of_year = date.strftime("%m-%d")
        if day_of_year in daily_precip_climatology:
            accumulated_climo_precip += daily_precip_climatology[day_of_year]
            print(accumulated_climo_precip)
        date += timedelta(days=1)

    # Calculate accumulated precipitation for each ensemble across the entire date range
    forecasts = (
        WeatherForecast.query.filter_by(latitude=lat, longitude=lon, variable="PRECIP")
        .filter(
            WeatherForecast.forecast_date >= start_date,
            WeatherForecast.forecast_date <= end_date,
        )
        .all()
    )

    # Initialize ensemble totals as a dictionary
    ensemble_totals = {}
    for f in forecasts:
        if f.ensemble_member not in ensemble_totals:
            ensemble_totals[f.ensemble_member] = 0
        # Accumulate values for each ensemble member over the entire date range
        ensemble_totals[f.ensemble_member] += f.forecasted_value

    # Calculate the probability (percentage) of ensembles predicting lower than climatology
    ensembles_below_climo = sum(
        1 for total in ensemble_totals.values() if total < accumulated_climo_precip
    )
    probability_below_climo = (ensembles_below_climo / len(ensemble_totals)) * 100

    return {
        "accumulated_climo_precip": accumulated_climo_precip,
        "ensemble_totals": list(ensemble_totals.values()),
        "probability_below_climo": probability_below_climo,
    }


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


# Main API route: Serve aggregated forecast and climatology data
@app.route("/api/weather_forecasts", methods=["GET"])
def api_weather_forecasts():
    lat = float(request.args.get("lat"))
    lon = float(request.args.get("lon"))
    start = request.args.get("start")
    end = request.args.get("end")

    # Set default date range if start or end dates are not provided
    if not start:
        start_date = datetime.now()
    else:
        start_date = datetime.strptime(start, "%Y-%m-%d")

    if not end:
        end_date = start_date + timedelta(
            days=30
        )  # Default to 30 days from start date if end date is not provided
    else:
        end_date = datetime.strptime(end, "%Y-%m-%d")

    try:
        # Fetch forecast data with min, max, std_dev for TAVG and PRECIP
        forecast_data = fetch_forecast_data(lat, lon, start_date, end_date)

        # Fetch climatology data for temperature and precipitation
        daily_tavg_climatology = get_daily_tavg_climatology_v2(lat, lon)
        daily_precip_climatology = get_daily_precip_climatology_v2(lat, lon)

        # Combine TAVG and PRECIP into daily_climatology
        daily_climatology = {
            "TAVG": daily_tavg_climatology,
            "PRECIP": daily_precip_climatology,
        }

        # Calculate accumulated precipitation and ensemble analysis for the selected date range
        accumulation_data = calculate_accumulated_precipitation(
            lat, lon, start_date, end_date
        )

        # Format response JSON
        return jsonify(
            {
                "forecast_data": forecast_data,
                "daily_climatology": daily_climatology,
                "accumulation_data": accumulation_data,
            }
        )
    except Exception as e:
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
def calculate_forecasted_price(variety, city, start_date, forecast_date):
    # Step 1: Determine the season of the forecast date
    season = determine_season_for_dashboard(forecast_date)

    # Step 2: Convert start date to year and day of the year
    start_year = start_date.year
    start_day = start_date.timetuple().tm_yday

    # Step 3: Query the PriceData for the given variety, city, and season, starting from the start_date
    historical_data = (
        db.session.query(PriceData.price)
        .filter(
            PriceData.commodity == variety,  # Match the commodity (variety)
            PriceData.city_name == city.upper(),  # Match the city (case insensitive)
            PriceData.season == season,  # Match the season
            PriceData.year >= start_year,  # Consider data from the start year onward
            PriceData.day
            >= start_day,  # Ensure data is after the start date in the year
            PriceData.source.in_(
                ["USDA", "Historical"]
            ),  # Data can be from USDA or Historical sources
        )
        .all()
    )

    # Step 4: Calculate the average price from the historical data
    if historical_data:
        total_price = sum([entry.price for entry in historical_data])
        average_price = total_price / len(historical_data)
    else:
        # If no data is found, return a fallback price (optional: log a message)
        average_price = 0.0

    return average_price


@app.route("/api/calculate_forecast", methods=["POST"])
def calculate_forecast():
    # Parse JSON data from the request body
    data = request.json

    # Extract the form data
    variety = data.get("variety")
    city = data.get("city")
    start_date = data.get("start_date")
    forecast_date = data.get("forecast_date")
    yield_per_acre = data.get("yield_per_acre")

    # Validate the form inputs
    if not all([variety, city, start_date, forecast_date, yield_per_acre]):
        return jsonify({"error": "All form fields are required"}), 400

    try:
        # Convert the dates and yield per acre to appropriate data types
        start_date = datetime.strptime(start_date, "%Y-%m-%d")
        forecast_date = datetime.strptime(forecast_date, "%Y-%m-%d")
        yield_per_acre = float(yield_per_acre)
    except ValueError:
        return jsonify({"error": "Invalid date format or yield per acre"}), 400

    # Call the calculate_forecasted_price function
    forecasted_price = calculate_forecasted_price(
        variety, city, start_date, forecast_date
    )
    revenue_per_acre = forecasted_price * yield_per_acre

    # Determine the season for the forecast date
    season = determine_season_for_dashboard(forecast_date)

    # Return the results
    return jsonify(
        {
            "forecasted_price": round(forecasted_price, 2),
            "revenue_per_acre": round(revenue_per_acre, 2),
            "season": season,
        }
    )

# API FOR Forecast visual
@app.route("/api/seasonal_prices", methods=["GET"])
@jwt_required()
def get_seasonal_prices():
    variety = request.args.get("variety")
    city = request.args.get("city")

    # Check if variety or city is missing
    if not variety or not city:
        return jsonify({"error": "Missing variety or city"}), 400

    # Initialize seasonal_prices dictionary to store prices for each season
    seasonal_prices = {"Spring": 0, "Summer": 0, "Autumn": 0, "Winter": 0}

    # Define the start date as January 1st, 2018
    start_date = datetime(2018, 1, 1)

    # Loop through each season and calculate the average price
    for season in seasonal_prices.keys():
        # Query data for the given variety, city, and season, starting from the start_date
        historical_data = (
            db.session.query(PriceData.price)
            .filter(
                PriceData.commodity == variety,  # Match the commodity (variety)
                PriceData.city_name
                == city.upper(),  # Match the city (case insensitive)
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
@jwt_required()
def get_sales_seasonal_prices():
    commodities_str = request.args.get("commodities")
    cities_str = request.args.get("cities")
    start_date_str = request.args.get("start_date")
    end_date_str = request.args.get("end_date")

    # Convert commodities and cities to lists if provided, else use all
    if commodities_str:
        commodities = commodities_str.split(",")
        # Handle special case for "Cubanelles"
        commodities = [
            "Cubanelle" if commodity == "Cubanelles" else commodity
            for commodity in commodities
        ]
    else:
        # Fetch all distinct commodities from the database
        commodities = [
            row[0] for row in db.session.query(PriceData.commodity).distinct().all()
        ]

    if cities_str:
        cities = cities_str.split(",")
        cities = [city.upper() for city in cities]
    else:
        # Fetch all distinct cities from the database
        cities = [
            row[0] for row in db.session.query(PriceData.city_name).distinct().all()
        ]

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

    # Prepare the query
    query = db.session.query(PriceData.season, PriceData.price).filter(
        PriceData.commodity.in_(commodities),
        PriceData.city_name.in_(cities),
        PriceData.source.in_(["USDA", "Historical"]),
    )

    # Apply date filters if both start_date and end_date are provided
    if start_date and end_date:
        start_year = start_date.year
        start_day = start_date.timetuple().tm_yday
        end_year = end_date.year
        end_day = end_date.timetuple().tm_yday

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

    # Retrieve data
    data = query.all()

    # Calculate average prices per season
    seasonal_prices = {}
    season_price_data = {}

    for season, price in data:
        if season not in season_price_data:
            season_price_data[season] = []
        season_price_data[season].append(price)

    # Calculate average price for each season
    for season in ["Spring", "Summer", "Autumn", "Winter"]:
        prices = season_price_data.get(season, [])
        if prices:
            average_price = sum(prices) / len(prices)
            seasonal_prices[season] = round(average_price, 2)
        else:
            seasonal_prices[season] = 0.0

    return jsonify(seasonal_prices)


# TEST ROUTE
@app.route("/api/trigger_usda_fetch", methods=["GET"])
def trigger_usda_fetch():
    fetch_usda_daily_data()
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


# @app.route("/api/upload_historical", methods=["POST"])
# def upload_historical():
#     try:
#         # Check if a file and commodity are provided in the request
#         if "file" not in request.files or "commodity" not in request.form:
#             return jsonify({"error": "File and commodity are required"}), 400

#         file = request.files["file"]
#         commodity = request.form["commodity"]

#         # Validate file
#         if file.filename == "":
#             return jsonify({"error": "No file selected"}), 400

#         if not file.filename.endswith(".csv"):
#             return jsonify({"error": "Invalid file type. Only CSV files are allowed"}), 400

#         # Save the file temporarily for processing
#         file_path = os.path.join(CSV_DIRECTORY, secure_filename(file.filename))
#         file.save(file_path)

#         # Process the uploaded CSV file
#         logging.info(f"Processing uploaded file: {file.filename}")
#         with open(file_path, newline="", encoding="utf-8") as csvfile:
#             reader = csv.DictReader(csvfile)

#             for row in reader:
#                 city_name = row["CityName"]
#                 year = int(row["Year"])
#                 day = int(row["Day"])
#                 price_str = row["Price"]

#                 # Skip rows with invalid or empty price
#                 if price_str.strip() == "":
#                     logging.warning(
#                         f"Skipping row with empty price for {city_name} on day {day} in year {year}"
#                     )
#                     continue

#                 try:
#                     price = float(price_str)
#                 except ValueError:
#                     logging.error(
#                         f"Invalid price value: {price_str} for {city_name} on day {day} in year {year}"
#                     )
#                     continue

#                 source = "ProduceIQ"

#                 # Determine season using year and day of the year
#                 try:
#                     report_date = datetime.strptime(f"{year}-{day}", "%Y-%j")
#                     season = determine_season(
#                         report_date.strftime("%m/%d/%Y")
#                     )  # Convert to MM/DD/YYYY format
#                 except Exception as e:
#                     logging.error(
#                         f"Error converting year-day to date for {year}-{day}: {str(e)}"
#                     )
#                     continue

#                 # Insert the data into the database
#                 new_price_data = PriceData(
#                     city_name=city_name,
#                     commodity=commodity,
#                     year=year,
#                     day=day,
#                     price=price,
#                     source=source,
#                     season=season,
#                 )
#                 db.session.add(new_price_data)

#         # Commit all data after processing the file
#         db.session.commit()
#         logging.info(f"Data for {commodity} uploaded successfully from {file.filename}")

#         # Delete the file after processing
#         os.remove(file_path)

#         return jsonify({"message": f"File {file.filename} uploaded successfully for {commodity}"}), 200

#     except Exception as e:
#         logging.error(f"Error during upload: {str(e)}")
#         return jsonify({"error": f"Error during upload: {str(e)}"}), 500

# Run the app
if __name__ == "__main__":
    app.run(debug=True)
