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
    Blueprint,
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
from usda import fetch_usda_terminal_data

# Imports for Weather Forecasting
import time
import numpy as np
import copy
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
import logging

from functools import wraps
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
)
from sqlalchemy.exc import SQLAlchemyError
from flask import send_from_directory
from notebook import get_best_start_dates, fetch_data_from_api
from fetch_shipping_point_data import (
    fetch_shipping_point_data,
)  # Replace with the correct module name
import hashlib
from flask import request, make_response
from collections import defaultdict
import secrets


# Configuration for Logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)


CSV_DIRECTORY = "data/"

# Initialize Flask app
app = Flask(__name__, static_folder="frontend/build", static_url_path="/")


if "JWT_SECRET_KEY" not in os.environ:
    os.environ["JWT_SECRET_KEY"] = secrets.token_hex(32)


app.config["JWT_SECRET_KEY"] = os.environ["JWT_SECRET_KEY"]
app.config["DEBUG"] = True
app.config["JWT_ALGORITHM"] = "HS256"
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

            if (
                original_city != normalized_city
                or original_commodity != normalized_commodity
            ):
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




CORS(
    app,
    supports_credentials=True,
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:3000",  # Local frontend (for development)
                "https://arkfoods.klicksai.com",  # Replace with your production domain
            ],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Add OPTIONS
            "allow_headers": [
                "Content-Type",
                "Authorization",
                "Access-Control-Allow-Credentials",
            ],
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
CORS(
    app,
    supports_credentials=True,
    origins=["http://localhost:3000", "http://127.0.0.1"],
)


# Set the secret key for session handling


# app.config["SECRET_KEY"] = "your_secret_key_here"

app.config["JWT_BLACKLIST_ENABLED"] = True
app.config["JWT_BLACKLIST_TOKEN_CHECKS"] = ["access"]
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=2)


blacklist = set()


@jwt.token_in_blocklist_loader
def check_if_token_in_blacklist(jwt_header, jwt_payload):
    return jwt_payload["jti"] in blacklist


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
        if "user_id" not in session:
            return redirect(url_for("login"))
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
    __tablename__ = "price_data"  # Match the actual table name in the database
    id = db.Column(db.Integer, primary_key=True)
    city_name = db.Column(db.String(100), nullable=False, index=True)
    commodity = db.Column(db.String(100), nullable=False, index=True)
    year = db.Column(db.Integer, nullable=False, index=True)
    day = db.Column(db.Integer, nullable=False, index=True)  # Day of the year
    price = db.Column(db.Float, nullable=False)
    source = db.Column(db.String(50), nullable=False, index=True)
    season = db.Column(db.String(20), nullable=False, index=True)
    # ── NEW columns ──
    package = db.Column(db.String(150), nullable=True)
    origin = db.Column(db.String(100), nullable=True)
    item_size = db.Column(db.String(50), nullable=True)


class BreakEvenEstimation(db.Model):
    __tablename__ = "break_even_estimations"

    id = db.Column(db.Integer, primary_key=True)

    # Revenue Calculator Fields
    variety = db.Column(db.String(100), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    forecast_date = db.Column(db.Date, nullable=False)
    yield_per_acre = db.Column(db.Float, nullable=False)

    # Cost Fields
    cost_per_acre = db.Column(db.Float, nullable=False)
    harvest_cost_per_box = db.Column(db.Float, nullable=False)
    cost_of_box = db.Column(db.Float, nullable=False)
    boxes_bonus_per_yield = db.Column(db.Float, nullable=False)

    # Analysis Date Range
    start_date_range = db.Column(db.Date, nullable=False)
    end_date_range = db.Column(db.Date, nullable=False)

    # Results
    forecasted_price = db.Column(db.Float, nullable=True)
    revenue_per_acre = db.Column(db.Float, nullable=True)
    revenue_after_costs = db.Column(db.Float, nullable=True)
    revenue_per_box = db.Column(db.Float, nullable=True)
    season = db.Column(db.String(20), nullable=True)
    source = db.Column(db.String(50), default="ProduceIQ")  # Add this line

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    def __repr__(self):
        return f"<BreakEvenEstimation {self.id} for {self.variety} in {self.city}>"

    def to_dict(self):
        """Convert instance to dictionary for API responses"""
        return {
            "id": self.id,
            "variety": self.variety,
            "city": self.city,
            "start_date": (
                self.start_date.strftime("%Y-%m-%d") if self.start_date else None
            ),
            "forecast_date": (
                self.forecast_date.strftime("%Y-%m-%d") if self.forecast_date else None
            ),
            "yield_per_acre": self.yield_per_acre,
            "cost_per_acre": self.cost_per_acre,
            "harvest_cost_per_box": self.harvest_cost_per_box,
            "cost_of_box": self.cost_of_box,
            "boxes_bonus_per_yield": self.boxes_bonus_per_yield,
            "start_date_range": (
                self.start_date_range.strftime("%Y-%m-%d")
                if self.start_date_range
                else None
            ),
            "end_date_range": (
                self.end_date_range.strftime("%Y-%m-%d")
                if self.end_date_range
                else None
            ),
            "forecasted_price": self.forecasted_price,
            "revenue_per_acre": self.revenue_per_acre,
            "revenue_after_costs": self.revenue_after_costs,
            "revenue_per_box": self.revenue_per_box,
            "season": self.season,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class ShippingPriceData(db.Model):

    id = db.Column(db.Integer, primary_key=True)
    commodity = db.Column(db.String, nullable=False, index=True)
    region_name = db.Column(db.String, nullable=False)
    year = db.Column(db.Integer, nullable=False, index=True)
    day = db.Column(db.Integer, nullable=False)
    source = db.Column(db.String, nullable=False)
    price = db.Column(db.Float)
    season = db.Column(db.String, nullable=True)


class UShippingPriceData(db.Model):
    __tablename__ = "usda_shipping_price_data"

    id = db.Column(db.Integer, primary_key=True)
    city_name = db.Column(db.String(100), nullable=False, index=True)
    commodity = db.Column(db.String(100), nullable=False, index=True)
    year = db.Column(db.Integer, nullable=False, index=True)
    price = db.Column(db.Float, nullable=False)
    source = db.Column(db.String(50), nullable=False, default="USDA")
    season = db.Column(db.String(20), nullable=False)


class AlertSetting(db.Model):
    """Model for price alert settings."""

    __tablename__ = "alert_settings"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False
    )  # Add user_id
    city = db.Column(db.String(100), nullable=False)
    commodity = db.Column(db.String(100), nullable=False)
    threshold = db.Column(db.Float, nullable=False, default=5.0)  # Default 5% threshold
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationship with User
    user = db.relationship("User", backref=db.backref("alert_settings", lazy=True))

    def __repr__(self):
        return f"<AlertSetting {self.id}: {self.commodity} @ {self.threshold}%>"

    def to_dict(self):
        """Convert instance to dictionary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "city": self.city,
            "commodity": self.commodity,
            "threshold": self.threshold,
            "isActive": self.is_active,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
        }


class Notification(db.Model):
    """Model for notifications."""

    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False
    )  # Add user_id
    alert_setting_id = db.Column(
        db.Integer, db.ForeignKey("alert_settings.id"), nullable=True
    )
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship("User", backref=db.backref("notifications", lazy=True))
    alert_setting = db.relationship(
        "AlertSetting", backref=db.backref("notifications", lazy=True)
    )

    def __repr__(self):
        return f"<Notification {self.id}: {self.title}>"

    def to_dict(self):
        """Convert instance to dictionary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "message": self.message,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat(),
            "alert_setting_id": self.alert_setting_id,
        }


# ============================================
# DASHBOARD CACHE MODEL
# ============================================


def get_json_column():
    try:
        if db.engine.dialect.name == "postgresql":
            from sqlalchemy.dialects.postgresql import JSONB
            return JSONB
        return db.Text
    except Exception:
        return db.Text


class DashboardCache(db.Model):
    __tablename__ = "dashboard_cache"
    cache_key = db.Column(db.String, primary_key=True)
    payload = db.Column(db.Text, nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=datetime.utcnow)


class ClimatologyData(db.Model):
    __tablename__ = "climatology_data"
    id = db.Column(db.Integer, primary_key=True)
    city_name = db.Column(db.String(100), nullable=False, index=True)
    variable = db.Column(db.String(100), nullable=False)
    forecast_date = db.Column(db.Date, nullable=False, index=True)
    climatology_value = db.Column(db.Float, nullable=False)


# ============================================
# PEPPER VARIETIES & GROWING REGION CONSTANTS
# ============================================

PEPPER_VARIETIES = [
    "Jalapeno",
    "Hungarian Wax",
    "Shishito",
    "Fresno",
    "Long Hot",
    "Habanero",
    "Anaheim",
    "Cubanelle",
    "Serrano",
    "Poblano",
]

GROWING_REGIONS = {
    "immokalee_fl": {"name": "Immokalee, FL", "lat": 26.4187, "lon": -81.4173, "city": "Immokalee", "crops": ["Jalapeño", "Serrano", "Poblano", "Habanero", "Anaheim", "Fresno"]},
    "palm_beach_fl": {"name": "Palm Beach County, FL", "lat": 26.7153, "lon": -80.0534, "city": "Palm Beach County", "crops": ["Jalapeño", "Serrano", "Poblano", "Habanero", "Anaheim", "Fresno"]},
    "vineland_nj": {"name": "Vineland, NJ", "lat": 39.4802, "lon": -75.0138, "city": "Vineland", "crops": ["Jalapeño", "Serrano", "Poblano", "Habanero", "Anaheim", "Fresno"]},
    "sodus_mi": {"name": "Sodus, MI", "lat": 42.0086, "lon": -86.3614, "city": "Sodus", "crops": ["Jalapeño", "Serrano", "Poblano", "Habanero", "Anaheim", "Fresno"]},
    "sinaloa_mx": {"name": "Sinaloa, Mexico", "lat": 25.1721, "lon": -107.4795, "city": "Sinaloa", "crops": ["Jalapeño", "Serrano", "Poblano", "Habanero"]},
    "sonora_mx": {"name": "Sonora, Mexico", "lat": 29.2972, "lon": -110.3309, "city": "Sonora", "crops": ["Jalapeño", "Serrano", "Poblano", "Habanero"]},
    "hendersonville_nc": {"name": "Hendersonville, NC", "lat": 35.3187, "lon": -82.4610, "city": "Hendersonville", "crops": ["Jalapeño", "Serrano", "Poblano", "Habanero", "Anaheim", "Fresno"]},
    "cameron_sc": {"name": "Cameron, SC", "lat": 33.5568, "lon": -80.7151, "city": "Cameron", "crops": ["Jalapeño", "Serrano", "Poblano", "Habanero", "Anaheim", "Fresno"]},
    "adel_ga": {"name": "Adel, GA", "lat": 31.13633333, "lon": -83.42216389, "city": "Adel", "crops": ["Jalapeño", "Serrano", "Poblano", "Habanero", "Long Hot"]},
    "bowling_green_fl": {"name": "Bowling Green, FL", "lat": 27.6386, "lon": -81.8265, "city": "Bowling Green", "crops": ["Jalapeño", "Serrano", "Poblano", "Habanero", "Anaheim", "Fresno"]},
}

PEPPER_CONDITIONS = {
    "Jalapeno": {"temp_min": 60, "temp_max": 80, "humidity_min": 20, "humidity_max": 40},
    "Hungarian Wax": {"temp_min": 60, "temp_max": 80, "humidity_min": 20, "humidity_max": 40},
    "Shishito": {"temp_min": 60, "temp_max": 80, "humidity_min": 20, "humidity_max": 40},
    "Fresno": {"temp_min": 60, "temp_max": 80, "humidity_min": 20, "humidity_max": 40},
    "Long Hot": {"temp_min": 60, "temp_max": 80, "humidity_min": 20, "humidity_max": 40},
    "Habanero": {"temp_min": 60, "temp_max": 80, "humidity_min": 20, "humidity_max": 40},
    "Anaheim": {"temp_min": 60, "temp_max": 80, "humidity_min": 20, "humidity_max": 40},
    "Cubanelle": {"temp_min": 60, "temp_max": 80, "humidity_min": 20, "humidity_max": 40},
    "Serrano": {"temp_min": 60, "temp_max": 80, "humidity_min": 20, "humidity_max": 40},
    "Poblano": {"temp_min": 60, "temp_max": 80, "humidity_min": 20, "humidity_max": 40},
}

OPENWEATHER_API_KEY = os.environ.get("OPENWEATHER_API_KEY", "")

_PEPPER_ALIASES = {
    "jalapeño": "Jalapeno", "jalapeno": "Jalapeno", "cubanelles": "Cubanelle",
    "cubanelle": "Cubanelle", "hungarian": "Hungarian Wax", "hungarian wax": "Hungarian Wax",
    "long hot": "Long Hot",
}


# ============================================
# HELPER FUNCTIONS
# ============================================


def normalize_commodity(name: str) -> str:
    if not name:
        return ""
    raw = str(name).strip()
    key = raw.lower()
    if key in _PEPPER_ALIASES:
        return _PEPPER_ALIASES[key]
    for canon in PEPPER_VARIETIES:
        if canon.lower() == key:
            return canon
    return raw


def _linear_trend(values):
    if len(values) < 5:
        return 0
    x = np.arange(len(values))
    y = np.array(values)
    return float(np.polyfit(x, y, 1)[0])


def get_day_of_year(date_obj):
    return date_obj.timetuple().tm_yday


def cache_get(key: str, max_age_seconds=None):
    from datetime import timezone as tz
    row = db.session.query(DashboardCache).filter_by(cache_key=key).first()
    if not row:
        return None
    if max_age_seconds is not None:
        updated = row.updated_at
        if updated.tzinfo is None:
            updated = updated.replace(tzinfo=tz.utc)
        age = (datetime.now(tz.utc) - updated).total_seconds()
        if age > max_age_seconds:
            return None
    payload = row.payload
    if isinstance(payload, str):
        import json as _json
        return _json.loads(payload)
    return payload


def cache_set(key: str, payload: dict):
    import json as _json
    try:
        dialect = db.engine.dialect.name
    except Exception:
        dialect = ""
    if dialect == "postgresql":
        sql = text("""
            INSERT INTO dashboard_cache (cache_key, payload, updated_at)
            VALUES (:k, CAST(:p AS jsonb), now())
            ON CONFLICT (cache_key)
            DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()
        """)
    else:
        sql = text("""
            INSERT OR REPLACE INTO dashboard_cache (cache_key, payload, updated_at)
            VALUES (:k, :p, CURRENT_TIMESTAMP)
        """)
    try:
        db.session.execute(sql, {"k": key, "p": _json.dumps(payload)})
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise


def _get_combined_current_price(commodity: str, city: str):
    commodity = normalize_commodity(commodity)
    today = datetime.now().date()
    cutoff_date = today - timedelta(days=7)
    commodity_variants = {commodity}
    if commodity == "Cubanelle":
        commodity_variants.add("Cubanelles")
    base_filters = [
        PriceData.commodity.in_(sorted(commodity_variants)),
        PriceData.price > 0,
        PriceData.source.in_(["ProduceIQ", "USDA"]),
    ]
    if city and city != "All cities":
        base_filters.append(PriceData.city_name == city.strip())
    latest = (
        db.session.query(PriceData.year, PriceData.day)
        .filter(*base_filters)
        .order_by(PriceData.year.desc(), PriceData.day.desc())
        .first()
    )
    if not latest:
        return None
    latest_date = datetime(int(latest.year), 1, 1).date() + timedelta(days=int(latest.day) - 1)
    if latest_date < cutoff_date:
        return None
    source_averages = (
        db.session.query(PriceData.source, func.avg(PriceData.price).label("avg_price"))
        .filter(*base_filters, PriceData.year == latest.year, PriceData.day == latest.day)
        .group_by(PriceData.source)
        .all()
    )
    if not source_averages:
        return None
    prices = [float(r.avg_price) for r in source_averages if r.avg_price and r.avg_price > 0]
    return float(sum(prices) / len(prices)) if prices else None


def calculate_price_forecast(commodity, city=None, source="ProduceIQ", forecast_days=7):
    try:
        commodity = normalize_commodity(commodity)
        now = datetime.now()
        current_year = now.year
        current_day = get_day_of_year(now)
        current_price = _get_combined_current_price(commodity, city)
        if not current_price or current_price <= 0:
            return {"success": False, "error": "Insufficient current price data"}
        commodity_variants = {commodity}
        if commodity == "Cubanelle":
            commodity_variants.add("Cubanelles")
        base_filters = [
            PriceData.commodity.in_(sorted(commodity_variants)),
            PriceData.source.in_(["ProduceIQ", "USDA"]),
            PriceData.price > 0,
            PriceData.year == current_year,
        ]
        if city and city != "All cities":
            base_filters.append(PriceData.city_name == city.strip())
        min_day = max(current_day - 30, 1)
        daily = (
            db.session.query(PriceData.day, func.avg(PriceData.price).label("avg_price"))
            .filter(*base_filters, PriceData.day >= min_day)
            .group_by(PriceData.day)
            .order_by(PriceData.day)
            .all()
        )
        if not daily or len(daily) < 5:
            return {"success": False, "error": "Insufficient historical data for forecast"}
        series = [float(r.avg_price) for r in daily if r.avg_price and r.avg_price > 0]
        recent = series[-14:] if len(series) >= 14 else series
        momentum_pct = 0.0
        std_dev = 0.0
        if len(recent) >= 7:
            slope = _linear_trend(recent)
            avg_recent = float(np.mean(recent))
            std_dev = float(np.std(recent))
            momentum_pct = (slope / avg_recent * 100.0) if avg_recent > 0 else 0.0
        forecasts = []
        prev_price = float(current_price)
        for day_offset in range(1, 8):
            forecast_price = prev_price * (1.0 + momentum_pct / 100.0)
            prev_price = forecast_price
            forecast_date = now + timedelta(days=day_offset)
            if day_offset == 1:
                trend = "stable"
            else:
                prior = forecasts[-1]["price"]
                trend = "up" if forecast_price > prior * 1.01 else ("down" if forecast_price < prior * 0.99 else "stable")
            forecasts.append({"date": forecast_date.strftime("%Y-%m-%d"), "day_name": forecast_date.strftime("%A"), "price": round(float(forecast_price), 2), "trend": trend})
        price_change = forecasts[-1]["price"] - forecasts[0]["price"]
        price_change_pct = (price_change / forecasts[0]["price"]) * 100 if forecasts[0]["price"] else 0.0
        if price_change_pct > 3:
            overall_trend, trend_badge = "RISING", "danger"
        elif price_change_pct < -3:
            overall_trend, trend_badge = "FALLING", "success"
        else:
            overall_trend, trend_badge = "STABLE", "warning"
        return {
            "success": True, "commodity": commodity, "city": city or "All cities",
            "source": "Combined (ProduceIQ + USDA)", "current_price": round(float(current_price), 2),
            "forecasts": forecasts, "overall_trend": overall_trend, "trend_badge": trend_badge,
            "price_change_pct": round(float(price_change_pct), 2), "momentum_pct": round(float(momentum_pct), 2),
            "std_dev": round(float(std_dev), 2) if std_dev > 0 else 0.0,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def fetch_current_weather(lat, lon):
    try:
        response = requests.get("https://api.openweathermap.org/data/2.5/weather",
            params={"lat": lat, "lon": lon, "appid": OPENWEATHER_API_KEY, "units": "imperial"}, timeout=10)
        if response.status_code == 200:
            data = response.json()
            return {
                "success": True, "temp": round(data["main"]["temp"], 1),
                "feels_like": round(data["main"]["feels_like"], 1),
                "humidity": data["main"]["humidity"], "wind_speed": round(data["wind"]["speed"], 1),
                "clouds": data["clouds"]["all"],
                "weather_main": data["weather"][0]["main"], "weather_desc": data["weather"][0]["description"],
                "weather_icon": data["weather"][0]["icon"],
            }
        return {"success": False, "error": f"API error: {response.status_code}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def fetch_7day_forecast(lat, lon):
    try:
        response = requests.get("https://api.openweathermap.org/data/2.5/forecast",
            params={"lat": lat, "lon": lon, "appid": OPENWEATHER_API_KEY, "units": "imperial", "cnt": 40}, timeout=10)
        if response.status_code == 200:
            data = response.json()
            daily_forecasts = {}
            for item in data["list"]:
                date = datetime.fromtimestamp(item["dt"]).strftime("%Y-%m-%d")
                daily_forecasts.setdefault(date, {"temps": [], "humidity": [], "conditions": [], "icons": [], "rain_prob": []})
                daily_forecasts[date]["temps"].append(item["main"]["temp"])
                daily_forecasts[date]["humidity"].append(item["main"]["humidity"])
                daily_forecasts[date]["conditions"].append(item["weather"][0]["main"])
                daily_forecasts[date]["icons"].append(item["weather"][0]["icon"])
                daily_forecasts[date]["rain_prob"].append(item.get("pop", 0) * 100)
            forecasts = []
            for date, values in sorted(daily_forecasts.items())[:7]:
                temps = values["temps"]
                forecasts.append({
                    "date": date, "day_name": datetime.strptime(date, "%Y-%m-%d").strftime("%A"),
                    "temp_high": round(max(temps), 1), "temp_low": round(min(temps), 1),
                    "temp_avg": round(sum(temps) / len(temps), 1),
                    "humidity": round(sum(values["humidity"]) / len(values["humidity"]), 0),
                    "condition": max(set(values["conditions"]), key=values["conditions"].count),
                    "icon": max(set(values["icons"]), key=values["icons"].count),
                    "rain_chance": round(max(values["rain_prob"]), 0),
                })
            return {"success": True, "forecasts": forecasts}
        return {"success": False, "error": f"API error: {response.status_code}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def analyze_growing_conditions(weather_data, crops):
    if not weather_data.get("success"):
        return {"alerts": [], "status": "unknown", "recommendation": "Weather data unavailable"}
    temp = weather_data["temp"]
    humidity = weather_data["humidity"]
    alerts = []
    status = "optimal"
    if temp <= 35:
        alerts.append({"type": "critical", "message": f"FROST ALERT! {temp}°F - Protect crops immediately!"})
        status = "critical"
    elif temp <= 50:
        alerts.append({"type": "warning", "message": f"Cold stress: {temp}°F - Growth may slow"})
        status = "warning"
    elif temp >= 100:
        alerts.append({"type": "critical", "message": f"EXTREME HEAT! {temp}°F - Risk of blossom drop"})
        status = "critical"
    elif 65 <= temp <= 85:
        alerts.append({"type": "good", "message": f"Optimal temperature: {temp}°F"})
    if humidity < 20:
        alerts.append({"type": "warning", "message": f"Very low humidity ({humidity}%) - Monitor for spider mites"})
    elif humidity > 70:
        alerts.append({"type": "warning", "message": f"High humidity ({humidity}%) - Watch for fungal diseases"})
        if status == "optimal":
            status = "caution"
    elif 20 <= humidity <= 40:
        alerts.append({"type": "good", "message": f"Optimal humidity: {humidity}%"})
    recommendation = {"critical": "URGENT: Take immediate protective action!", "warning": "Monitor conditions closely", "caution": "Conditions acceptable but watch for changes"}.get(status, "Excellent growing conditions")
    return {"alerts": alerts, "status": status, "recommendation": recommendation}


def get_climatology_comparison(region_name, forecast_date=None):
    try:
        if forecast_date is None:
            forecast_date = datetime.now().date()
        start_date = forecast_date - timedelta(days=7)
        end_date = forecast_date + timedelta(days=7)
        climatology = (
            db.session.query(ClimatologyData.variable, func.avg(ClimatologyData.climatology_value).label("avg_value"))
            .filter(
                func.lower(ClimatologyData.city_name).like(f"%{region_name.lower()}%"),
                ClimatologyData.forecast_date >= start_date,
                ClimatologyData.forecast_date <= end_date,
            )
            .group_by(ClimatologyData.variable)
            .all()
        )
        result = {row.variable: round(row.avg_value, 2) for row in climatology}
        return {"success": True, "region": region_name, "date": forecast_date.strftime("%Y-%m-%d"), "climatology": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


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
    "DETROIT",
    "ATLANTA",
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
# ============================================
# BUSHEL CONVERSION CONSTANTS & HELPERS
# ============================================

from fractions import Fraction
import re

# Lbs per bushel for each pepper variety (keyed to lowercase stripped commodity name)
BUSHEL_LBS = {
    "jalapeno":      32,
    "hungarian wax": 28,
    "shishito":      22,   # bu = 22 lbs
    "fresno":        28,   # bu = 28 lbs
    "long hot":      24,   # bu = 24 lbs
    "habanero":      22,   # bu = 22 lbs
    "anaheim":       30,
    "cubanelle":     20,
    "serrano":       28,   # bu = 28 lbs
    "poblano":       26,   # bu = 25-27 lbs, midpoint
}


_KG_TO_LBS = 2.20462
 
 
def parse_package_lbs(package: str, lbs_per_bu: float) -> "float | None":
    """
    Parse a USDA package string and return the total weight in lbs for that package.
 
    Used to convert raw per-package price to per-bushel:
        price_per_bu = (raw_price / package_lbs) * lbs_per_bu
 
    Handles all known USDA MARS package string formats:
 
    Bushel-based:
      "1 1/9 bushel cartons"              -> 1.111 * lbs_per_bu
      "1/2 and 5/9 bushel cartons"        -> avg(0.5, 0.556) * lbs_per_bu
      "5/9 bushel cartons"                -> 0.556 * lbs_per_bu
      "1/2 bushel cartons"                -> 0.5   * lbs_per_bu
      "1 bushel cartons"                  -> 1.0   * lbs_per_bu
      "bushel cartons"                    -> 1.0   * lbs_per_bu  (no number = 1 bu)
 
    Pound-based:
      "10 lb cartons"                     -> 10.0
      "28 lbs cartons"                    -> 28.0
      "30 lb cartons"                     -> 30.0
      "cartons 12 1-lb film bags"         -> 12 * 1 = 12.0
      "cartons 6 2-lb film bags"          -> 6  * 2 = 12.0
 
    Kg-based:
      "5 kg cartons"                      -> 5 * 2.20462 = 11.02
      "16 kg cartons"                     -> 16 * 2.20462 = 35.27
 
    No-size fallback:
      "cartons/crates"                    -> 1.0 * lbs_per_bu  (assume 1 bu)
      "cartons"                           -> 1.0 * lbs_per_bu
      "crates"                            -> 1.0 * lbs_per_bu
    """
    if not package or not lbs_per_bu:
        return None
 
    p = package.strip().lower()
    bu_pat = r"bus?h?e?l?s?\b|bu\b"
 
    # ----------------------------------------------------------------
    # 1. BUSHEL-BASED PACKAGES
    # ----------------------------------------------------------------
 
    if re.search(bu_pat, p):
 
        # 1a. Mixed number + fraction: "1 1/9 bushel cartons"
        m = re.search(r"(\d+)\s+(\d+)\s*/\s*(\d+)\s*(?:" + bu_pat + r")", p)
        if m:
            bu = int(m.group(1)) + int(m.group(2)) / int(m.group(3))
            return round(bu * lbs_per_bu, 4)
 
        # 1b. Range fraction: "1/2 and 5/9 bushel" → average
        m = re.search(
            r"(\d+)\s*/\s*(\d+)\s+and\s+(\d+)\s*/\s*(\d+)\s*(?:" + bu_pat + r")", p
        )
        if m:
            lo = int(m.group(1)) / int(m.group(2))
            hi = int(m.group(3)) / int(m.group(4))
            bu = (lo + hi) / 2.0
            return round(bu * lbs_per_bu, 4)
 
        # 1c. Simple fraction: "5/9 bushel", "1/2 bushel"
        m = re.search(r"(\d+)\s*/\s*(\d+)\s*(?:" + bu_pat + r")", p)
        if m:
            bu = int(m.group(1)) / int(m.group(2))
            return round(bu * lbs_per_bu, 4)
 
        # 1d. Whole or decimal number: "1 bushel", "1.5 bu"
        m = re.search(r"(\d+(?:\.\d+)?)\s*(?:" + bu_pat + r")", p)
        if m:
            bu = float(m.group(1))
            return round(bu * lbs_per_bu, 4)
 
        # 1e. Word "bushel" with NO number: "bushel cartons" → assume 1 bushel
        return round(1.0 * lbs_per_bu, 4)
 
    # ----------------------------------------------------------------
    # 2. MULTI-BAG / COUNT × WEIGHT: "cartons 12 1-lb film bags"
    #    Matches patterns like "12 1-lb", "6 2-lb", "12 1 lb"
    # ----------------------------------------------------------------
    m = re.search(r"(\d+)\s+(\d+(?:\.\d+)?)\s*-?\s*lb", p)
    if m:
        return round(float(m.group(1)) * float(m.group(2)), 4)
 
    # ----------------------------------------------------------------
    # 3. KG-BASED: "5 kg cartons", "16 kg cartons"
    # ----------------------------------------------------------------
    m = re.search(r"(\d+(?:\.\d+)?)\s*kg\b", p)
    if m:
        return round(float(m.group(1)) * _KG_TO_LBS, 4)
 
    # ----------------------------------------------------------------
    # 4. POUND-BASED: "10 lb cartons", "28 lbs", "30 lb cartons"
    # ----------------------------------------------------------------
    m = re.search(r"(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)\b", p)
    if m:
        return round(float(m.group(1)), 4)
 
    # ----------------------------------------------------------------
    # 5. NO SIZE INFO FALLBACK: "cartons/crates", "cartons", "crates"
    #    Assume 1 bushel — price is already effectively per-bushel
    # ----------------------------------------------------------------
    if re.search(r"^cartons?(/crates?)?$|^crates?$", p):
        return round(1.0 * lbs_per_bu, 4)
 
    # Cannot parse
    return None


@app.route("/api/fetch-data", methods=["GET"])
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

        # ✅ FIX 1: Correct endpoint
        BASE_URL = (
            "https://marsapi.ams.usda.gov/services/v1.2/marketTypes/sc-cr/sc/terminal/daily"
        )

        start_dt = get_last_fetched_usda_date()
        logging.info(f"Last fetched USDA date: {start_dt}")
        end_dt = pd.Timestamp.today()

        # ✅ FIX 2: Correct API key
        api_key = "LIm1Mr7tz2MRDq+5CyCXttTtSkfsD1Kr"

        wanted_commodities = [
            "Anaheim", "Cubanelle", "Fresno", "Habanero", "Hungarian Wax",
            "Jalapeno", "Long Hot", "Poblano", "Serrano", "Shishito",
        ]
        wanted_cities = [
            "Chicago", "New York", "Boston", "Miami", "Baltimore",
            "Los Angeles", "Philadelphia", "Columbia", "Detroit", "Atlanta",
        ]

        wanted_commodities_lower = [c.lower() for c in wanted_commodities]
        wanted_cities_lower = {c.lower() for c in wanted_cities}

        standardized_name = {
            "anaheim": "Anaheim",
            "cubanelle": "Cubanelle",
            "fresno": "Fresno",
            "habanero": "Habanero",
            "hungarian wax": "Hungarian Wax",
            "jalapeno": "Jalapeno",
            "long hot": "Long Hot",
            "poblano": "Poblano",
            "serrano": "Serrano",
            "shishito": "Shishito",
        }

        current_dt = start_dt
        while current_dt <= end_dt:
            current_date_formatted = current_dt.strftime("%m/%d/%Y")
            logging.info(f"Fetching USDA data for {current_date_formatted}")

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
                logging.info(f"Data for {current_date_formatted} already exists. Skipping.")
                current_dt += timedelta(days=1)
                continue

            # ✅ FIX 3: Use requests auth tuple instead of manual Base64 encoding
            response = requests.get(
                BASE_URL,
                auth=(api_key, ""),
                params={"q": f"report_date={current_date_formatted}"},
                timeout=60,
            )
            logging.info(f"API Response Status Code: {response.status_code}")

            # ✅ FIX 4: Stop immediately on auth failure instead of looping forever
            if response.status_code == 401:
                logging.error(
                    "Authentication failed (401). Check API key. Stopping fetch."
                )
                break

            if response.status_code != 200:
                logging.error(
                    f"Error fetching USDA data for {current_date_formatted}: "
                    f"{response.status_code} - {response.text}"
                )
                current_dt += timedelta(days=1)
                time.sleep(0.2)
                continue

            json_data = response.json()

            if json_data.get("results") and isinstance(json_data["results"], list):
                logging.info(f"Valid data found for {current_date_formatted}")

                for item in json_data["results"]:
                    commodity_raw = item.get("commodity", "")
                    commodity = commodity_raw.strip().lower()

                    if not commodity.startswith("peppers,"):
                        continue

                    stripped_commodity = commodity.replace("peppers, ", "").strip()
                    if stripped_commodity not in wanted_commodities_lower:
                        continue

                    standardized_commodity = standardized_name.get(
                        stripped_commodity, stripped_commodity
                    )

                    location = item.get("location", "")
                    first_city = location.split(",")[0].strip()

                    # ✅ FIX 5: Case-insensitive city matching
                    if first_city.lower() not in wanted_cities_lower:
                        continue

                    report_date = pd.Timestamp(item.get("report_date", ""))
                    year = report_date.year
                    month = report_date.month
                    day_of_year = report_date.day_of_year

                    if month in [3, 4, 5]:
                        season = "Spring"
                    elif month in [6, 7, 8]:
                        season = "Summer"
                    elif month in [9, 10, 11]:
                        season = "Autumn"
                    else:
                        season = "Winter"

                    low_price = item.get("low_price")
                    high_price = item.get("high_price")
                    try:
                        raw_price = (
                            round((float(low_price) + float(high_price)) / 2, 1)
                            if low_price and high_price
                            else round(float(low_price or high_price or 0), 1)
                        )
                    except ValueError:
                        raw_price = 0.0

                    package   = item.get("package", None)
                    origin    = item.get("origin", None)
                    item_size = item.get("item_size", None)

                    # ✅ FIX 6: Use BUSHEL_LBS (lowercase key) + parse_package_lbs
                    lbs_per_bu = BUSHEL_LBS.get(stripped_commodity)
                    package_lbs = (
                        parse_package_lbs(package, lbs_per_bu)
                        if lbs_per_bu and package
                        else None
                    )

                    if package_lbs and package_lbs > 0:
                        price = round((raw_price / package_lbs) * lbs_per_bu, 2)
                    else:
                        logging.warning(
                            f"Cannot parse package '{package}' for "
                            f"{standardized_commodity} on {current_date_formatted}"
                            f" — row skipped."
                        )
                        continue

                    price_data = PriceData(
                        city_name=first_city,
                        commodity=standardized_commodity,
                        year=year,
                        day=day_of_year,
                        price=price,
                        source="USDA",
                        season=season,
                        package=package,
                        origin=origin,
                        item_size=item_size,
                    )
                    db.session.add(price_data)

                db.session.commit()

            else:
                logging.warning(
                    f"No valid results found in the API response for {current_date_formatted}"
                )

            current_dt += timedelta(days=1)
            json_data = None
            gc.collect()

            # ✅ FIX 7: Gentle pause to avoid triggering rate limits
            time.sleep(0.2)

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

        wanted_commodities = [commodity.lower() for commodity in wanted_commodities]

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

        # ── ProduceIQ variety name → BUSHEL_LBS key mapping ──────────────────
        # ProduceIQ uses "cubanelles" but BUSHEL_LBS uses "cubanelle" (no s)
        variety_to_bushel_key = {
            "anaheim": "anaheim",
            "cubanelles": "cubanelle",
            "fresno": "fresno",
            "habanero": "habanero",
            "hungarian wax": "hungarian wax",
            "jalapeno": "jalapeno",
            "long hot": "long hot",
            "poblano": "poblano",
            "serrano": "serrano",
            "shishito": "shishito",
        }

        start_dt = get_last_fetched_date()
        end_dt = pd.Timestamp.today()

        current_dt = start_dt
        while current_dt <= end_dt:
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
                "commodityId": 18,
                "from": current_dt.strftime("%Y-%m-%d"),
                "to": current_dt.strftime("%Y-%m-%d"),
            }

            response = requests.get(
                f"{base_url}terminal-market-trends",
                headers=headers,
                params=params,
                verify=False,
            )

            logging.info(f"API Response for {current_dt.strftime('%Y-%m-%d')}")

            if response.status_code == 200:
                data = response.json().get("subset", [])
                logging.info(f"Fetched data for {current_dt.strftime('%Y-%m-%d')}")
            else:
                logging.error(
                    f"Failed to fetch data for {current_dt.strftime('%Y-%m-%d')}. "
                    f"Status code: {response.status_code}"
                )
                logging.error(f"API Error Response: {response.text}")
                current_dt += pd.Timedelta(days=1)
                continue

            if not data:
                logging.error(
                    f"No data found in the response for {current_dt.strftime('%Y-%m-%d')}."
                )
                current_dt += pd.Timedelta(days=1)
                continue

            for item in data:
                variety_name = item.get("varietyName", "").strip().lower()

                if variety_name in wanted_commodities:
                    variety_name = standardized_name.get(variety_name, variety_name)

                    city_name = (
                        item.get("terminalMarketCityName", "").strip().lower().title()
                    )
                    year = item.get("isoYear")
                    day_of_year = item.get("day")
                    raw_price = item.get("price")
                    source = "ProduceIQ"

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

                    # ── NEW: extract the three additional fields ───────────────
                    package = item.get("packageTypeName", None)  # e.g. "20 lb cartons"
                    origin = None  # not provided by ProduceIQ
                    item_size = item.get("itemSizeName", None)  # e.g. "extra large"

                    # ── NEW: convert raw price to per-bushel ───────────────────
                    variety_key = variety_to_bushel_key.get(
                        variety_name.lower(), variety_name.lower()
                    )
                    lbs_per_bu = BUSHEL_LBS.get(variety_key)
                    package_lbs = (
                        parse_package_lbs(package, lbs_per_bu)
                        if lbs_per_bu and package
                        else None
                    )

                    if package_lbs and package_lbs > 0:
                        # price_per_bu = (raw_price / package_lbs) * lbs_per_bu
                        price = round((raw_price / package_lbs) * lbs_per_bu, 2)
                    else:
                        logging.warning(
                            f"Cannot parse package '{package}' for "
                            f"{variety_name} on {current_dt.date()} — row skipped."
                        )
                        continue
                    # ──────────────────────────────────────────────────────────

                    price_data = PriceData(
                        city_name=city_name,
                        commodity=variety_name,
                        year=year,
                        day=day_of_year,
                        price=price,  # now always $/bushel
                        source=source,
                        season=season,
                        # ── NEW columns ──
                        package=package,  # raw string kept for reference
                        origin=origin,
                        item_size=item_size,
                    )

                    db.session.add(price_data)
                    logging.info(
                        f"Added {variety_name} for {current_dt.strftime('%Y-%m-%d')} "
                        f"in {city_name} @ ${price}/bu (package: {package})"
                    )

            db.session.commit()
            gc.collect()
            logging.info(
                f"Data for {current_dt.strftime('%Y-%m-%d')} saved to the database."
            )

            current_dt += pd.Timedelta(days=1)
            data = None
            gc.collect()

        logging.info(
            f"Data fetching completed from {start_dt.strftime('%Y-%m-%d')} "
            f"to {end_dt.strftime('%Y-%m-%d')}."
        )


import threading


def fetch_shipping_data():
    with app.app_context():  # Ensure Flask app context is active
        try:
            fetch_shipping_point_data()  # Long-running task
            print("Data fetch completed successfully.")
        except Exception as e:
            print(f"Error: {str(e)}")


@app.route("/fetch-shipping", methods=["GET"])
def fetch_shipping():
    thread = threading.Thread(target=fetch_shipping_data)
    thread.start()
    return jsonify({"status": "success", "message": "Task started in background"}), 202






# Scheduler for API calls to USDA and Produce IQ
# Running the Scheduler
def schedule_jobs():
    # Define the Los Angeles timezone
    la_timezone = timezone("US/Pacific")

    scheduler = BackgroundScheduler(timezone=la_timezone)

    pk_timezone = timezone("Asia/Karachi")

    # Initialize the scheduler
    scheduler = BackgroundScheduler(timezone=pk_timezone)

    # Schedule ProduceIQ job to run every 6 hours
    scheduler.add_job(
        func=fetch_daily_data,
        trigger=IntervalTrigger(
            hours=6, start_date="2024-10-01 00:25:00", timezone=la_timezone
        ),  # Runs every 6 hours, starting at 12:25 AM
        id="produce_iq_job",
    )

    # Schedule USDA job to run every 6 hours, 5 minutes after ProduceIQ job
    scheduler.add_job(
        func=fetch_usda_daily_data,
        trigger=IntervalTrigger(
            hours=6, start_date="2024-10-01 00:30:00", timezone=la_timezone
        ),  # Runs every 6 hours, starting at 12:30 AM
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
        return jsonify(
            {
                "isAuthenticated": True,
                "isAdmin": current_user.is_admin(),
                "isOwner": current_user.is_owner(),
                "username": current_user.username,
            }
        )
    return jsonify(
        {"isAuthenticated": False, "isAdmin": False, "isOwner": False, "username": None}
    )


# Dashboards
@app.route("/api/admin_dashboard", methods=["GET"])
# # @jwt_required()
def admin_dashboard():
    try:
        # Ensure current_user is available and authenticated
        if not current_user.is_authenticated:
            return jsonify({"error": "User not authenticated"}), 401

        # Return admin-specific data
        return (
            jsonify(
                {
                    "message": "Welcome to the Admin Dashboard!",
                    "username": current_user.username,
                    "role": current_user.role,
                }
            ),
            200,
        )
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
        formatted_best_market = (
            [
                {
                    "city_name": item.city_name,
                    "max_price": item.max_price,
                    "year": item.year,
                    "day": item.day,
                    "formatted_date": (
                        datetime(item.year, 1, 1) + timedelta(days=item.day - 1)
                    ).strftime("%Y-%m-%d"),
                }
                for item in best_market
            ]
            if best_market
            else []
        )

        return jsonify(
            {
                "best_market": formatted_best_market,
                "selected_commodity": selected_commodity,
                "selected_source": selected_source,
            }
        )

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
        if (
            not username
            or not email
            or not password
            or not confirm_password
            or not role
        ):
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
                return (
                    jsonify(
                        {
                            "error": "Your account is not approved yet. Please wait for approval."
                        }
                    ),
                    403,
                )

            # Create a JWT access token with an expiration time

            access_token = create_access_token(
                identity=str(user.id),  # Use user.id or a unique string identifier
                additional_claims={"username": user.username, "role": user.role},
                expires_delta=timedelta(hours=5),
            )

            return (
                jsonify(
                    {
                        "message": "Login successful!",
                        "token": access_token,
                        "role": user.role,
                        "username": user.username,
                        "user_id": user.id,
                    }
                ),
                200,
            )
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
@jwt_required()
def approve_users():
    try:
        current_user_id = get_jwt_identity()  # Fetch the identity (user ID)
        claims = get_jwt()  # Fetch additional claims

        # Check role
        if claims["role"] not in ["admin", "owner"]:
            return jsonify({"error": "Access denied"}), 403

        # Fetch unapproved users
        unapproved_users = User.query.filter_by(approved=False).all()
        users = [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
            }
            for user in unapproved_users
        ]

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
        if claims["role"] != "owner":
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
        "Atlanta",
        "Detroit",
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
        "Baltimore",
        "Boston",
        "Chicago",
        "Columbia",
        "Miami",
        "New York",
        "Philadelphia",
        "Los Angeles",
        "Atlanta",
        "Detroit",
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
            *[
                and_(PriceData.year == year, PriceData.day == day)
                for year, day in date_filters
            ]
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
            func.avg(func.nullif(PriceData.price, 0)).label("avg_price"),
        )
        .filter(
            PriceData.commodity.in_(adjusted_commodities),
            city_filter_conditions,
            date_filter_conditions,
            PriceData.source.in_(valid_sources),
            PriceData.price != 0,
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
        order_by=[price_subquery_cte.c.year.desc(), price_subquery_cte.c.day.desc()],
    )

    ranked_prices_cte = (
        select(
            price_subquery_cte.c.commodity,
            price_subquery_cte.c.city_name,
            price_subquery_cte.c.avg_price,
            window.label("rn"),
        )
    ).cte("ranked_prices")

    # --- Final Query ---
    # Explicitly select from the ranked_prices_cte. Since that CTE
    # was built on price_subquery_cte, both will be included.
    final_query = (
        select(
            ranked_prices_cte.c.commodity,
            ranked_prices_cte.c.city_name,
            ranked_prices_cte.c.avg_price,
        )
        .select_from(ranked_prices_cte)
        .where(ranked_prices_cte.c.rn == 1)
    )

    results = db.session.execute(final_query).all()

    # Build the dictionary for recent prices
    recent_prices = {
        commodity: {city: "-" for city in cities} for commodity in commodities
    }

    for row in results:
        original_commodity = reverse_commodity_map.get(row.commodity, row.commodity)
        normalized_city = row.city_name.lower()
        original_city = city_lower_map.get(normalized_city)
        if original_city and original_commodity in recent_prices:
            recent_prices[original_commodity][original_city] = (
                float(row.avg_price) if row.avg_price is not None else "-"
            )
    return jsonify({"prices": recent_prices})


@app.route("/api/sales_seasonal_prices", methods=["GET"])
def get_sales_seasonal_prices():
    # Fetch request parameters
    commodities_str = request.args.get("commodities")
    cities_str = request.args.get("cities")
    start_date_str = request.args.get("start_date")
    end_date_str = request.args.get("end_date")
    source_str = request.args.get("source", "Both")

    # Log received parameters
    app.logger.info(
        f"Received request with commodities: {commodities_str}, cities: {cities_str}, start_date: {start_date_str}, end_date: {end_date_str}"
    )

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
        PriceData.source.in_(["ProduceIQ"]),
    )
    # Base query
    query = db.session.query(PriceData.season, PriceData.price).filter(
        PriceData.commodity.in_(commodities),
        func.lower(PriceData.city_name).in_([city.lower() for city in cities]),
    )

    # ► dynamic source filter
    if source_str and source_str != "Both":
        query = query.filter(PriceData.source == source_str)
    else:  # "Both" or not supplied ⇒ allow both major sources
        query = query.filter(PriceData.source.in_(["USDA", "ProduceIQ"]))

    # Apply date filters if both start_date and end_date are provided
    if start_date and end_date:
        start_year = start_date.year
        start_day = start_date.timetuple().tm_yday
        end_year = end_date.year
        end_day = end_date.timetuple().tm_yday

        # Log the filter conditions for date range
        app.logger.info(
            f"Query Filters: Commodities: {commodities}, Cities: {cities}, Start Year: {start_year}, End Year: {end_year}, Start Day: {start_day}, End Day: {end_day}"
        )

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

        app.logger.info(f"Source: {source}")

        # Standardize Cubanelles/Cubanelle for database query
        # This creates appropriate cases for database matching
        db_query_commodities = []
        for commodity in commodities:
            if commodity.lower().startswith("cubanelle"):
                # Add both variations for database query
                if source == "USDA":
                    db_query_commodities.append("Cubanelle")
                elif source == "ProduceIQ":
                    db_query_commodities.append("Cubanelles")
                else:
                    # If source is unknown, add both variations
                    db_query_commodities.append("Cubanelle")
                    db_query_commodities.append("Cubanelles")
            else:
                db_query_commodities.append(commodity)

        # Convert string dates to datetime objects
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")

        # Calculate day of the year for both start and end dates
        start_day = start_dt.timetuple().tm_yday
        end_day = end_dt.timetuple().tm_yday

        # Debug: Log date range
        app.logger.info(f"Start Day: {start_day}, End Day: {end_day}")
        app.logger.info(f"Query commodities: {db_query_commodities}")

        # Query the database with proper date filtering
        query = PriceData.query.filter(
            func.upper(PriceData.commodity).in_(
                [c.upper() for c in db_query_commodities]
            ),
            func.upper(PriceData.city_name).in_([city.upper() for city in cities]),
            PriceData.source == source,
        )

        # Fix the date filtering logic
        if start_dt.year == end_dt.year:
            # If the start and end dates are in the same year
            query = query.filter(
                PriceData.year == start_dt.year,
                PriceData.day >= start_day,  # Include start_day
                PriceData.day <= end_day,  # Include end_day
            )
        else:
            # If the start and end dates span multiple years
            query = query.filter(
                or_(
                    and_(PriceData.year == start_dt.year, PriceData.day >= start_day),
                    and_(PriceData.year == end_dt.year, PriceData.day <= end_day),
                    and_(PriceData.year > start_dt.year, PriceData.year < end_dt.year),
                )
            )

        data = query.all()
        app.logger.info(f"Query returned {len(data)} records")

        if not data:
            return jsonify({"labels": [], "datasets": []}), 200

        # Process and group data by date and commodity/city
        price_series = {}
        all_dates = set()

        for entry in data:
            entry_date = datetime(entry.year, 1, 1) + timedelta(days=entry.day - 1)
            date_str = entry_date.strftime("%Y-%m-%d")
            all_dates.add(date_str)

            # Standardize commodity name for display - always show as "Cubanelles"
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

        # Sort the dates
        sorted_dates = sorted(list(all_dates))
        colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"]
        datasets = []

        # Create datasets for each series
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

        # Prepare the final result
        result = {"labels": sorted_dates, "datasets": datasets}

        # Return the result as JSON
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
                    and_(
                        ShippingPriceData.year == start_dt.year,
                        ShippingPriceData.day >= start_day,
                    ),
                    and_(
                        ShippingPriceData.year == end_dt.year,
                        ShippingPriceData.day <= end_day,
                    ),
                    and_(
                        ShippingPriceData.year > start_dt.year,
                        ShippingPriceData.year < end_dt.year,
                    ),
                )
            )

        query = query.order_by(
            ShippingPriceData.year.asc(), ShippingPriceData.day.asc()
        )
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


# Forecast Calculator
# def calculate_forecasted_price(variety, start_date, forecast_date):
#     # Step 1: Determine the season of the forecast date
#     season = determine_season_for_dashboard(forecast_date)

#     # Step 2: Convert start date to year and day of the year
#     start_year = start_date.year
#     start_day = start_date.timetuple().tm_yday

#     # Step 3: Query the PriceData for the given variety and season, starting from the start_date
#     historical_data = (
#         db.session.query(PriceData.price)
#         .filter(
#             PriceData.commodity == variety,          # Match the commodity (variety)
#             PriceData.season == season,                # Match the season
#             PriceData.year >= start_year,              # Consider data from the start year onward
#             PriceData.day >= start_day,                # Ensure data is after the start date in the year
#             PriceData.source == "ProduceIQ",
#         )
#         .all()
#     )

#     # Step 4: Calculate the average price from the historical data
#     if historical_data:
#         total_price = sum(entry.price for entry in historical_data)
#         average_price = total_price / len(historical_data)
#     else:
#         average_price = 0.0

#     return average_price


# @app.route("/api/calculate_forecast", methods=["POST"])
# def calculate_forecast():
#     data = request.json

#     # Required form fields
#     variety = data.get("variety")
#     start_date_str = data.get("start_date")
#     forecast_date_str = data.get("forecast_date")
#     yield_per_acre = data.get("yield_per_acre")

#     # NEW cost fields
#     cost_per_acre = data.get("cost_per_acre", 0)
#     harvest_cost_per_box = data.get("harvest_cost_per_box", 0)
#     cost_of_box = data.get("cost_of_box", 0)
#     boxes_bonus_per_yield = data.get("boxes_bonus_per_yield", 0)

#     # Validate the main required fields
#     if not all([variety, start_date_str, forecast_date_str, yield_per_acre]):
#         return jsonify({"error": "All form fields are required"}), 400

#     try:
#         # Convert to correct data types
#         start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
#         forecast_date = datetime.strptime(forecast_date_str, "%Y-%m-%d")
#         yield_per_acre = float(yield_per_acre)

#         # Convert the cost fields to float; default to 0 if missing
#         cost_per_acre = float(cost_per_acre) if cost_per_acre else 0
#         harvest_cost_per_box = float(harvest_cost_per_box) if harvest_cost_per_box else 0
#         cost_of_box = float(cost_of_box) if cost_of_box else 0
#         boxes_bonus_per_yield = float(boxes_bonus_per_yield) if boxes_bonus_per_yield else 0

#     except ValueError:
#         return jsonify({"error": "Invalid date or numeric format."}), 400

#     # 1) Calculate the forecasted price (already have your helper function):
#     forecasted_price = calculate_forecasted_price(variety, start_date, forecast_date)
#     revenue_per_acre = forecasted_price * yield_per_acre

#     # 2) Determine the season
#     season = determine_season_for_dashboard(forecast_date)

#     # 3) Calculate total costs:
#     # cost_per_acre + (harvest_cost_per_box * yield_per_acre) + (cost_of_box * yield_per_acre) + (boxes_bonus_per_yield)
#     total_costs = cost_per_acre  + (harvest_cost_per_box * yield_per_acre)  + (cost_of_box * yield_per_acre)  + (boxes_bonus_per_yield)

#     # 4) Subtract total costs from revenue
#     revenue_after_costs = revenue_per_acre - total_costs


#         # Add the debug print here:
#     print("DEBUG: forecasted_price =", forecasted_price,
#           " revenue_per_acre_after_costings =", revenue_after_costs)


#     return jsonify({
#         "forecasted_price": round(forecasted_price, 2),
#         "revenue_per_acre": round(revenue_per_acre, 2),
#         "revenue_per_acre_after_costings": round(revenue_after_costs, 2),
#         "season": season,
#     })


def calculate_forecasted_price(
    variety, start_date, forecast_date, city=None, source="ProduceIQ"
):
    # Step 1: Determine the season of the forecast date
    season = determine_season_for_dashboard(forecast_date)

    # Step 2: Convert start date to year and day of the year
    start_year = start_date.year
    start_day = start_date.timetuple().tm_yday

    # Step 3: Start building the query
    query = db.session.query(PriceData.price).filter(
        PriceData.commodity == variety,
        PriceData.season == season,
        PriceData.year >= start_year,
        PriceData.day >= start_day,
    )

    # Add source filter
    if source == "ProduceIQ,USDA" or source == "USDA,ProduceIQ":
        query = query.filter(PriceData.source.in_(["ProduceIQ", "USDA"]))
    else:
        query = query.filter(PriceData.source == source)

    # Add city filter if provided
    if city and city != "All cities":
        query = query.filter(PriceData.city_name == city)

    # Execute the query
    historical_data = query.all()

    # Step 4: Calculate the average price from the historical data
    if historical_data:
        total_price = sum(entry.price for entry in historical_data)
        average_price = total_price / len(historical_data)
    else:
        average_price = 0.0

    return average_price

@app.route("/api/runthisshit", methods=["GET"])
def runthisshit():
    results = {}
    
    try:
        fetch_daily_data()
        results["fetch_daily_data"] = "success"
    except Exception as e:
        results["fetch_daily_data"] = f"error: {str(e)}"
    
    try:
        fetch_usda_terminal_data()
        results["fetch_usda_terminal_data"] = "success"
    except Exception as e:
        results["fetch_usda_terminal_data"] = f"error: {str(e)}"
    
    return jsonify({"status": "completed", "results": results}), 200

@app.route("/api/calculate_forecast", methods=["POST"])
def calculate_forecast():
    data = request.json

    # Required form fields
    variety = data.get("variety")
    start_date_str = data.get("start_date")
    forecast_date_str = data.get("forecast_date")
    yield_per_acre = data.get("yield_per_acre")
    # Get the city parameter (optional)
    city = data.get("city", "All cities")

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
        harvest_cost_per_box = (
            float(harvest_cost_per_box) if harvest_cost_per_box else 0
        )
        cost_of_box = float(cost_of_box) if cost_of_box else 0
        boxes_bonus_per_yield = (
            float(boxes_bonus_per_yield) if boxes_bonus_per_yield else 0
        )

    except ValueError:
        return jsonify({"error": "Invalid date or numeric format."}), 400

    # 1) Calculate the forecasted price (now with city parameter):
    forecasted_price = calculate_forecasted_price(
        variety, start_date, forecast_date, city
    )
    revenue_per_acre = forecasted_price * yield_per_acre

    # Rest of function remains the same...

    # 2) Determine the season
    season = determine_season_for_dashboard(forecast_date)

    # 3) Calculate total costs:
    # cost_per_acre + (harvest_cost_per_box * yield_per_acre) + (cost_of_box * yield_per_acre) + (boxes_bonus_per_yield)
    total_costs = (
        cost_per_acre
        + (harvest_cost_per_box * yield_per_acre)
        + (cost_of_box * yield_per_acre)
        + (boxes_bonus_per_yield)
    )
    # 4) Subtract total costs from revenue
    revenue_after_costs = revenue_per_acre - total_costs

    # Add the debug print here:
    print(
        "DEBUG: forecasted_price =",
        forecasted_price,
        " revenue_per_acre_after_costings =",
        revenue_after_costs,
    )

    return jsonify(
        {
            "forecasted_price": round(forecasted_price, 2),
            "revenue_per_acre": round(revenue_per_acre, 2),
            "revenue_per_acre_after_costings": round(revenue_after_costs, 2),
            "season": season,
        }
    )


# Endpoint to get price averages with normalized commodity names
@app.route("/api/price_averages", methods=["GET"])
def get_price_averages():
    try:
        start_date = request.args.get("start_date")
        end_date = request.args.get("end_date")
        source = request.args.get("source", "both").lower()
        city = request.args.get("city", "All cities")

        if not start_date or not end_date:
            return jsonify({"error": "Both start and end dates are required"}), 400

        # Convert dates to year/day-of-year
        start_date_obj = datetime.strptime(start_date, "%Y-%m-%d")
        end_date_obj = datetime.strptime(end_date, "%Y-%m-%d")
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
            "ATLANTA": "Atlanta",
            "DETROIT": "Detroit",
        }

        # Normalize city names
        normalized_city = case(
            *[
                (PriceData.city_name == key, value)
                for key, value in usda_city_mapping.items()
            ],
            else_=PriceData.city_name,
        ).label("normalized_city")

        # Normalize commodity name - ensure consistent naming between sources
        # Handle special case where Cubanelle in USDA matches Cubanelles in ProduceIQ
        normalized_commodity = func.lower(func.trim(PriceData.commodity)).label(
            "normalized_commodity"
        )

        # Build basic query filtering by date range
        query = db.session.query(
            normalized_city,
            normalized_commodity,
            PriceData.source,
            func.avg(PriceData.price).label("avg_price"),
        ).filter(
            or_(
                and_(PriceData.year == start_year, PriceData.day >= start_day),
                and_(PriceData.year == end_year, PriceData.day <= end_day),
                and_(PriceData.year > start_year, PriceData.year < end_year),
            )
        )

        # Apply city filter if not "All cities"
        if city.lower() != "all cities":
            query = query.filter(normalized_city == city)

        # Apply source filter if not "both"
        if source == "usda":
            query = query.filter(PriceData.source == "USDA")
        elif source == "produceiq":
            query = query.filter(PriceData.source == "ProduceIQ")

        # Group by city, commodity, and source
        query = query.group_by(normalized_city, normalized_commodity, PriceData.source)
        query = query.order_by(normalized_commodity)

        results = query.all()

        # Convert query results to dictionary format for easier manipulation
        raw_data = []
        for row in results:
            # Skip if no data (shouldn't happen with avg, but just in case)
            if row.avg_price is None:
                continue

            raw_data.append(
                {
                    "city": row.normalized_city,
                    "commodity": row.normalized_commodity,
                    "source": row.source,
                    "avg_price": round(row.avg_price, 2),
                }
            )

        # Format the results based on filters
        price_averages = []

        # Special handling for the "cubanelle/cubanelles" case
        cubanelle_map = {"cubanelle": "cubanelles", "cubanelles": "cubanelles"}

        # Standardize commodity names
        for item in raw_data:
            if item["commodity"] in cubanelle_map:
                item["commodity"] = cubanelle_map[item["commodity"]]

        # For "both" sources, we need to combine USDA and ProduceIQ
        if source == "both":
            # Create a dictionary to combine by commodity (and city if relevant)
            combined_data = {}

            if city.lower() == "all cities":
                # Combine by commodity across all cities and both sources
                for item in raw_data:
                    commodity = item["commodity"]
                    if commodity not in combined_data:
                        combined_data[commodity] = {
                            "commodity": commodity,
                            "source": "U/P",
                            "sum_price": item["avg_price"],
                            "count": 1,
                        }
                    else:
                        combined_data[commodity]["sum_price"] += item["avg_price"]
                        combined_data[commodity]["count"] += 1

                # Calculate averages and create the final output
                for commodity, data in combined_data.items():
                    price_averages.append(
                        {
                            "commodity": commodity,
                            "source": "U/P",
                            "avg_price": round(data["sum_price"] / data["count"], 2),
                        }
                    )
            else:
                # Combine by commodity and city
                for item in raw_data:
                    key = (item["commodity"], item["city"])
                    if key not in combined_data:
                        combined_data[key] = {
                            "commodity": item["commodity"],
                            "city": item["city"],
                            "source": "Both",
                            "sum_price": item["avg_price"],
                            "count": 1,
                        }
                    else:
                        combined_data[key]["sum_price"] += item["avg_price"]
                        combined_data[key]["count"] += 1

                # Calculate averages
                for data in combined_data.values():
                    price_averages.append(
                        {
                            "commodity": data["commodity"],
                            "city_name": data["city"],
                            "source": "U/P",
                            "avg_price": round(data["sum_price"] / data["count"], 2),
                        }
                    )
        else:
            # For single source queries
            if city.lower() == "all cities":
                # Combine by commodity across all cities
                commodity_data = {}
                for item in raw_data:
                    commodity = item["commodity"]
                    if commodity not in commodity_data:
                        commodity_data[commodity] = {
                            "commodity": commodity,
                            "source": item["source"],
                            "sum_price": item["avg_price"],
                            "count": 1,
                        }
                    else:
                        commodity_data[commodity]["sum_price"] += item["avg_price"]
                        commodity_data[commodity]["count"] += 1

                # Calculate averages
                for commodity, data in commodity_data.items():
                    price_averages.append(
                        {
                            "commodity": commodity,
                            "source": data["source"],
                            "avg_price": round(data["sum_price"] / data["count"], 2),
                        }
                    )
            else:
                # Direct mapping for specific city and source
                for item in raw_data:
                    price_averages.append(
                        {
                            "commodity": item["commodity"],
                            "city_name": item["city"],
                            "source": item["source"],
                            "avg_price": item["avg_price"],
                        }
                    )

        # Sort results by commodity for consistency
        price_averages.sort(key=lambda x: x["commodity"])

        return jsonify({"price_averages": price_averages}), 200

    except Exception as e:
        app.logger.error(f"Error fetching price averages: {str(e)}")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500


# API FOR Forecast visual
@app.route("/api/seasonal_prices", methods=["GET"])
def get_seasonal_prices():
    variety = request.args.get("variety")
    city = request.args.get("city", "All cities")
    start_date_str = request.args.get("start_date")
    forecast_date_str = request.args.get(
        "forecast_date"
    )  # Added forecast date parameter

    # Check if required parameters are missing
    if not variety:
        return jsonify({"error": "Missing variety"}), 400

    # Parse dates if provided
    start_date = None
    forecast_date = None
    start_year = None
    start_day = None

    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
            start_year = start_date.year
            start_day = start_date.timetuple().tm_yday
        except ValueError:
            return jsonify({"error": "Invalid start date format"}), 400

    if forecast_date_str:
        try:
            forecast_date = datetime.strptime(forecast_date_str, "%Y-%m-%d")
        except ValueError:
            return jsonify({"error": "Invalid forecast date format"}), 400

    # Initialize seasonal_prices dictionary
    seasonal_prices = {"Spring": 0, "Summer": 0, "Autumn": 0, "Winter": 0}

    # Loop through each season and calculate the average price
    for season in seasonal_prices.keys():
        # Create a query similar to calculate_forecasted_price
        query = db.session.query(PriceData.price).filter(
            PriceData.commodity == variety,  # Match the commodity (variety)
            PriceData.season == season,  # Match the season
            PriceData.source == "ProduceIQ",
        )

        # Add date filters if start date is provided
        if start_date:
            query = query.filter(
                PriceData.year
                >= start_year,  # Consider data from the start year onward
                PriceData.day
                >= start_day,  # Ensure data is after the start date in the year
            )

        # Add city filter if provided and not "All cities"
        if city and city != "All cities":
            query = query.filter(PriceData.city_name == city)

        # Execute the query
        historical_data = query.all()

        # Calculate the average price from the historical data
        if historical_data:
            total_price = sum([entry.price for entry in historical_data])
            average_price = total_price / len(historical_data)
            seasonal_prices[season] = round(average_price, 2)
        else:
            seasonal_prices[season] = 0.0

        # Log for debugging
        print(
            f"Season {season} for {variety}, City: {city}, Start: {start_date_str}, Forecast: {forecast_date_str} - Found {len(historical_data)} records, Avg: {seasonal_prices[season]}"
        )

    return jsonify(seasonal_prices)


@app.route("/api/forecast_line_data", methods=["GET"])
def get_forecast_line_data():
    """
    Build season‑by‑season price forecasts without applying trend factors.
    Ensures that forecasts for the same season are consistent across years.

    • If averageCities=true   → ignore the city filter and aggregate across every city
    • Otherwise               → forecast for each (commodity, city) pair exactly as before
    • Supports filtering by data source: "ProduceIQ", "USDA", or both
    """
    try:
        from collections import defaultdict

        # ────────── 1. Parse & validate input ──────────
        commodities = [
            c.strip()
            for c in request.args.get("commodities", "").split(",")
            if c.strip()
        ]
        cities_raw = [
            c.strip() for c in request.args.get("cities", "").split(",") if c.strip()
        ]
        avg_cities = request.args.get("averageCities", "false").lower() == "true"
        forecast_years = int(request.args.get("forecastYears", "1"))
        data_source = request.args.get(
            "source", "ProduceIQ"
        )  # Default to ProduceIQ if not specified

        if not commodities:
            return jsonify({"error": "Missing commodities"}), 400
        if not avg_cities and not cities_raw:
            return jsonify({"error": "Missing cities"}), 400

        # remove sentinel "ALL" if it slipped through
        cities = [c for c in cities_raw if c.upper() != "ALL"]

        # ────────── 2. Season helpers ──────────
        seasons = ["Winter", "Spring", "Summer", "Autumn"]
        now = datetime.now()
        current_year = now.year
        month = now.month
        current_season = (
            "Spring"
            if 3 <= month <= 5
            else (
                "Summer"
                if 6 <= month <= 8
                else "Autumn" if 9 <= month <= 11 else "Winter"
            )
        )

        # Build season labels: current season + forecast_years * 4
        season_labels = []
        idx0 = seasons.index(current_season)
        for yr in range(current_year, current_year + forecast_years + 1):
            for i in range(4):
                season_labels.append(f"{seasons[(idx0 + i) % 4]} {yr}")
        season_labels = season_labels[: 1 + 4 * forecast_years]

        result = {"labels": season_labels, "datasets": []}

        # ────────── 3. One DB query for all needed history ──────────
        filters = [
            PriceData.commodity.in_(commodities),
            PriceData.year >= current_year - 5,
        ]

        # Handle source filtering
        if data_source == "ProduceIQ,USDA" or data_source == "USDA,ProduceIQ":
            # Include both sources
            filters.append(PriceData.source.in_(["ProduceIQ", "USDA"]))
        else:
            # Use specified source
            filters.append(PriceData.source == data_source)

        if not avg_cities:
            filters.append(PriceData.city_name.in_(cities))

        rows = (
            db.session.query(
                PriceData.commodity,
                PriceData.city_name,
                PriceData.year,
                PriceData.season,
                PriceData.price,
                PriceData.source,  # Also fetch the source for potential filtering
            )
            .filter(*filters)
            .all()
        )

        # If we're averaging across cities, remember which cities actually came back
        if avg_cities:
            all_cities_in_db = sorted({r.city_name for r in rows})

        # group: data[key][season][year] = [prices…]
        data = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
        for r in rows:
            key = f"{r.commodity}_{r.city_name}"
            data[key][r.season][r.year].append(r.price)

        # ────────── 4. Seasonal averages (without trend factors) ──────────
        season_stats = {}  # season_stats[key][season] = {avg_price}
        seasons_list = seasons  # alias for clarity
        for key, season_dict in data.items():
            season_stats[key] = {}
            for season in seasons_list:
                yearly_avgs = []
                for yr, prices in season_dict[season].items():
                    if prices:
                        yearly_avgs.append(sum(prices) / len(prices))

                overall_avg = sum(yearly_avgs) / len(yearly_avgs) if yearly_avgs else 0
                season_stats[key][season] = {"avg": overall_avg}

        # ────────── 5. Build datasets ──────────
        COLORS = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"]
        ds_idx = 0

        if avg_cities:
            # average across *all* cities present in rows
            for commodity in commodities:
                prices = []
                for label in season_labels:
                    season, yr = label.split()

                    # Calculate average price for this season across all cities
                    # WITHOUT applying any trend factor
                    total, cnt = 0, 0
                    for city in all_cities_in_db:
                        key = f"{commodity}_{city}"
                        st = season_stats.get(key, {}).get(season)
                        if st and st["avg"] > 0:
                            total += st["avg"]  # Just use the average price
                            cnt += 1
                    prices.append(round(total / cnt, 2) if cnt else 0)

                # Include the data source in the label
                source_label = "ProduceIQ & USDA" if "," in data_source else data_source
                result["datasets"].append(
                    {
                        "label": f"{commodity} – Avg Across Cities ({source_label})",
                        "data": prices,
                        "borderColor": COLORS[ds_idx % len(COLORS)],
                        "backgroundColor": COLORS[ds_idx % len(COLORS)],
                        "borderDash": [5, 5],
                    }
                )
                ds_idx += 1
        else:
            # one dataset per (commodity, city)
            for commodity in commodities:
                for city in cities:
                    key = f"{commodity}_{city}"
                    prices = []

                    # For each season label, get the corresponding seasonal average
                    # WITHOUT applying any trend factor
                    for label in season_labels:
                        season, yr = label.split()
                        st = season_stats.get(key, {}).get(season)
                        if st and st["avg"] > 0:
                            prices.append(round(st["avg"], 2))  # Just use the average
                        else:
                            prices.append(0)

                    # Include the data source in the label
                    source_label = (
                        "ProduceIQ & USDA" if "," in data_source else data_source
                    )
                    result["datasets"].append(
                        {
                            "label": f"{commodity} – {city} ({source_label})",
                            "data": prices,
                            "borderColor": COLORS[ds_idx % len(COLORS)],
                            "backgroundColor": COLORS[ds_idx % len(COLORS)],
                            "borderDash": [5, 5],
                        }
                    )
                    ds_idx += 1

        return jsonify(result)

    except Exception as exc:
        app.logger.error(f"forecast_line_data error: {exc}")
        return jsonify({"error": str(exc)}), 500


@app.route("/api/volatility_data", methods=["GET"])
def get_volatility_data():
    try:
        # Parse request parameters
        commodity = request.args.get("commodity", "")  # Single string for commodity
        cities = request.args.get("cities", "").split(",")
        time_frame = request.args.get("timeFrame", "1m")  # Time frame parameter
        data_source = request.args.get("source", "ProduceIQ")  # Data source parameter

        # Parse date range parameters
        start_date_str = request.args.get("startDate", "")
        end_date_str = request.args.get("endDate", "")

        # Check if commodity or cities are missing or empty
        if not commodity or not cities or cities[0] == "":
            return jsonify({"error": "Missing commodity or cities"}), 400

        # Parse start and end dates
        if start_date_str and end_date_str:
            try:
                start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
                end_date = datetime.strptime(end_date_str, "%Y-%m-%d")
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        else:
            # Default to current year if dates aren't provided
            end_date = datetime.now()
            start_date = datetime(end_date.year, 1, 1)  # January 1st of current year

        # Convert time frame to number of days
        days_to_fetch = 30  # Default to 1m
        if time_frame == "1d":
            days_to_fetch = 1
        elif time_frame == "3d":
            days_to_fetch = 3
        elif time_frame == "7d":
            days_to_fetch = 7
        elif time_frame == "14d":
            days_to_fetch = 14
        # 1m is default 30 days

        # Define result structure
        result = {"labels": [], "datasets": []}

        # Calculate the number of intervals based on date range and time frame
        # This determines how many candlesticks we'll have
        date_delta = (end_date - start_date).days + 1

        # For short time frames with few intervals, we'll show detailed labels
        if time_frame in ["1d", "3d", "7d"]:
            # Generate daily labels based on date range
            if date_delta <= 90:  # If less than 3 months, show daily dates
                current_date = start_date
                labels = []
                while current_date <= end_date:
                    labels.append(
                        current_date.strftime("%b %d")
                    )  # Format like "Apr 18"
                    current_date += timedelta(days=1)
                result["labels"] = labels
            else:
                # If more than 90 days, group into the time frame intervals
                # Calculate how many intervals are required to cover the date range
                num_intervals = max(1, date_delta // days_to_fetch)
                current_date = start_date
                labels = []

                for i in range(num_intervals):
                    interval_end = min(
                        current_date + timedelta(days=days_to_fetch - 1), end_date
                    )
                    label = f"{current_date.strftime('%b %d')} - {interval_end.strftime('%b %d')}"
                    labels.append(label)
                    current_date += timedelta(days=days_to_fetch)
                    if current_date > end_date:
                        break

                result["labels"] = labels

        elif time_frame == "14d":
            # For 14-day intervals, create bi-weekly labels
            # Calculate how many 14-day periods fit in the date range
            num_intervals = max(1, date_delta // 14)
            current_date = start_date
            labels = []

            for i in range(num_intervals):
                interval_end = min(
                    current_date + timedelta(days=13), end_date
                )  # 14 days including start date
                label = f"{current_date.strftime('%b %d')} - {interval_end.strftime('%b %d')}"
                labels.append(label)
                current_date += timedelta(days=14)
                if current_date > end_date:
                    break

            result["labels"] = labels

        elif time_frame == "1m":
            # For monthly view, group by months
            months_data = {}
            current_date = start_date
            labels = []

            # Generate month labels
            while current_date <= end_date:
                month_key = current_date.strftime("%Y-%m")
                month_label = current_date.strftime("%B %Y")

                if month_key not in months_data:
                    months_data[month_key] = {"label": month_label}
                    labels.append(month_label)

                current_date += timedelta(days=1)
                # If we've moved to a new month, update current_date to first day of that month
                if current_date.day == 1:
                    pass  # Already at the first day of a month

            result["labels"] = labels

        # Fetch price range data (min/max/open/close) for the selected commodity, across cities
        price_range_data = calculate_price_range_for_timeframe(
            commodity,
            cities,
            start_date,
            end_date,
            time_frame,
            days_to_fetch,
            data_source,
        )

        # Colors for the dataset
        colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"]
        color_index = 0

        # Include source in the label
        source_label = "ProduceIQ & USDA" if "," in data_source else data_source

        # Create dataset for this commodity's minimum prices
        min_dataset = {
            "label": f"{commodity} - Min Price ({source_label})",
            "data": price_range_data.get("min", [0] * len(result["labels"])),
            "borderColor": colors[color_index % len(colors)],
            "backgroundColor": "transparent",
            "borderWidth": 2,
            "borderDash": [],
            "pointRadius": 3,
            "fill": "false",
            "type": "line",
        }

        # Create dataset for this commodity's maximum prices
        max_dataset = {
            "label": f"{commodity} - Max Price ({source_label})",
            "data": price_range_data.get("max", [0] * len(result["labels"])),
            "borderColor": colors[color_index % len(colors)],
            "backgroundColor": colors[color_index % len(colors)]
            + "33",  # Add transparency
            "borderWidth": 2,
            "borderDash": [],
            "pointRadius": 3,
            "fill": "-1",  # Fill to previous dataset (min price)
            "type": "line",
        }

        # Create datasets for opening and closing prices (needed for candlestick)
        open_dataset = {
            "label": f"{commodity} - Open Price ({source_label})",
            "data": price_range_data.get("open", [0] * len(result["labels"])),
            "hidden": True,  # Hide from regular charts
            "borderColor": "transparent",
            "backgroundColor": "transparent",
            "pointRadius": 0,
            "fill": "false",
        }

        close_dataset = {
            "label": f"{commodity} - Close Price ({source_label})",
            "data": price_range_data.get("close", [0] * len(result["labels"])),
            "hidden": True,  # Hide from regular charts
            "borderColor": "transparent",
            "backgroundColor": "transparent",
            "pointRadius": 0,
            "fill": "false",
        }

        # Add datasets to result
        result["datasets"].append(min_dataset)
        result["datasets"].append(max_dataset)
        result["datasets"].append(open_dataset)
        result["datasets"].append(close_dataset)

        # Get the latest price data
        latest_price_data = get_latest_price(commodity, cities, data_source)

        # Add it to the result dictionary
        result["latest_price"] = latest_price_data

        return jsonify(result)

    except Exception as e:
        app.logger.error(f"Error in price range data: {str(e)}")
        return jsonify({"error": str(e)}), 500


def calculate_price_range_for_timeframe(
    commodity,
    cities,
    start_date,
    end_date,
    time_frame,
    days_to_fetch,
    data_source="ProduceIQ",
):
    """
    Calculate price ranges (min, max, open, close) for the selected commodity,
    aggregated across all selected cities, using the same averaging approach as historical_data.
    """
    try:
        from collections import defaultdict

        result = {
            "min": [],
            "max": [],
            "open": [],  # First price in the period
            "close": [],  # Last price in the period
        }

        # Convert dates to days of year for filtering
        start_year = start_date.year
        end_year = end_date.year

        start_day_of_year = start_date.timetuple().tm_yday
        end_day_of_year = end_date.timetuple().tm_yday

        # Handle source filtering
        if data_source == "ProduceIQ,USDA" or data_source == "USDA,ProduceIQ":
            # Include both sources
            source_filter = PriceData.source.in_(["ProduceIQ", "USDA"])
        else:
            # Use specified source
            source_filter = PriceData.source == data_source

        # Query conditions to filter by date range
        query_conditions = [
            PriceData.commodity == commodity,
            PriceData.city_name.in_(cities),
            source_filter,
        ]

        # Handle date range query differently depending on if it spans multiple years
        if start_year == end_year:
            # Single year query
            query_conditions.extend(
                [
                    PriceData.year == start_year,
                    PriceData.day >= start_day_of_year,
                    PriceData.day <= end_day_of_year,
                ]
            )

            all_data = (
                db.session.query(
                    PriceData.day, PriceData.price, PriceData.year, PriceData.city_name
                )
                .filter(*query_conditions)
                .all()
            )

        else:
            # Multi-year query (need to handle each year separately)
            # First year: from start_day to end of year
            first_year_conditions = query_conditions.copy()
            first_year_conditions.extend(
                [PriceData.year == start_year, PriceData.day >= start_day_of_year]
            )

            # Last year: from beginning of year to end_day
            last_year_conditions = query_conditions.copy()
            last_year_conditions.extend(
                [PriceData.year == end_year, PriceData.day <= end_day_of_year]
            )

            # Middle years (if any): entire years
            middle_years = list(range(start_year + 1, end_year))
            middle_year_data = []

            if middle_years:
                middle_year_conditions = query_conditions.copy()
                middle_year_conditions.append(PriceData.year.in_(middle_years))
                middle_year_data = (
                    db.session.query(
                        PriceData.day,
                        PriceData.price,
                        PriceData.year,
                        PriceData.city_name,
                    )
                    .filter(*middle_year_conditions)
                    .all()
                )

            # Query for first and last year data
            first_year_data = (
                db.session.query(
                    PriceData.day, PriceData.price, PriceData.year, PriceData.city_name
                )
                .filter(*first_year_conditions)
                .all()
            )

            last_year_data = (
                db.session.query(
                    PriceData.day, PriceData.price, PriceData.year, PriceData.city_name
                )
                .filter(*last_year_conditions)
                .all()
            )

            # Combine all the data
            all_data = first_year_data + middle_year_data + last_year_data

        # First, average data by day and city (just like in historical_data)
        daily_city_data = {}

        for row in all_data:
            # Create a date object for this data point
            row_date = datetime(row.year, 1, 1) + timedelta(days=row.day - 1)
            date_key = row_date.strftime("%Y-%m-%d")
            city_key = row.city_name

            # Create compound key for date+city
            compound_key = f"{date_key}_{city_key}"

            # Initialize the structure for this date+city if it doesn't exist
            if compound_key not in daily_city_data:
                daily_city_data[compound_key] = {
                    "sum": 0,
                    "count": 0,
                    "date": row_date,
                    "city": city_key,
                }

            # Sum up prices and count entries for this date+city
            daily_city_data[compound_key]["sum"] += row.price
            daily_city_data[compound_key]["count"] += 1

        # Then average across cities for each day
        daily_avg_data = {}

        for key, data in daily_city_data.items():
            date_str = data["date"].strftime("%Y-%m-%d")

            if date_str not in daily_avg_data:
                daily_avg_data[date_str] = {"sum": 0, "count": 0, "date": data["date"]}

            # Add the city average to the daily total
            city_avg = data["sum"] / data["count"]
            daily_avg_data[date_str]["sum"] += city_avg
            daily_avg_data[date_str]["count"] += 1

        # Convert daily averages to date-price pairs
        daily_data = []
        for date_str, data in daily_avg_data.items():
            if data["count"] > 0:  # Ensure we have data for this day
                avg_price = data["sum"] / data["count"]
                daily_data.append((data["date"], avg_price))

        # Sort by date
        daily_data.sort(key=lambda x: x[0])

        # Process based on time frame
        if time_frame == "1m":
            # Group by month
            data_by_month = defaultdict(list)
            data_by_month_with_dates = defaultdict(list)

            for date, price in daily_data:
                month_key = date.strftime("%Y-%m")
                data_by_month[month_key].append(price)
                data_by_month_with_dates[month_key].append((date, price))

            # Sort months chronologically
            sorted_months = sorted(data_by_month.keys())

            # Calculate min, max, open, and close for each month
            for month in sorted_months:
                prices = data_by_month[month]
                date_price_pairs = data_by_month_with_dates[month]

                if prices:
                    # Sort by date to determine open (first) and close (last)
                    date_price_pairs.sort(key=lambda x: x[0])
                    open_price = date_price_pairs[0][1]  # First price in month
                    close_price = date_price_pairs[-1][1]  # Last price in month

                    result["min"].append(round(min(prices), 2))
                    result["max"].append(round(max(prices), 2))
                    result["open"].append(round(open_price, 2))
                    result["close"].append(round(close_price, 2))
                else:
                    result["min"].append(0)
                    result["max"].append(0)
                    result["open"].append(0)
                    result["close"].append(0)
        else:
            # For other time frames, group by the specified interval
            # Convert all data to actual dates for easier grouping

            # Group data into intervals based on time_frame
            interval_data = defaultdict(list)

            current_interval_start = start_date
            interval_index = 0

            # Store data by interval with date info for sorting
            interval_data_with_dates = defaultdict(list)

            for date, price in daily_data:
                # Check if this data point belongs to current interval or we need to move to next interval
                while date > current_interval_start + timedelta(days=days_to_fetch - 1):
                    # Move to next interval
                    current_interval_start += timedelta(days=days_to_fetch)
                    interval_index += 1

                    # If we've moved past the end date, break
                    if current_interval_start > end_date:
                        break

                # If date is within current interval, add the price
                if (
                    current_interval_start
                    <= date
                    <= current_interval_start + timedelta(days=days_to_fetch - 1)
                ):
                    interval_data[interval_index].append(price)
                    interval_data_with_dates[interval_index].append((date, price))

            # Calculate min, max, open, and close for each interval
            for i in range(len(interval_data)):
                prices = interval_data.get(i, [])
                date_price_pairs = interval_data_with_dates.get(i, [])

                if prices:
                    # Sort by date to determine open (first) and close (last)
                    date_price_pairs.sort(key=lambda x: x[0])
                    open_price = date_price_pairs[0][1]  # First price in interval
                    close_price = date_price_pairs[-1][1]  # Last price in interval

                    result["min"].append(round(min(prices), 2))
                    result["max"].append(round(max(prices), 2))
                    result["open"].append(round(open_price, 2))
                    result["close"].append(round(close_price, 2))
                else:
                    result["min"].append(0)
                    result["max"].append(0)
                    result["open"].append(0)
                    result["close"].append(0)

        return result

    except Exception as e:
        app.logger.error(f"Error calculating price ranges: {str(e)}")
        return {"min": [], "max": [], "open": [], "close": []}


def get_latest_price(commodity, cities, data_source="ProduceIQ"):
    """
    Get the absolute most recent price for the specified commodity and cities.
    """
    try:
        # Handle source filtering
        if data_source == "ProduceIQ,USDA" or data_source == "USDA,ProduceIQ":
            # Include both sources
            source_filter = PriceData.source.in_(["ProduceIQ", "USDA"])
        else:
            # Use specified source
            source_filter = PriceData.source == data_source

        # Simple query to get the latest price
        latest_price_query = (
            db.session.query(PriceData.price, PriceData.year, PriceData.day)
            .filter(
                PriceData.commodity == commodity,
                PriceData.city_name.in_(cities),
                source_filter,
            )
            .order_by(PriceData.year.desc(), PriceData.day.desc())
            .first()
        )

        if not latest_price_query:
            return {"price": 0, "date": None}

        # Calculate the date
        latest_date = datetime(latest_price_query.year, 1, 1) + timedelta(
            days=latest_price_query.day - 1
        )

        # Format the result
        result = {
            "price": round(latest_price_query.price, 2),
            "date": latest_date.strftime("%b %d, %Y"),
        }

        return result

    except Exception as e:
        app.logger.error(f"Error getting latest price: {str(e)}")
        return {"price": 0, "date": None}


# Helper function to get the first and last day of a month
def get_month_day_range(month, year):
    """
    Returns the first and last day of the month as days of the year.
    """
    # First day of the month
    first_day = datetime(year, month, 1)
    first_day_of_year = first_day.timetuple().tm_yday

    # Last day of the month (first day of next month - 1 day)
    if month == 12:
        last_day = datetime(year + 1, 1, 1) - timedelta(days=1)
    else:
        last_day = datetime(year, month + 1, 1) - timedelta(days=1)

    last_day_of_year = last_day.timetuple().tm_yday

    return first_day_of_year, last_day_of_year


# Existing calculate_forecast helper functions can be reused
from sqlalchemy import desc


@app.route("/api/break_even/save", methods=["POST"])
def save_break_even_estimation():
    """
    Save a break-even estimation to the database
    Uses the same data from calculate_forecast and adds additional fields
    """
    data = request.json

    try:
        # Extract all fields from the request
        variety = data.get("variety")
        city = data.get("city")  # Added for forecast line data
        start_date_str = data.get("start_date")
        forecast_date_str = data.get("forecast_date")
        yield_per_acre = data.get("yield_per_acre")
        cost_per_acre = data.get("cost_per_acre", 0)
        harvest_cost_per_box = data.get("harvest_cost_per_box", 0)
        cost_of_box = data.get("cost_of_box", 0)
        boxes_bonus_per_yield = data.get("boxes_bonus_per_yield", 0)
        start_date_range_str = data.get("start_date_range")
        end_date_range_str = data.get("end_date_range")
        source = data.get("source", "ProduceIQ")

        # Validate required fields
        if not all(
            [
                variety,
                city,
                start_date_str,
                forecast_date_str,
                yield_per_acre,
                start_date_range_str,
                end_date_range_str,
            ]
        ):
            return jsonify({"error": "Missing required fields"}), 400

        # Convert string dates to datetime objects
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
        forecast_date = datetime.strptime(forecast_date_str, "%Y-%m-%d")
        start_date_range = datetime.strptime(start_date_range_str, "%Y-%m-%d")
        end_date_range = datetime.strptime(end_date_range_str, "%Y-%m-%d")

        # Convert numeric fields to float
        yield_per_acre = float(yield_per_acre)
        cost_per_acre = float(cost_per_acre)
        harvest_cost_per_box = float(harvest_cost_per_box)
        cost_of_box = float(cost_of_box)
        boxes_bonus_per_yield = float(boxes_bonus_per_yield)

        # Calculate forecasted price using the same function as the forecast component
        forecasted_price = calculate_forecasted_price(
            variety, start_date, forecast_date, city, source
        )
        revenue_per_acre = forecasted_price * yield_per_acre

        # Calculate total costs
        total_costs = (
            cost_per_acre
            + (harvest_cost_per_box * yield_per_acre)
            + (cost_of_box * yield_per_acre)
            + boxes_bonus_per_yield
        )

        # Calculate revenue after costs
        revenue_after_costs = revenue_per_acre - total_costs

        # Determine season
        season = determine_season_for_dashboard(forecast_date)

        # Calculate revenue per box
        revenue_per_box = (
            revenue_after_costs / yield_per_acre if yield_per_acre > 0 else 0
        )

        # Create new BreakEvenEstimation instance
        estimation = BreakEvenEstimation(
            variety=variety,
            city=city,
            start_date=start_date,
            forecast_date=forecast_date,
            yield_per_acre=yield_per_acre,
            cost_per_acre=cost_per_acre,
            harvest_cost_per_box=harvest_cost_per_box,
            cost_of_box=cost_of_box,
            boxes_bonus_per_yield=boxes_bonus_per_yield,
            start_date_range=start_date_range,
            end_date_range=end_date_range,
            forecasted_price=forecasted_price,
            revenue_per_acre=revenue_per_acre,
            revenue_after_costs=revenue_after_costs,
            revenue_per_box=revenue_per_box,
            season=season,
            source=source,  # Add this line (requires DB model update)
        )

        db.session.add(estimation)
        db.session.commit()

        return (
            jsonify(
                {
                    "id": estimation.id,
                    "message": "Break-even estimation saved successfully",
                }
            ),
            201,
        )

    except ValueError as e:
        return jsonify({"error": f"Invalid data: {str(e)}"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to save estimation: {str(e)}"}), 500


@app.route("/api/break_even", methods=["GET"])
def get_break_even_estimations():
    """Get all break-even estimations with guaranteed fresh data."""
    try:
        # Always bypass cache for this route
        print(f"Fetching fresh break-even estimations for route: {request.path}")

        # Query all estimations, ordered by creation date (newest first)
        estimations = BreakEvenEstimation.query.order_by(
            desc(BreakEvenEstimation.created_at)
        ).all()

        # Convert to dictionaries for JSON response
        result = [estimation.to_dict() for estimation in estimations]

        # Completely remove any cached data
        cache.clear()  # This clears the entire cache

        # Create response with aggressive no-cache headers
        response = jsonify(result)
        response.headers["Cache-Control"] = (
            "no-store, no-cache, must-revalidate, max-age=0, s-maxage=0, proxy-revalidate"
        )
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        response.headers["X-Accel-Expires"] = "0"  # Nginx cache control

        return response, 200

    except Exception as e:
        print(f"Error fetching break-even estimations: {str(e)}")

        response = jsonify(
            {"error": "Failed to retrieve break-even estimations", "details": str(e)}
        )
        response.headers["Cache-Control"] = (
            "no-store, no-cache, must-revalidate, max-age=0, s-maxage=0, proxy-revalidate"
        )
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        response.headers["X-Accel-Expires"] = "0"

        return response, 500


@app.route("/api/break_even/<int:estimation_id>", methods=["GET"])
def get_break_even_estimation(estimation_id):
    """Get a specific break-even estimation"""
    try:
        # Query the estimation by ID
        estimation = BreakEvenEstimation.query.filter_by(id=estimation_id).first()

        if not estimation:
            return jsonify({"error": "Estimation not found"}), 404

        return jsonify(estimation.to_dict()), 200
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve estimation: {str(e)}"}), 500


@app.route("/api/break_even/<int:estimation_id>", methods=["DELETE"])
def delete_break_even_estimation(estimation_id):
    """Delete a break-even estimation"""
    try:
        # Query the estimation by ID
        estimation = BreakEvenEstimation.query.filter_by(id=estimation_id).first()

        if not estimation:
            return jsonify({"error": "Estimation not found"}), 404

        # Delete the estimation
        db.session.delete(estimation)
        db.session.commit()

        return jsonify({"message": "Estimation deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to delete estimation: {str(e)}"}), 500


@app.route("/api/break_even/<int:estimation_id>", methods=["PUT"])
def update_break_even_estimation(estimation_id):
    """Update an existing break-even estimation"""
    data = request.json

    try:
        # Query the estimation by ID
        estimation = BreakEvenEstimation.query.filter_by(id=estimation_id).first()

        if not estimation:
            return jsonify({"error": "Estimation not found"}), 404

        # Update fields if provided
        if "variety" in data:
            estimation.variety = data["variety"]
        if "city" in data:
            estimation.city = data["city"]
        if "start_date" in data:
            estimation.start_date = datetime.strptime(data["start_date"], "%Y-%m-%d")
        if "forecast_date" in data:
            estimation.forecast_date = datetime.strptime(
                data["forecast_date"], "%Y-%m-%d"
            )
        if "yield_per_acre" in data:
            estimation.yield_per_acre = float(data["yield_per_acre"])
        if "cost_per_acre" in data:
            estimation.cost_per_acre = float(data["cost_per_acre"])
        if "harvest_cost_per_box" in data:
            estimation.harvest_cost_per_box = float(data["harvest_cost_per_box"])
        if "cost_of_box" in data:
            estimation.cost_of_box = float(data["cost_of_box"])
        if "boxes_bonus_per_yield" in data:
            estimation.boxes_bonus_per_yield = float(data["boxes_bonus_per_yield"])
        if "start_date_range" in data:
            estimation.start_date_range = datetime.strptime(
                data["start_date_range"], "%Y-%m-%d"
            )
        if "end_date_range" in data:
            estimation.end_date_range = datetime.strptime(
                data["end_date_range"], "%Y-%m-%d"
            )

        # Recalculate derived fields if any inputs changed
        if any(
            key in data
            for key in [
                "variety",
                "city",
                "start_date",
                "forecast_date",
                "yield_per_acre",
                "cost_per_acre",
                "harvest_cost_per_box",
                "cost_of_box",
                "boxes_bonus_per_yield",
            ]
        ):
            # Recalculate using the same function as the forecast component
            forecasted_price = calculate_forecasted_price(
                estimation.variety,
                estimation.start_date,
                estimation.forecast_date,
                estimation.city,
            )

            # Update the estimation fields
            estimation.forecasted_price = forecasted_price
            estimation.revenue_per_acre = forecasted_price * estimation.yield_per_acre

            # Recalculate total costs
            total_costs = (
                estimation.cost_per_acre
                + (estimation.harvest_cost_per_box * estimation.yield_per_acre)
                + (estimation.cost_of_box * estimation.yield_per_acre)
                + estimation.boxes_bonus_per_yield
            )

            # Update revenue after costs
            estimation.revenue_after_costs = estimation.revenue_per_acre - total_costs

            # Update season
            estimation.season = determine_season_for_dashboard(estimation.forecast_date)

            # Recalculate revenue per box
            if estimation.yield_per_acre > 0:
                estimation.revenue_per_box = (
                    estimation.revenue_after_costs / estimation.yield_per_acre
                )

        db.session.commit()

        return (
            jsonify(
                {
                    "message": "Estimation updated successfully",
                    "estimation": estimation.to_dict(),
                }
            ),
            200,
        )
    except ValueError as e:
        return jsonify({"error": f"Invalid data: {str(e)}"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to update estimation: {str(e)}"}), 500


@app.route("/api/break_even_chart_data", methods=["GET"])
def get_break_even_chart_data():
    """
    Generate chart data specifically for break-even analysis using calculate_forecasted_price
    Uses historical data from start_date to current_date, then forecasts future seasons
    """
    try:
        # Extract parameters from the request
        variety = request.args.get("variety")
        city = request.args.get("city")
        start_date_str = request.args.get("start_date")
        current_date_str = request.args.get(
            "current_date", datetime.now().strftime("%Y-%m-%d")
        )
        forecast_date_str = request.args.get("forecast_date")
        is_all_cities = request.args.get("is_all_cities") == "true"
        data_source = request.args.get("source", "ProduceIQ")  # Add this line

        # Validate required parameters
        if not variety or not start_date_str:
            return jsonify({"error": "Missing required parameters"}), 400

        # Parse dates
        start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
        current_date = datetime.strptime(current_date_str, "%Y-%m-%d")

        # If forecast date is provided, use it; otherwise default to current_date + 1 year
        if forecast_date_str:
            forecast_date = datetime.strptime(forecast_date_str, "%Y-%m-%d")
        else:
            forecast_date = current_date + timedelta(days=365)

        # Handle "All Cities" case
        if is_all_cities or city == "All Cities":
            city = "All cities"

        # Initialize result structure
        result = {"labels": [], "datasets": []}

        # Define seasons and determine current season
        seasons = ["Winter", "Spring", "Summer", "Autumn"]

        month = current_date.month
        current_season = (
            "Spring"
            if 3 <= month <= 5
            else (
                "Summer"
                if 6 <= month <= 8
                else "Autumn" if 9 <= month <= 11 else "Winter"
            )
        )

        current_season_index = seasons.index(current_season)
        current_year = current_date.year

        # Generate labels for 1 year forward (4 seasons) starting from current season
        labels = []
        for i in range(4):
            season_index = (current_season_index + i) % 4
            year = current_year + ((current_season_index + i) // 4)
            labels.append(f"{seasons[season_index]} {year}")

        result["labels"] = labels

        # Calculate prices for each season
        prices = []
        for label in labels:
            season, year = label.split()
            year = int(year)

            # Calculate the middle date of this season
            if season == "Spring":
                month = 4  # April
            elif season == "Summer":
                month = 7  # July
            elif season == "Autumn":
                month = 10  # October
            else:  # Winter
                month = 1  # January

            # Middle of the month
            day = 15

            # Create forecast date for this season
            season_date = datetime(year, month, day)

            # Use the calculate_forecasted_price function with historical data
            # start_date is the historical starting point, season_date is the future date to predict
            price = calculate_forecasted_price(
                variety, start_date, season_date, city, data_source
            )
            prices.append(round(price, 2))

        # Add dataset for the variety
        source_label = "ProduceIQ & USDA" if "," in data_source else data_source
        result["datasets"] = [
            {
                "label": f"{variety} Forecast Price ({source_label})",
                "data": prices,
                "borderColor": "#FF6384",
                "backgroundColor": "#FF6384",
                "borderWidth": 2,
                "pointRadius": 3,
                "pointHoverRadius": 5,
                "tension": 0.1,
                "fill": "false",
                "borderDash": [5, 5],
            }
        ]

        return jsonify(result)

    except Exception as e:
        app.logger.error(f"Break-even chart data error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/commodities", methods=["GET"])
# @jwt_required()
def get_commodities():
    """Get list of available commodities."""
    try:
        # Get unique commodity names from price data
        commodities = db.session.query(PriceData.commodity).distinct().all()
        commodity_list = [commodity[0] for commodity in commodities]

        # Standardize commodity names
        standardized_commodities = []
        for commodity in commodity_list:
            # Handle the specific case of Cubanelle/Cubanelles
            if commodity.lower() in ["cubanelle", "cubanelles"]:
                if "Cubanelles" not in standardized_commodities:
                    standardized_commodities.append("Cubanelles")
            else:
                standardized_commodities.append(commodity)

        return jsonify(sorted(standardized_commodities))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# A function to check whether the current route should be cached
def should_cache_route():
    return request.path not in app.config["CACHE_NO_CACHE_ROUTES"]


# Update your caching logic in the relevant routes:


@app.route("/api/harvest_planning", methods=["POST"])
def harvest_planning():
    try:
        from collections import defaultdict

        payload = request.json
        if not payload or "varieties" not in payload:
            return jsonify({"error": "Missing varieties data"}), 400

        result = []
        now = datetime.now()
        current_year = now.year

        seasons = ["Winter", "Spring", "Summer", "Autumn"]
        season_month_map = {"Winter": 1, "Spring": 4, "Summer": 7, "Autumn": 10}

        # Process each variety separately to match forecast_line_data exactly
        for variety in payload["varieties"]:
            # Validate required fields
            required_fields = [
                "name",
                "plantingDate",
                "growingDays",
                "harvestPeriod",
                "sellingPeriod",
            ]
            for f in required_fields:
                if f not in variety:
                    return jsonify({"error": f"Missing field {f}"}), 400

            # Parse dates
            plant = datetime.fromisoformat(
                variety["plantingDate"].replace("Z", "+00:00")
            )
            grow_days = int(variety["growingDays"])
            harvest_period = int(variety["harvestPeriod"])
            selling_period = int(variety["sellingPeriod"])

            # Calculate dates
            harvest_start = plant + timedelta(days=grow_days)
            harvest_end = harvest_start + timedelta(days=harvest_period * 30)
            selling_start = harvest_end
            selling_end = selling_start + timedelta(days=selling_period * 30)

            commodity = variety["name"]
            market = variety.get("market", "").strip()
            source = variety.get("source", "ProduceIQ")

            # Handle market selection
            if market.lower() in ("select all", "all", "national", ""):
                cities = []  # Empty means average all cities
                avg_cities = True
            else:
                cities = [market]
                avg_cities = False

            # Build filters exactly like forecast_line_data
            filters = [
                PriceData.commodity == commodity,
                PriceData.year >= current_year - 5,
            ]

            # Handle source filtering exactly like forecast_line_data
            if source == "ProduceIQ,USDA" or source == "USDA,ProduceIQ":
                filters.append(PriceData.source.in_(["ProduceIQ", "USDA"]))
            else:
                filters.append(PriceData.source == source)

            # Only filter by city if not averaging all cities
            if not avg_cities:
                filters.append(PriceData.city_name.in_(cities))

            # Get historical data
            rows = (
                db.session.query(
                    PriceData.commodity,
                    PriceData.city_name,
                    PriceData.year,
                    PriceData.season,
                    PriceData.price,
                    PriceData.source,
                )
                .filter(*filters)
                .all()
            )

            # Group data exactly like forecast_line_data
            data = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
            for r in rows:
                key = f"{r.commodity}_{r.city_name}"
                data[key][r.season][r.year].append(r.price)

            # Calculate seasonal averages exactly like forecast_line_data
            season_stats = {}
            for key, season_dict in data.items():
                season_stats[key] = {}
                for season in seasons:
                    yearly_avgs = []
                    for yr, prices in season_dict[season].items():
                        if prices:
                            yearly_avgs.append(sum(prices) / len(prices))

                    overall_avg = (
                        sum(yearly_avgs) / len(yearly_avgs) if yearly_avgs else 0
                    )
                    season_stats[key][season] = {"avg": overall_avg}

            # Find best selling time
            best_season = None
            best_year = None
            highest_price = 0
            best_date = None

            # Check each season to find the highest price (only after harvest end)
            for year in range(current_year, current_year + 3):
                for season in seasons:
                    month = season_month_map[season]
                    season_date = datetime(year, month, 15)

                    # Only consider seasons after harvest is complete
                    if season_date <= harvest_end:
                        continue

                    # Calculate price exactly like forecast_line_data
                    if avg_cities:
                        # Average across all cities present in rows
                        all_cities_in_db = sorted({r.city_name for r in rows})
                        total, cnt = 0, 0
                        for city in all_cities_in_db:
                            key = f"{commodity}_{city}"
                            st = season_stats.get(key, {}).get(season)
                            if st and st["avg"] > 0:
                                total += st["avg"]
                                cnt += 1
                        avg_price = total / cnt if cnt else 0
                    else:
                        # Specific city
                        key = f"{commodity}_{cities[0]}"
                        st = season_stats.get(key, {}).get(season)
                        avg_price = st["avg"] if st and st["avg"] > 0 else 0

                    if avg_price > highest_price:
                        highest_price = avg_price
                        best_season = season
                        best_year = year
                        best_date = season_date

            # Calculate expected selling price exactly like forecast data
            expected_price = 0
            selling_seasons = set()
            price_details = []
            season_prices = []

            # Find all seasons in selling period
            current_date = selling_start
            while current_date <= selling_end:
                month = current_date.month
                season = (
                    "Spring"
                    if 3 <= month <= 5
                    else (
                        "Summer"
                        if 6 <= month <= 8
                        else "Autumn" if 9 <= month <= 11 else "Winter"
                    )
                )

                if season not in selling_seasons:
                    selling_seasons.add(season)

                    # Get price for this season using same logic as above
                    if avg_cities:
                        all_cities_in_db = sorted({r.city_name for r in rows})
                        total, cnt = 0, 0
                        for city in all_cities_in_db:
                            key = f"{commodity}_{city}"
                            st = season_stats.get(key, {}).get(season)
                            if st and st["avg"] > 0:
                                total += st["avg"]
                                cnt += 1
                        avg_price = total / cnt if cnt else 0
                    else:
                        key = f"{commodity}_{cities[0]}"
                        st = season_stats.get(key, {}).get(season)
                        avg_price = st["avg"] if st and st["avg"] > 0 else 0

                    if avg_price > 0:
                        season_prices.append(avg_price)
                        price_details.append(f"{season}: ${avg_price:.2f}")

                current_date = current_date + timedelta(days=30)

            # Calculate final expected price
            if season_prices:
                expected_price = sum(season_prices) / len(season_prices)
                if len(selling_seasons) == 1:
                    price_description = (
                        f"Price for {list(selling_seasons)[0]}: ${expected_price:.2f}"
                    )
                else:
                    price_description = f"Average of {', '.join(price_details)}"
            else:
                expected_price = 0
                price_description = "No price data available"

            result.append(
                {
                    "name": commodity,
                    "plantingDate": plant.isoformat(),
                    "harvestStartDate": harvest_start.isoformat(),
                    "harvestEndDate": harvest_end.isoformat(),
                    "sellingStartDate": selling_start.isoformat(),
                    "sellingEndDate": selling_end.isoformat(),
                    "growingDays": grow_days,
                    "harvestPeriod": harvest_period,
                    "sellingPeriod": selling_period,
                    "source": source,
                    "bestSellingTime": {
                        "season": best_season,
                        "year": best_year,
                        "price": round(highest_price, 2),
                        "date": best_date.isoformat() if best_date else None,
                    },
                    "expectedSellingPrice": round(expected_price, 2),
                    "priceDescription": price_description,
                }
            )

        return jsonify({"varieties": result})

    except Exception as e:
        app.logger.exception("Error in harvest_planning")
        return jsonify({"error": str(e)}), 500


@app.route("/api/alert-entries-fresh", methods=["GET"])
@jwt_required()
def get_alert_settings_fresh():
    """Fetch all alert settings for the current user with guaranteed fresh data."""
    try:
        # Get current user ID from the JWT token
        current_user_id = get_jwt_identity()

        # Always bypass cache for this route
        print(f"Fetching fresh alert settings for user {current_user_id}")

        # Query the database directly to get the most recent data for this user
        settings = AlertSetting.query.filter_by(user_id=current_user_id).all()
        result = [alert.to_dict() for alert in settings]

        # Completely remove any cached data
        cache.delete(f"alert_settings:{current_user_id}")

        # Create response with aggressive no-cache headers
        response = jsonify(result)
        response.headers["Cache-Control"] = (
            "no-store, no-cache, must-revalidate, max-age=0, s-maxage=0, proxy-revalidate"
        )
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        response.headers["X-Accel-Expires"] = "0"

        return response

    except Exception as e:
        print(f"Error fetching alert settings: {str(e)}")

        response = jsonify(
            {"error": "Failed to retrieve alert settings", "details": str(e)}
        )
        response.headers["Cache-Control"] = (
            "no-store, no-cache, must-revalidate, max-age=0, s-maxage=0, proxy-revalidate"
        )
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        response.headers["X-Accel-Expires"] = "0"

        return response, 500


@app.route("/api/alert-settings", methods=["POST"])
@jwt_required()
def create_alert_setting():
    """Create a new alert setting for the current user."""
    # Get current user ID from the JWT token
    current_user_id = get_jwt_identity()

    # Log the incoming request details
    app.logger.info(
        f"Received alert setting creation request for user {current_user_id}"
    )

    try:
        # Validate request data
        data = request.json
        if not data:
            response = jsonify({"error": "No data provided"})
            response.headers["Cache-Control"] = (
                "no-store, no-cache, must-revalidate, max-age=0"
            )
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
            return response, 400

        # Validate city (required field)
        city = data.get("city")
        if not city or not isinstance(city, str):
            response = jsonify({"error": "Valid city is required"})
            response.headers["Cache-Control"] = (
                "no-store, no-cache, must-revalidate, max-age=0"
            )
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
            return response, 400

        # Validate commodity (required field)
        commodity = data.get("commodity")
        if not commodity or not isinstance(commodity, str):
            response = jsonify({"error": "Valid commodity is required"})
            response.headers["Cache-Control"] = (
                "no-store, no-cache, must-revalidate, max-age=0"
            )
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
            return response, 400

        # Validate and sanitize threshold
        try:
            threshold = float(data.get("threshold", 5.0))
            # No bounds check on threshold so it can be negative for price decreases
        except (TypeError, ValueError):
            response = jsonify({"error": "Invalid threshold value"})
            response.headers["Cache-Control"] = (
                "no-store, no-cache, must-revalidate, max-age=0"
            )
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
            return response, 400

        # Validate is_active (use default if not provided)
        is_active = bool(data.get("isActive", True))

        # Check for duplicate alert setting for this user
        existing_alert = AlertSetting.query.filter_by(
            user_id=current_user_id, city=city, commodity=commodity, threshold=threshold
        ).first()

        if existing_alert:
            response = jsonify(
                {
                    "error": "You already have an alert for this commodity and city with the same threshold",
                    "existing_alert_id": existing_alert.id,
                }
            )
            response.headers["Cache-Control"] = (
                "no-store, no-cache, must-revalidate, max-age=0"
            )
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
            return response, 409  # Conflict status code

        # Create new alert setting with user_id and city
        new_alert = AlertSetting(
            user_id=current_user_id,
            city=city.strip(),
            commodity=commodity.strip(),
            threshold=threshold,
            is_active=is_active,
        )

        # Add the new alert to the session and commit
        db.session.add(new_alert)
        db.session.commit()

        # Update the user-specific cache
        settings = AlertSetting.query.filter_by(user_id=current_user_id).all()
        result = [alert.to_dict() for alert in settings]
        cache.set(f"alert_settings:{current_user_id}", result, timeout=300)

        # Log successful creation
        app.logger.info(
            f"Alert setting created for user {current_user_id}: City={city}, Commodity={commodity}, Threshold={threshold}"
        )

        # Prepare response
        response = jsonify(new_alert.to_dict())
        response.headers["Cache-Control"] = (
            "no-store, no-cache, must-revalidate, max-age=0"
        )
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

        return response, 201

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating alert setting: {str(e)}")

        response = jsonify({"error": "An unexpected error occurred", "details": str(e)})
        response.headers["Cache-Control"] = (
            "no-store, no-cache, must-revalidate, max-age=0"
        )
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

        return response, 500


@app.route("/api/alert-settings/<int:alert_id>", methods=["PATCH"])
@jwt_required()
def update_alert_setting(alert_id):
    """Update an existing alert setting."""
    current_user_id = get_jwt_identity()
    data = request.json

    try:
        # Find the alert setting for this user
        alert = AlertSetting.query.filter_by(
            id=alert_id, user_id=current_user_id
        ).first()

        if not alert:
            return jsonify({"error": "Alert setting not found"}), 404

        # Update fields
        if "threshold" in data:
            alert.threshold = float(data["threshold"])

        if "isActive" in data:
            alert.is_active = bool(data["isActive"])

        alert.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify(alert.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/api/delete-alert-by-id", methods=["POST"])
@jwt_required()
def delete_alert_by_id():
    """Delete an alert by ID for the current user."""
    current_user_id = get_jwt_identity()
    try:
        data = request.json
        alert_id = data.get("id")

        if not alert_id:
            response = jsonify({"error": "Alert ID is required"})
            response.headers["Cache-Control"] = (
                "no-store, no-cache, must-revalidate, max-age=0"
            )
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
            return response, 400

        # Find the alert by ID and user_id
        alert = AlertSetting.query.filter_by(
            id=alert_id, user_id=current_user_id
        ).first()

        if not alert:
            response = jsonify(
                {"error": "No alert found with this ID for your account"}
            )
            response.headers["Cache-Control"] = (
                "no-store, no-cache, must-revalidate, max-age=0"
            )
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
            return response, 404

        # Delete the alert
        db.session.delete(alert)
        db.session.commit()

        # Update user's cache
        cache.delete(f"alert_settings:{current_user_id}")

        response = jsonify(
            {
                "success": True,
                "message": f"Alert with ID {alert_id} deleted successfully",
                "deleted_alert": {
                    "id": alert.id,
                    "commodity": alert.commodity,
                    "threshold": alert.threshold,
                },
            }
        )

        # Add no-cache headers
        response.headers["Cache-Control"] = (
            "no-store, no-cache, must-revalidate, max-age=0"
        )
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"

        return response

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/api/notifications", methods=["GET"])
@jwt_required()
def get_notifications():
    """Get all notifications for the current user."""
    current_user_id = get_jwt_identity()
    try:
        notifications = (
            Notification.query.filter_by(user_id=current_user_id)
            .order_by(Notification.created_at.desc())
            .all()
        )
        return jsonify([notification.to_dict() for notification in notifications])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/notifications/unread-count", methods=["GET"])
@jwt_required()
def get_unread_count():
    """Get count of unread notifications for the current user."""
    current_user_id = get_jwt_identity()
    try:
        # Count unread notifications for this user
        count = Notification.query.filter_by(
            user_id=current_user_id, is_read=False
        ).count()

        return jsonify({"count": count})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/notifications/<int:notification_id>", methods=["PATCH"])
@jwt_required()  # Add this decorator
def update_notification(notification_id):
    """Update a notification (mark as read)."""
    current_user_id = get_jwt_identity()  # Get the current user
    data = request.json

    try:
        # Find the notification for this user
        notification = Notification.query.filter_by(
            id=notification_id,
            user_id=current_user_id,  # Only allow users to update their own notifications
        ).first()

        if not notification:
            return jsonify({"error": "Notification not found"}), 404

        # Update read status
        if "read" in data:
            notification.read = bool(data["read"])

        db.session.commit()

        return jsonify(notification.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/api/notifications/<int:notification_id>", methods=["DELETE"])
@jwt_required()  # Add this decorator
def delete_notification(notification_id):
    """Delete a notification."""
    current_user_id = get_jwt_identity()  # Get the current user

    try:
        # Find the notification for this user
        notification = Notification.query.filter_by(
            id=notification_id,
            user_id=current_user_id,  # Only allow users to delete their own notifications
        ).first()

        if not notification:
            return jsonify({"error": "Notification not found"}), 404

        db.session.delete(notification)
        db.session.commit()

        return jsonify({"message": "Notification deleted successfully"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/api/notifications/mark-all-read", methods=["POST"])
@jwt_required()  # Add this decorator
def mark_all_read():
    """Mark all notifications as read for the current user."""
    current_user_id = get_jwt_identity()  # Get the current user

    try:
        # Update all unread notifications for this user only
        notifications = Notification.query.filter_by(
            user_id=current_user_id, is_read=False
        ).all()

        for notification in notifications:
            notification.is_read = True

        db.session.commit()

        return jsonify(
            {"message": f"{len(notifications)} notifications marked as read"}
        )
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/api/current-user-id", methods=["GET"])
@jwt_required()
def get_current_user_id():
    try:
        # Get the JWT token from the request
        jwt_header = request.headers.get("Authorization")
        print(f"Received JWT Header: {jwt_header}")

        # Extract the current user ID
        current_user_id = get_jwt_identity()

        # Log the user ID
        print(f"Extracted User ID: {current_user_id}")

        return jsonify({"user_id": current_user_id})
    except Exception as e:
        print(f"Error in current-user-id route: {str(e)}")
        return jsonify({"error": str(e)}), 500


import calendar

# @app.route("/api/monthly-average-prices", methods=["GET"])
# def get_monthly_average_prices():
#     """
#     Retrieve detailed monthly average prices for a given commodity with data source filtering
#     """
#     try:
#         # Extract query parameters
#         commodity = request.args.get('commodity')
#         start_month = int(request.args.get('start_month', 1))  # Default January
#         end_month = int(request.args.get('end_month', 12))    # Default December
#         start_year = int(request.args.get('start_year'))
#         end_year = int(request.args.get('end_year'))
#         data_source = request.args.get('source', 'ProduceIQ')  # Default to ProduceIQ

#         # Validate required parameters
#         if not commodity or not start_year or not end_year:
#             return jsonify({"error": "Commodity, start year, and end year are required"}), 400

#         # Prepare months list based on selected range
#         months_to_analyze = list(range(start_month, end_month + 1))

#         # Prepare results
#         monthly_analysis = []

#         # For SQLite: Properly calculate day ranges for each month
#         for month in months_to_analyze:
#             # Query for this specific month across years
#             month_data = []

#             # For each year in the range
#             for year in range(start_year, end_year + 1):
#                 # Determine if it's a leap year
#                 is_leap_year = (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0)

#                 # Define days in each month for the current year
#                 days_in_month = [31, 29 if is_leap_year else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

#                 # Calculate cumulative days at the beginning of each month
#                 cumulative_days = [0]  # Start with 0
#                 running_sum = 0
#                 for days in days_in_month:
#                     running_sum += days
#                     cumulative_days.append(running_sum)

#                 # Calculate day range for the specified month (1-indexed)
#                 month_start_day = cumulative_days[month-1] + 1
#                 month_end_day = cumulative_days[month]

#                 # Create base query with filters
#                 query = db.session.query(
#                     func.avg(PriceData.price).label('avg_price'),
#                     func.min(PriceData.price).label('min_price'),
#                     func.max(PriceData.price).label('max_price')
#                 ).filter(
#                     PriceData.commodity == commodity,
#                     PriceData.year == year,
#                     PriceData.day >= month_start_day,
#                     PriceData.day <= month_end_day,
#                     PriceData.price > 0
#                 )

#                 # Add source filter
#                 if data_source == "ProduceIQ,USDA" or data_source == "USDA,ProduceIQ":
#                     query = query.filter(PriceData.source.in_(["ProduceIQ", "USDA"]))
#                 else:
#                     query = query.filter(PriceData.source == data_source)

#                 # Execute the query
#                 year_month_data = query.first()

#                 # Only add if we have valid data
#                 if year_month_data and year_month_data.avg_price is not None:
#                     month_data.append({
#                         'year': year,
#                         'avg_price': round(float(year_month_data.avg_price), 2),
#                         'min_price': round(float(year_month_data.min_price), 2),
#                         'max_price': round(float(year_month_data.max_price), 2)
#                     })

#             # Process the data for this month
#             if month_data:
#                 # Calculate overall statistics for this month across years
#                 all_prices = [entry['avg_price'] for entry in month_data]
#                 all_min_prices = [entry['min_price'] for entry in month_data]
#                 all_max_prices = [entry['max_price'] for entry in month_data]

#                 monthly_analysis.append({
#                     'month': calendar.month_name[month],
#                     'avg_price': round(sum(all_prices) / len(all_prices), 2),
#                     'min_price': round(min(all_min_prices), 2),
#                     'max_price': round(max(all_max_prices), 2),
#                     'years_data': month_data
#                 })
#             else:
#                 # If no data for this month, add a default entry
#                 monthly_analysis.append({
#                     'month': calendar.month_name[month],
#                     'avg_price': 0,
#                     'min_price': 0,
#                     'max_price': 0,
#                     'years_data': []
#                 })

#         return jsonify({
#             "monthly_prices": monthly_analysis,
#             "commodity": commodity,
#             "start_month": start_month,
#             "end_month": end_month,
#             "start_year": start_year,
#             "end_year": end_year,
#             "source": data_source
#         }), 200

#     except Exception as e:
#         app.logger.error(f"Error in monthly average prices: {str(e)}")
#         return jsonify({"error": str(e)}), 500


@app.route("/api/monthly-average-prices", methods=["GET"])
def get_monthly_average_prices():
    """
    Retrieve detailed monthly average prices for a given commodity with data source filtering
    Optimized version to reduce database load and query time
    """
    try:
        # Extract query parameters
        commodity = request.args.get("commodity")
        start_month = int(request.args.get("start_month", 1))  # Default January
        end_month = int(request.args.get("end_month", 12))  # Default December
        start_year = int(request.args.get("start_year"))
        end_year = int(request.args.get("end_year"))
        data_source = request.args.get("source", "ProduceIQ")  # Default to ProduceIQ

        # Validate required parameters
        if not commodity or not start_year or not end_year:
            return (
                jsonify({"error": "Commodity, start year, and end year are required"}),
                400,
            )

        # Create a single SQL query instead of multiple queries
        # This uses Common Table Expressions (CTEs) to efficiently calculate everything in one go

        # Build the month ranges CTE
        month_ranges_sql = """
        WITH month_ranges AS (
            SELECT
                m.month_num,
                m.month_name,
                y.year,
                -- Start day calculation
                CASE
                    WHEN m.month_num = 1 THEN 1
                    WHEN m.month_num = 2 THEN 32
                    WHEN m.month_num = 3 AND ((y.year % 4 = 0 AND y.year % 100 <> 0) OR (y.year % 400 = 0)) THEN 61
                    WHEN m.month_num = 3 THEN 60
                    WHEN m.month_num = 4 AND ((y.year % 4 = 0 AND y.year % 100 <> 0) OR (y.year % 400 = 0)) THEN 92
                    WHEN m.month_num = 4 THEN 91
                    WHEN m.month_num = 5 AND ((y.year % 4 = 0 AND y.year % 100 <> 0) OR (y.year % 400 = 0)) THEN 122
                    WHEN m.month_num = 5 THEN 121
                    WHEN m.month_num = 6 AND ((y.year % 4 = 0 AND y.year % 100 <> 0) OR (y.year % 400 = 0)) THEN 153
                    WHEN m.month_num = 6 THEN 152
                    WHEN m.month_num = 7 AND ((y.year % 4 = 0 AND y.year % 100 <> 0) OR (y.year % 400 = 0)) THEN 183
                    WHEN m.month_num = 7 THEN 182
                    WHEN m.month_num = 8 AND ((y.year % 4 = 0 AND y.year % 100 <> 0) OR (y.year % 400 = 0)) THEN 214
                    WHEN m.month_num = 8 THEN 213
                    WHEN m.month_num = 9 AND ((y.year % 4 = 0 AND y.year % 100 <> 0) OR (y.year % 400 = 0)) THEN 245
                    WHEN m.month_num = 9 THEN 244
                    WHEN m.month_num = 10 AND ((y.year % 4 = 0 AND y.year % 100 <> 0) OR (y.year % 400 = 0)) THEN 275
                    WHEN m.month_num = 10 THEN 274
                    WHEN m.month_num = 11 AND ((y.year % 4 = 0 AND y.year % 100 <> 0) OR (y.year % 400 = 0)) THEN 306
                    WHEN m.month_num = 11 THEN 305
                    WHEN m.month_num = 12 AND ((y.year % 4 = 0 AND y.year % 100 <> 0) OR (y.year % 400 = 0)) THEN 336
                    WHEN m.month_num = 12 THEN 335
                END AS start_day,
                -- End day calculation
                CASE
                    WHEN m.month_num = 1 THEN 31
                    WHEN m.month_num = 2 AND ((y.year % 4 = 0 AND y.year % 100 <> 0) OR (y.year % 400 = 0)) THEN 60
                    WHEN m.month_num = 2 THEN 59
                    WHEN m.month_num = 3 THEN 90
                    WHEN m.month_num = 4 THEN 120
                    WHEN m.month_num = 5 THEN 151
                    WHEN m.month_num = 6 THEN 181
                    WHEN m.month_num = 7 THEN 212
                    WHEN m.month_num = 8 THEN 243
                    WHEN m.month_num = 9 THEN 273
                    WHEN m.month_num = 10 THEN 304
                    WHEN m.month_num = 11 THEN 334
                    WHEN m.month_num = 12 AND ((y.year % 4 = 0 AND y.year % 100 <> 0) OR (y.year % 400 = 0)) THEN 366
                    WHEN m.month_num = 12 THEN 365
                END AS end_day
            FROM
                (VALUES 
                    (1, 'January'), (2, 'February'), (3, 'March'), (4, 'April'),
                    (5, 'May'), (6, 'June'), (7, 'July'), (8, 'August'),
                    (9, 'September'), (10, 'October'), (11, 'November'), (12, 'December')
                ) AS m(month_num, month_name),
                (SELECT GENERATE_SERIES(:start_year, :end_year) AS year) AS y
            WHERE
                m.month_num BETWEEN :start_month AND :end_month
        ),
        """

        # Build source filter
        source_filter = ""
        if data_source == "ProduceIQ,USDA" or data_source == "USDA,ProduceIQ":
            source_filter = "AND pd.source IN ('ProduceIQ', 'USDA')"
        else:
            source_filter = f"AND pd.source = '{data_source}'"

        # Build monthly stats query
        monthly_stats_sql = (
            """
        monthly_stats AS (
            SELECT
                mr.month_name,
                mr.month_num,
                mr.year,
                ROUND(AVG(pd.price)::numeric, 2) AS avg_price,
                ROUND(MIN(pd.price)::numeric, 2) AS min_price,
                ROUND(MAX(pd.price)::numeric, 2) AS max_price,
                COUNT(*) AS record_count
            FROM
                price_data pd
            JOIN
                month_ranges mr ON
                    pd.year = mr.year AND
                    pd.day BETWEEN mr.start_day AND mr.end_day
            WHERE
                pd.commodity = :commodity
                AND pd.price > 0
                """
            + source_filter
            + """
            GROUP BY
                mr.month_name, mr.month_num, mr.year
        ),
        """
        )

        # Build aggregated stats query
        aggregated_stats_sql = """
        aggregated_stats AS (
            SELECT
                month_name,
                month_num,
                ROUND(AVG(avg_price)::numeric, 2) AS avg_price,
                ROUND(MIN(min_price)::numeric, 2) AS min_price,
                ROUND(MAX(max_price)::numeric, 2) AS max_price,
                SUM(record_count) AS total_records
            FROM
                monthly_stats
            GROUP BY
                month_name, month_num
        )
        """

        # Build final query with JSON aggregation
        final_query = (
            month_ranges_sql
            + monthly_stats_sql
            + aggregated_stats_sql
            + """
        SELECT
            a.month_name AS month,
            a.avg_price,
            a.min_price,
            a.max_price,
            a.total_records,
            (
                SELECT json_agg(
                    json_build_object(
                        'year', ms.year,
                        'avg_price', ms.avg_price,
                        'min_price', ms.min_price,
                        'max_price', ms.max_price
                    )
                )
                FROM monthly_stats ms
                WHERE ms.month_name = a.month_name
            ) AS years_data
        FROM
            aggregated_stats a
        ORDER BY
            a.month_num;
        """
        )

        # Execute the query with parameters
        result = db.session.execute(
            text(final_query),
            {
                "commodity": commodity,
                "start_month": start_month,
                "end_month": end_month,
                "start_year": start_year,
                "end_year": end_year,
            },
        )

        # Process the results
        monthly_analysis = []
        for row in result:
            # Extract the years_data JSON and ensure it's not None
            years_data = row.years_data if row.years_data else []

            # Create monthly data entry
            monthly_analysis.append(
                {
                    "month": row.month,
                    "avg_price": (
                        float(row.avg_price) if row.avg_price is not None else 0
                    ),
                    "min_price": (
                        float(row.min_price) if row.min_price is not None else 0
                    ),
                    "max_price": (
                        float(row.max_price) if row.max_price is not None else 0
                    ),
                    "years_data": years_data,
                }
            )

        return (
            jsonify(
                {
                    "monthly_prices": monthly_analysis,
                    "commodity": commodity,
                    "start_month": start_month,
                    "end_month": end_month,
                    "start_year": start_year,
                    "end_year": end_year,
                    "source": data_source,
                }
            ),
            200,
        )

    except Exception as e:
        app.logger.error(f"Error in monthly average prices: {str(e)}")
        return jsonify({"error": str(e)}), 500


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

from flask import jsonify


# voilin plot for terminal data


@app.route("/api/terminal_price_violin", methods=["GET"])
def terminal_price_violin():
    try:
        app.logger.info(
            "Generating terminal violin plots for USDA and ProduceIQ without downsampling..."
        )

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
        query = text(
            f"""
            SELECT commodity, price, source
            FROM price_data
            WHERE source IN ('USDA', 'ProduceIQ')
            AND make_date(year, 1, 1) + (day - 1) * INTERVAL '1 day' >= NOW() - INTERVAL '{postgres_interval}'
            AND price > 2
        """
        )
        result = db.session.execute(query).fetchall()

        # Group data by source and commodity
        grouped_data = {"USDA": {}, "ProduceIQ": {}}
        for row in result:
            commodity, price, source = row
            if source in grouped_data:
                grouped_data[source].setdefault(commodity, []).append(price)

        def compute_stats(prices_dict):
            stats = []
            for commodity, prices in prices_dict.items():
                arr = np.array(prices)
                stats.append({
                    "name": commodity,
                    "min": float(np.min(arr)),
                    "q1": float(np.percentile(arr, 25)),
                    "median": float(np.median(arr)),
                    "mean": float(np.mean(arr)),
                    "q3": float(np.percentile(arr, 75)),
                    "max": float(np.max(arr)),
                    "count": len(prices)
                })
            return sorted(stats, key=lambda x: x["name"])

        return jsonify({
            "usda": compute_stats(grouped_data["USDA"]),
            "produceiq": compute_stats(grouped_data["ProduceIQ"])
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
        query = text(
            f"""
    SELECT commodity, price
    FROM shipping_price_data
    WHERE source = 'ProduceIQ'
      AND TO_DATE(year || '-01-01', 'YYYY-MM-DD') + (day - 1) * interval '1 day' >= NOW() - INTERVAL {postgres_interval}
      AND price > 1  
        """
        )

        result = db.session.execute(query).fetchall()

        # Group data by commodity
        data = {}
        for row in result:
            data.setdefault(row[0], []).append(row[1])

        stats = []
        for commodity, prices in data.items():
            arr = np.array(prices)
            stats.append({
                "name": commodity,
                "min": float(np.min(arr)),
                "q1": float(np.percentile(arr, 25)),
                "median": float(np.median(arr)),
                "mean": float(np.mean(arr)),
                "q3": float(np.percentile(arr, 75)),
                "max": float(np.max(arr)),
                "count": len(prices)
            })
        stats.sort(key=lambda x: x["name"])
        return jsonify({"data": stats}), 200

    except Exception as e:
        app.logger.error(f"Error generating shipping violin plot: {str(e)}")
        return jsonify({"error": "Failed to generate shipping violin plot"}), 500


# terminal empricial probability chart fetch

from sqlalchemy import func


@app.route("/api/terminal_empricial_probability", methods=["GET"])
def get_terminal_empricial_probability():
    try:
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

        # Query to get mean and standard deviation directly from the database
        query = text(
            f"""
            SELECT commodity, price, source
            FROM price_data
            WHERE source = 'USDA'
            AND make_date(year, 1, 1) + (day - 1) * INTERVAL '1 day' >= NOW() - INTERVAL '{postgres_interval}'
            AND price > 2
        """
        )
        result = db.session.execute(query).fetchall()

        if not result:
            return jsonify([])

        # Group data by commodity
        grouped_data = {}
        for row in result:
            commodity, price, source = row
            if commodity not in grouped_data:
                grouped_data[commodity] = []
            grouped_data[commodity].append(price)

        charts = []
        for commodity, prices in grouped_data.items():
            arr = np.array(prices)
            hist, bin_edges = np.histogram(arr, bins=20)
            charts.append({
                "commodity": commodity,
                "bins": [{"x": float(bin_edges[i]), "y": int(hist[i])} for i in range(len(hist))],
                "mean": float(np.mean(arr)),
                "stdDev": float(np.std(arr)),
                "median": float(np.median(arr))
            })

        return jsonify(charts), 200

    except Exception as e:
        error_message = str(e)
        print("Error Traceback:", error_message)
        return jsonify({"error": error_message}), 500


# shipping empricial probability chart fetch ProduceIQ
@app.route("/api/shipping_empricial_probability", methods=["GET"])
def get_shipping_empricial_probability():
    try:
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

        # Query to get shipping data from ProduceIQ within the given time frame
        query = text(
            f"""
            SELECT commodity, price
            FROM shipping_price_data
            WHERE source = 'ProduceIQ'
            AND make_date(year, 1, 1) + (day - 1) * INTERVAL '1 day' >= NOW() - INTERVAL '{postgres_interval}'
            AND price > 2
        """
        )
        result = db.session.execute(query).fetchall()

        if not result:
            return jsonify([])

        # Group data by commodity
        grouped_data = {}
        for row in result:
            commodity, price = row
            if commodity not in grouped_data:
                grouped_data[commodity] = []
            grouped_data[commodity].append(price)

        charts = []
        for commodity, prices in grouped_data.items():
            arr = np.array(prices)
            hist, bin_edges = np.histogram(arr, bins=20)
            charts.append({
                "commodity": commodity,
                "bins": [{"x": float(bin_edges[i]), "y": int(hist[i])} for i in range(len(hist))],
                "mean": float(np.mean(arr)),
                "stdDev": float(np.std(arr)),
                "median": float(np.median(arr))
            })

        return jsonify(charts), 200

    except Exception as e:
        error_message = str(e)
        print("Error Traceback:", error_message)
        return jsonify({"error": error_message}), 500


@app.route("/api/terminal_correlation", methods=["GET"])
def get_terminal_correlation():
    try:
        # Query data with proper filtering
        source = request.args.get("source", "ProduceIQ")  # Default to USDA
        query = text(
            """
            SELECT 
                commodity,
                price,
                DATE(CONCAT(year, '-01-01')::date + (day - 1) * INTERVAL '1 day') as date
            FROM price_data
            WHERE source = :source
            ORDER BY date, commodity
        """
        )

        result = db.session.execute(query, {"source": source}).fetchall()
        print(f"Query result length: {len(result)}")  # Debugging log

        if not result:
            return jsonify({"error": "No data found"}), 404

        # Create DataFrame and process data
        df = pd.DataFrame(result, columns=["commodity", "price", "date"])
        print(f"Initial DataFrame shape: {df.shape}")  # Debugging log

        # Ensure 'date' column is treated as datetime
        df["date"] = pd.to_datetime(df["date"])

        # Handle duplicate (date, commodity) entries by aggregating
        df = df.groupby(["date", "commodity"], as_index=False)["price"].mean()
        print(f"DataFrame shape after grouping: {df.shape}")  # Debugging log

        # Create pivot table
        pivot_df = df.pivot(index="date", columns="commodity", values="price")
        print(f"Pivot table shape: {pivot_df.shape}")  # Debugging log

        del df
        import gc

        gc.collect()

        # Forward fill missing values before calculating percentage change
        pivot_df = pivot_df.ffill(limit=3)  # Forward fill up to 3 missing values
        returns = pivot_df.pct_change()  # Calculate percentage change
        print(
            f"Returns DataFrame shape before filtering: {returns.shape}"
        )  # Debugging log

        # Remove columns with too many missing values
        min_valid_ratio = 0.3  # At least 30% valid data
        valid_columns = returns.columns[
            returns.count() > len(returns) * min_valid_ratio
        ]
        returns = returns[valid_columns]
        print(
            f"Returns DataFrame shape after filtering: {returns.shape}"
        )  # Debugging log

        del pivot_df
        gc.collect()

        # Calculate correlation matrix
        correlation_matrix = returns.corr(method="pearson")
        correlation_matrix.fillna(0, inplace=True)
        print(f"Correlation matrix shape: {correlation_matrix.shape}")  # Debugging log

        # Build plain correlation matrix response
        commodities_list = correlation_matrix.columns.tolist()
        matrix_data = []
        for i, row_label in enumerate(commodities_list):
            for j, col_label in enumerate(commodities_list):
                matrix_data.append({
                    "row": row_label,
                    "col": col_label,
                    "value": round(float(correlation_matrix.iloc[i, j]), 3)
                })

        chart = {"commodities": commodities_list, "matrix": matrix_data}

        summary_stats = {
            "total_records": len(returns),
            "unique_commodities": len(commodities_list),
            "date_range": {
                "start": returns.index.min().strftime("%Y-%m-%d"),
                "end": returns.index.max().strftime("%Y-%m-%d"),
            },
            "average_correlation": float(correlation_matrix.mean().mean()),
        }

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
        source = request.args.get("source", "ProduceIQ")  # Default to USDA
        query = text(
            """
            SELECT 
                commodity,
                price,
                DATE(CONCAT(year, '-01-01')::date + (day - 1) * INTERVAL '1 day') as date
            FROM shipping_price_data
            WHERE source = :source
            ORDER BY date, commodity
        """
        )

        result = db.session.execute(query, {"source": source}).fetchall()
        print(f"Query result length: {len(result)}")  # Debugging log

        if not result:
            return jsonify({"error": "No data found"}), 404

        # Create DataFrame and process data
        df = pd.DataFrame(result, columns=["commodity", "price", "date"])
        print(f"Initial DataFrame shape: {df.shape}")  # Debugging log

        # Ensure 'date' column is treated as datetime
        df["date"] = pd.to_datetime(df["date"])

        # Handle duplicate (date, commodity) entries by aggregating
        df = df.groupby(["date", "commodity"], as_index=False)["price"].mean()
        print(f"DataFrame shape after grouping: {df.shape}")  # Debugging log

        # Create pivot table
        pivot_df = df.pivot(index="date", columns="commodity", values="price")
        print(f"Pivot table shape: {pivot_df.shape}")  # Debugging log

        del df
        import gc

        gc.collect()

        # Calculate returns and handle missing values
        pivot_df = pivot_df.ffill(limit=3)  # Forward fill missing values up to 3 days
        returns = pivot_df.pct_change()  # Calculate percentage change
        print(
            f"Returns DataFrame shape before filtering: {returns.shape}"
        )  # Debugging log

        # Remove columns with too many missing values
        min_valid_ratio = 0.3  # At least 30% valid data
        valid_columns = returns.columns[
            returns.count() > len(returns) * min_valid_ratio
        ]
        returns = returns[valid_columns]
        print(
            f"Returns DataFrame shape after filtering: {returns.shape}"
        )  # Debugging log

        del pivot_df
        gc.collect()

        # Calculate correlation matrix
        correlation_matrix = returns.corr(method="pearson")
        correlation_matrix.fillna(0, inplace=True)
        print(f"Correlation matrix shape: {correlation_matrix.shape}")  # Debugging log

        # Build plain correlation matrix response
        commodities_list = correlation_matrix.columns.tolist()
        matrix_data = []
        for i, row_label in enumerate(commodities_list):
            for j, col_label in enumerate(commodities_list):
                matrix_data.append({
                    "row": row_label,
                    "col": col_label,
                    "value": round(float(correlation_matrix.iloc[i, j]), 3)
                })

        chart = {"commodities": commodities_list, "matrix": matrix_data}

        summary_stats = {
            "total_records": len(returns),
            "unique_commodities": len(commodities_list),
            "date_range": {
                "start": returns.index.min().strftime("%Y-%m-%d"),
                "end": returns.index.max().strftime("%Y-%m-%d"),
            },
            "average_correlation": float(correlation_matrix.mean().mean()),
        }

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
        result = (
            db.session.query(PriceData.commodity, PriceData.price)
            .filter(
                PriceData.commodity.in_([commodity_x, commodity_y]),
                PriceData.source == source,
            )
            .all()
        )

        if not result:
            return jsonify({"error": "No data found for the selected commodities"}), 404

        # Create a DataFrame
        df = pd.DataFrame(result, columns=["commodity", "price"]).dropna()

        if df.empty:
            return jsonify({"error": "No valid data available"}), 404

        # Separate data for each commodity
        x_data = df[df["commodity"] == commodity_x]["price"].tolist()
        y_data = df[df["commodity"] == commodity_y]["price"].tolist()

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
        result = (
            db.session.query(ShippingPriceData.commodity, ShippingPriceData.price)
            .filter(
                ShippingPriceData.commodity.in_([commodity_x, commodity_y]),
                ShippingPriceData.source == source,
            )
            .all()
        )

        if not result:
            return jsonify({"error": "No data found for the selected commodities"}), 404

        # Create a DataFrame
        df = pd.DataFrame(result, columns=["commodity", "price"]).dropna()

        if df.empty:
            return jsonify({"error": "No valid data available"}), 404

        # Separate data for each commodity
        x_data = df[df["commodity"] == commodity_x]["price"].tolist()
        y_data = df[df["commodity"] == commodity_y]["price"].tolist()

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


def calculate_rolling_price_correlations(window, source_df, series1, series2):
    """
    Calculate rolling correlations between two price series.
    """
    try:
        # Sort index to ensure proper time-based calculations
        source_df = source_df.sort_index()

        # Forward fill missing values (up to 7 days)
        source_df = source_df.fillna(method="ffill", limit=7)

        # Calculate rolling correlation
        roll_corr = (
            source_df[series1]
            .rolling(
                window=window, min_periods=window // 2  # Allow for some missing data
            )
            .corr(source_df[series2])
        )

        # Create result DataFrame
        result_df = pd.DataFrame(
            {"date": roll_corr.index, "correlation": roll_corr.values}
        )

        # Convert numpy values to Python native types
        result_df["correlation"] = result_df["correlation"].astype(float)
        result_df["date"] = result_df["date"].dt.strftime("%Y-%m-%d")

        # Clean up memory
        del roll_corr
        gc.collect()

        return result_df

    except KeyError as e:
        raise ValueError(
            f"KeyError: {e}. At least one of the selected varieties has no price data."
        )
    except Exception as e:
        raise ValueError(f"Unexpected error: {str(e)}")


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
        result = (
            db.session.query(
                PriceData.year, PriceData.day, PriceData.commodity, PriceData.price
            )
            .filter(
                PriceData.commodity.in_([series1, series2]),
                PriceData.price > 0,  # Ensure we only get valid prices
                PriceData.source == source,  # Use selected source
            )
            .all()
        )

        if not result:
            return jsonify({"error": "No data found for the selected commodities"}), 404

        # Create a DataFrame
        df = pd.DataFrame(result, columns=["year", "day", "commodity", "price"])

        # Generate a date column from year and day
        df["date"] = pd.to_datetime(
            df.apply(lambda row: f"{row.year}-{row.day}", axis=1), format="%Y-%j"
        )

        # Pivot the data for rolling correlation
        pivot_data = df.pivot_table(
            values="price", index="date", columns="commodity", aggfunc="mean"
        ).sort_index()

        # Clean up the main DataFrame after pivoting
        del df
        gc.collect()

        # Check for minimum data points
        min_required_points = window * 2
        if len(pivot_data) < min_required_points:
            del pivot_data
            gc.collect()
            return (
                jsonify(
                    {
                        "error": f"Insufficient data points. Need at least {min_required_points} days of data for {window}-day window"
                    }
                ),
                400,
            )

        # Calculate rolling correlation
        roll_corr_df = calculate_rolling_price_correlations(
            window=window, source_df=pivot_data, series1=series1, series2=series2
        )

        # Clean up the pivot DataFrame after rolling correlation
        del pivot_data
        gc.collect()

        # Return plain data instead of plotly figure
        roll_corr_df["date"] = pd.to_datetime(roll_corr_df["date"])
        return jsonify({
            "dates": roll_corr_df["date"].dt.strftime("%Y-%m-%d").tolist(),
            "values": [round(v, 4) for v in roll_corr_df["correlation"].tolist()],
            "series1": series1,
            "series2": series2,
            "window": window
        }), 200

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
        source_df = source_df.ffill(
            limit=7
        )  # Use .ffill() instead of fillna(method='ffill')

        # Calculate rolling correlation
        roll_corr = (
            source_df[series1]
            .rolling(
                window=window, min_periods=window // 2  # Allow for some missing data
            )
            .corr(source_df[series2])
        )

        # Create result DataFrame
        result_df = pd.DataFrame(
            {"date": roll_corr.index, "correlation": roll_corr.values}
        )

        # Convert numpy values to Python native types
        result_df["correlation"] = result_df["correlation"].astype(float)
        result_df["date"] = result_df["date"].dt.strftime("%Y-%m-%d")

        # Clean up memory
        del roll_corr
        gc.collect()

        return result_df

    except KeyError as e:
        raise ValueError(
            f"KeyError: {e}. At least one of the selected varieties has no price data."
        )
    except Exception as e:
        raise ValueError(f"Unexpected error: {str(e)}")


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
        result = (
            db.session.query(
                ShippingPriceData.year,
                ShippingPriceData.day,
                ShippingPriceData.commodity,
                ShippingPriceData.price,
            )
            .filter(
                ShippingPriceData.commodity.in_([series1, series2]),
                ShippingPriceData.price > 0,  # Ensure we only get valid prices
                ShippingPriceData.source == source,  # Use selected source
            )
            .all()
        )

        if not result:
            return jsonify({"error": "No data found for the selected commodities"}), 404

        # Create a DataFrame
        df = pd.DataFrame(result, columns=["year", "day", "commodity", "price"])

        # Generate a date column from year and day
        df["date"] = pd.to_datetime(
            df.apply(lambda row: f"{row.year}-{row.day}", axis=1), format="%Y-%j"
        )

        # Pivot the data for rolling correlation
        pivot_data = df.pivot_table(
            values="price", index="date", columns="commodity", aggfunc="mean"
        ).sort_index()

        # Check for minimum data points
        min_required_points = window * 2
        if len(pivot_data) < min_required_points:
            return (
                jsonify(
                    {
                        "error": f"Insufficient data points. Need at least {min_required_points} days of data for {window}-day window"
                    }
                ),
                400,
            )

        # Calculate rolling correlation
        roll_corr_df = calculate_rolling_price_correlations(
            window=window, source_df=pivot_data, series1=series1, series2=series2
        )

        # Return plain data instead of plotly figure
        roll_corr_df["date"] = pd.to_datetime(roll_corr_df["date"])
        return jsonify({
            "dates": roll_corr_df["date"].dt.strftime("%Y-%m-%d").tolist(),
            "values": [round(v, 4) for v in roll_corr_df["correlation"].tolist()],
            "series1": series1,
            "series2": series2,
            "window": window
        }), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        app.logger.error(f"Error generating shipping rolling correlations: {str(e)}")
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500


# ============================================
# ARKFOODS2 - WEATHER & FORECAST ROUTES
# ============================================

@app.route("/api/live_weather", methods=["GET"])
def api_live_weather():
    results = []
    for region_key, region_info in GROWING_REGIONS.items():
        weather = fetch_current_weather(region_info["lat"], region_info["lon"])
        analysis = analyze_growing_conditions(weather, region_info["crops"])
        results.append({
            "key": region_key, "name": region_info["name"], "city": region_info["city"],
            "lat": region_info["lat"], "lon": region_info["lon"], "crops": region_info["crops"],
            "weather": weather, "analysis": analysis, "timestamp": datetime.now().isoformat(),
        })
    return jsonify({"success": True, "regions": results, "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")})


@app.route("/api/weather_forecast_7day", methods=["GET"])
def api_weather_forecast_7day():
    cached = cache_get("weather_forecast_7day")
    if cached:
        return jsonify(cached)
    return jsonify({"success": False, "error": "Cache not built yet. Trigger /api/trigger_cache_build"}), 503


@app.route("/api/weather_forecast_7day/<region_key>", methods=["GET"])
def api_region_forecast_7day(region_key):
    cached = cache_get("weather_forecast_7day")
    if cached and cached.get("regions"):
        for r in cached["regions"]:
            if r.get("key") == region_key:
                return jsonify({"success": True, "key": r.get("key"), "name": r.get("name"), "forecast": r.get("forecast")})
    return jsonify({"success": False, "error": "Region not found or cache missing"}), 404


@app.route("/api/price_forecast", methods=["GET"])
def api_price_forecast():
    commodity = normalize_commodity(request.args.get("commodity", "Jalapeno"))
    city = request.args.get("city", "All cities")
    cache_key_str = f"price_forecast_all_combined_{city.lower().replace(' ', '_')}"
    cached_all = cache_get(cache_key_str)
    if cached_all and cached_all.get("forecasts"):
        for f in cached_all["forecasts"]:
            if normalize_commodity(f.get("commodity", "")) == commodity:
                return jsonify(f)
    return jsonify(calculate_price_forecast(commodity, city))


@app.route("/api/price_forecast_all", methods=["GET"])
def api_price_forecast_all():
    city = request.args.get("city", "All cities")
    cached = cache_get(f"price_forecast_all_combined_{city.lower().replace(' ', '_')}")
    if cached:
        return jsonify(cached)
    return jsonify({"success": False, "error": "Cache not built yet. Trigger /api/trigger_cache_build"}), 503


@app.route("/api/price_forecast_long_term", methods=["GET"])
def api_price_forecast_long_term():
    from historical_trend_forecasting import calculate_hybrid_6week_forecast
    commodity = normalize_commodity(request.args.get("commodity", "Jalapeno"))
    city = request.args.get("city", "All cities")
    return jsonify(calculate_hybrid_6week_forecast(db.session, commodity, city))


@app.route("/api/price_forecast_long_term_all", methods=["GET"])
def api_price_forecast_long_term_all():
    city = request.args.get("city", "All cities")
    cached = cache_get(f"long_term_all_combined_{city.lower().replace(' ', '_')}")
    if cached:
        return jsonify(cached)
    return jsonify({"success": False, "error": "Cache not built yet. Trigger /api/trigger_cache_build"}), 503


@app.route("/api/growing_conditions", methods=["GET"])
def api_growing_conditions():
    return jsonify({"conditions": PEPPER_CONDITIONS, "description": "Temperature in °F, Humidity in %"})


@app.route("/api/growing_regions", methods=["GET"])
def api_growing_regions():
    regions = [{"key": k, "name": v["name"], "city": v["city"], "lat": v["lat"], "lon": v["lon"], "crops": v["crops"]} for k, v in GROWING_REGIONS.items()]
    return jsonify({"success": True, "regions": regions})


@app.route("/api/climatology/<region_name>", methods=["GET"])
def api_climatology(region_name):
    date_str = request.args.get("date")
    if date_str:
        forecast_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        return jsonify(get_climatology_comparison(region_name, forecast_date))
    cached = cache_get("climatology_regions_today")
    if cached and cached.get("regions"):
        for rk, info in cached["regions"].items():
            token = (info.get("query_token") or "").lower()
            if region_name.lower() in token or token in region_name.lower():
                return jsonify(info.get("result"))
    return jsonify(get_climatology_comparison(region_name))


@app.route("/api/trigger_cache_build", methods=["POST"])
def trigger_cache_build():
    import threading
    if getattr(app, "_cache_build_running", False):
        return jsonify({"success": False, "message": "Cache build already in progress"}), 409

    def _run_build():
        app._cache_build_running = True
        app._cache_build_error = None
        app._cache_build_started = datetime.now().isoformat()
        try:
            from scheduler_service import build_all_caches
            with app.app_context():
                build_all_caches()
            app._cache_build_finished = datetime.now().isoformat()
        except Exception as e:
            import traceback
            app._cache_build_error = str(e)
            app._cache_build_finished = datetime.now().isoformat()
            app.logger.error(f"Cache build failed: {e}\n{traceback.format_exc()}")
        finally:
            app._cache_build_running = False

    threading.Thread(target=_run_build, daemon=True, name="cache-builder").start()
    return jsonify({"success": True, "message": "Cache build started. Poll /api/cache_build_status for progress."})


@app.route("/api/cache_build_status", methods=["GET"])
def api_cache_build_status():
    cache_times = {}
    for ck in ["terminal_market_pricing_7", "most_recent_prices_produceiq", "price_forecast_all_combined_all_cities"]:
        row = db.session.query(DashboardCache.updated_at).filter_by(cache_key=ck).first()
        cache_times[ck] = row.updated_at.isoformat() if row else None
    return jsonify({
        "running": getattr(app, "_cache_build_running", False),
        "error": getattr(app, "_cache_build_error", None),
        "started": getattr(app, "_cache_build_started", None),
        "finished": getattr(app, "_cache_build_finished", None),
        "cache_last_updated": cache_times,
    })


# Run the app
if __name__ == "__main__":
    app.run(debug=True)

# Initialize the cache extension
