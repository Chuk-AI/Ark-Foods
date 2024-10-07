from flask import Flask, render_template, redirect, url_for, flash, request, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
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
# Flask-Admin Setup
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
#For Scheduling
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
import os
import logging
import requests
import base64

#Configuration for Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


# Initialize Flask app
# Initialize Flask app
app = Flask(__name__)

# Enable CORS
CORS(app)

# Set the secret key for session handling
app.config['SECRET_KEY'] = 'your_secret_key_here'

# Check if DATABASE_URL is present for Heroku's PostgreSQL, otherwise use SQLite for local development
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    # Replace the "postgres://" scheme with "postgresql://" for compatibility with SQLAlchemy
    app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL.replace("postgres://", "postgresql://", 1)
else:
    # Use SQLite for local development
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(app.instance_path, 'users.db')

# Configure other Flask settings
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=30)  # Session timeout after 30 minutes

# Initialize extensions
db = SQLAlchemy(app)

# Initialize LoginManager for handling user sessions
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Initialize Bootstrap for front-end styling
Bootstrap(app)

# Data Base Models
class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(50), nullable=False)  # Role can be 'admin', 'sales', 'owner'
    approved = db.Column(db.Boolean, default=False)  # User needs to be approved to log in

    def is_admin(self):
        return self.role == 'admin'

    def is_owner(self):
        return self.role == 'owner'

class PriceData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    city_name = db.Column(db.String(100), nullable=False)
    commodity = db.Column(db.String(100), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    day = db.Column(db.Integer, nullable=False)  # Day of the year
    price = db.Column(db.Float, nullable=False)
    source = db.Column(db.String(50), nullable=False)
    season= db.Column(db.String(20), nullable=False)

#USDA DATA IMPORT SETTINGS HERE!
INTERESTED_CITIES = [
    'BALTIMORE', 'BOSTON', 'CHICAGO', 'COLUMBIA',
    'MIAMI', 'NEW YORK', 'PHILADELPHIA', 'LOS ANGELES'
]

INTERESTED_COMMODITIES = [
    'Fresno', 'Habanero', 'Hungarian Wax', 'Jalapeno',
    'Long Hot', 'Shishito', 'Anaheim', 'Cubanelles',
    'Poblano', 'Serrano'
]
# Function to fetch daily USDA data
def get_last_fetched_usda_date():
    # Step 1: Find the maximum year
    max_year = db.session.query(func.max(PriceData.year)).filter(PriceData.source.in_(['USDA', 'Historical'])).scalar()

    if max_year is not None:
        # Step 2: Find the maximum day within the maximum year
        max_day = db.session.query(func.max(PriceData.day)).filter(PriceData.year == max_year, PriceData.source.in_(['USDA', 'Historical'])).scalar()

        # Validate the day
        if max_day is not None:
            try:
                # Ensure that the day is valid for the year
                # For leap years, we can have a day value of 366
                date_check = datetime.strptime(f"{max_year}-{max_day}", "%Y-%j")
                last_fetched_date = pd.Timestamp(date_check)
                logging.info(f"Last fetched USDA date: {last_fetched_date} (year: {max_year}, day: {max_day})")
                return last_fetched_date
            except ValueError:
                logging.error(f"Invalid date found: year={max_year}, day={max_day}. Falling back to default date.")
        else:
            logging.warning(f"No valid day found for year {max_year}. Using fallback date 2020-01-01.")
    else:
        logging.warning("No valid USDA or Historical data found. Using fallback date 2020-01-01.")

    # If no valid date was found, return a default fallback date
    last_fetched_date = pd.Timestamp('2020-01-01')
    logging.info(f"Final fetched USDA date: {last_fetched_date}")
    return last_fetched_date

# Function to fetch USDA data for multiple days from the last fetched date
def fetch_usda_daily_data():
    with app.app_context():
        logging.info("USDA data fetch job triggered")
        base_endpoint = 'https://marsapi.ams.usda.gov/services/v1.2/marketTypes/1030/cr?dsId=/1/1/&q=report_date='

        # Get the last fetched date
        start_dt = get_last_fetched_usda_date()
        logging.info(f"Last fetched USDA date: {start_dt}")
        end_dt = pd.Timestamp.today()

        # Prepare the authorization header
        api_key = '7XWk8PBs9+O3lWfreM+DtrsaM3OCkzOx'
        encoded_api_key = base64.b64encode(f"{api_key}:".encode()).decode()
        headers = {
            'Authorization': f"Basic {encoded_api_key}",
            'User-Agent': 'Mozilla/5.0',
            'Accept': 'application/json'
        }

        current_dt = start_dt
        while current_dt <= end_dt:
            current_date_formatted = current_dt.strftime('%m/%d/%Y')
            logging.info(f"Fetching USDA data for {current_date_formatted}")

            endpoint = base_endpoint + current_date_formatted
            response = requests.get(endpoint, headers=headers)
            
            logging.info(f"API Response Status Code: {response.status_code}")
            logging.info(f"API Response Content: {response.text}")  # Log the entire response

            if response.status_code == 200:
                json_data = response.json()
                if json_data.get('results') and isinstance(json_data['results'], list):
                    logging.info(f"Valid data found for {current_date_formatted}: {json_data['results']}")
                    process_usda_data(json_data['results'])
                else:
                    logging.warning(f"No valid results found in the API response for {current_date_formatted}")
            else:
                logging.error(f"Error fetching USDA data for {current_date_formatted}: {response.status_code} - {response.text}")

            current_dt += timedelta(days=1)

# Process and store USDA data in the database, filtered by interested commodities and cities
def process_usda_data(data):
    for report in data:
        commodity_name = report.get('commodity', '')
        # Remove 'Peppers, ' prefix before comparing
        if commodity_name.startswith('Peppers, '):
            commodity_name = commodity_name.replace('Peppers, ', '').strip()

        # Filter out only the commodities of interest
        if commodity_name in INTERESTED_COMMODITIES:
            report_date = report.get('report_date', '')
            year = datetime.strptime(report_date, '%m/%d/%Y').year if report_date else ''
            day_of_year = datetime.strptime(report_date, '%m/%d/%Y').timetuple().tm_yday if report_date else ''

            # Check if price is missing, skip the entry if it is
            price = report.get('low_price')
            if price is None:
                logging.warning(f"Skipping entry due to missing price for {commodity_name} on {report_date} in {report.get('location', '')}")
                continue  # Skip this entry if price is missing

            # Extract the city name before the comma, convert to uppercase
            city_name_full = report.get('location', '')
            city_name = city_name_full.split(',')[0].upper()  # Get part before comma and convert to uppercase

            # Check if the extracted city is in the list of interested cities
            if city_name not in INTERESTED_CITIES:
                logging.warning(f"Skipping entry for city {city_name_full} as it is not in the list of interested cities")
                continue  # Skip cities that are not in the interested list

            # Prepare the price_data entry
            price_data = PriceData(
                city_name=city_name,  # Now contains only the city name in uppercase
                commodity=commodity_name,  # Now contains only the commodity name without prefix
                year=year,
                day=day_of_year,
                price=price,  # Only insert if the price is valid
                source='USDA',
                season=determine_season(report_date)
            )

            db.session.add(price_data)

    db.session.commit()
    logging.info(f"USDA data saved for valid entries")


# Determine season based on month
def determine_season(report_date):
    try:
        # Handle date format like '10/02/2024' (USDA reports)
        month = datetime.strptime(report_date, '%m/%d/%Y').month
    except ValueError:
        # Handle format like '2024-10-02' if other data sources use this
        month = datetime.strptime(report_date, '%Y-%m-%d').month

    if month in [3, 4, 5]:
        return 'Spring'
    elif month in [6, 7, 8]:
        return 'Summer'
    elif month in [9, 10, 11]:
        return 'Autumn'
    else:
        return 'Winter'

def determine_season_for_dashboard(forecast_date):
    # forecast_date is expected to be in the format '%Y-%m-%d'
    month = forecast_date.month

    if month in [3, 4, 5]:
        return 'Spring'
    elif month in [6, 7, 8]:
        return 'Summer'
    elif month in [9, 10, 11]:
        return 'Autumn'
    else:
        return 'Winter'


# PRODUCE IQ DATA FETCHING IS HERE!!
# Function to fetch the last fetched date
def get_last_fetched_date():
    # Step 1: Find the maximum year
    max_year = db.session.query(func.max(PriceData.year)).filter(PriceData.source.in_(['ProduceIQ', 'Historical'])).scalar()

    if max_year is not None:
        # Step 2: Find the maximum day within the maximum year
        max_day = db.session.query(func.max(PriceData.day)).filter(PriceData.year == max_year, PriceData.source.in_(['ProduceIQ', 'Historical'])).scalar()

        # Validate the day
        if max_day is not None:
            try:
                # Ensure that the day is valid for the year
                # For leap years, we can have a day value of 366
                date_check = datetime.strptime(f"{max_year}-{max_day}", "%Y-%j")
                last_fetched_date = pd.Timestamp(date_check)
                logging.info(f"Last fetched ProduceIQ date: {last_fetched_date} (year: {max_year}, day: {max_day})")
                return last_fetched_date
            except ValueError:
                logging.error(f"Invalid date found: year={max_year}, day={max_day}. Falling back to default date.")
        else:
            logging.warning(f"No valid day found for year {max_year}. Using fallback date 2020-01-01.")
    else:
        logging.warning("No valid ProduceIQ or Historical data found. Using fallback date 2020-01-01.")

    # If no valid date was found, return a default fallback date
    last_fetched_date = pd.Timestamp('2020-01-01')
    logging.info(f"Final fetched ProduceIQ date: {last_fetched_date}")
    return last_fetched_date

#Fetching data from Produce IQ
def fetch_daily_data():
    with app.app_context():
        base_url = 'https://api.produceiq.com/index/v2/trends/'
        headers = {'Api-Subscription-Key': '5aa11f87fed04300b05addd031c56ffa'}

        # Define the 10 specific commodities to filter by
        wanted_commodities = ['Anaheim', 'Cubanelle', 'Fresno', 'Habanero', 'Hungarian Wax', 
                              'Jalapeno', 'Long Hot', 'Poblano', 'Serrano', 'Shishito']

        # Get the last fetched date
        start_dt = get_last_fetched_date()
        end_dt = pd.Timestamp.today()  # Fetch data up to today

        # Loop through each day one by one from the last fetched date to today
        current_dt = start_dt
        while current_dt <= end_dt:
            params = {
                'commodityId': 18,  # Adjust this for different commodities
                'from': current_dt.strftime('%Y-%m-%d'),
                'to': current_dt.strftime('%Y-%m-%d')  # Fetch data for one day at a time
            }

            # Fetch data for the current day
            response = requests.get(f'{base_url}terminal-market-trends', headers=headers, params=params, verify=True)

            # Log the full response for debugging
            logging.info(f"API Response for {current_dt.strftime('%Y-%m-%d')}: {response.text}")

            if response.status_code == 200:
                data = response.json().get('subset', [])
                logging.info(f"Fetched data for {current_dt.strftime('%Y-%m-%d')}")
            else:
                logging.error(f"Failed to fetch data for {current_dt.strftime('%Y-%m-%d')}. Status code: {response.status_code}")
                logging.error(f"API Error Response: {response.text}")  # Log the error response
                # Move to the next day even if this request fails
                current_dt += pd.Timedelta(days=1)
                continue

            # Process and save the data
            if not data:
                logging.error(f"No data found in the response for {current_dt.strftime('%Y-%m-%d')}. Full response: {response.json()}")
                # Move to the next day even if no data is found
                current_dt += pd.Timedelta(days=1)
                continue

            for item in data:
                variety_name = item.get('varietyName', '').capitalize()

                # Only process if the variety is one of the wanted commodities
                if variety_name in wanted_commodities:
                    city_name = item.get('terminalMarketCityName')
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
                        commodity=variety_name,  # Insert varietyName into the commodity field
                        year=year,
                        day=day_of_year,
                        price=price,
                        source=source,
                        season=season
                    )

                    db.session.add(price_data)
                    logging.info(f"Added {variety_name} for {current_dt.strftime('%Y-%m-%d')} in {city_name}")

            # Commit the data for the current day
            db.session.commit()
            logging.info(f'Data for {current_dt.strftime("%Y-%m-%d")} saved to the database.')

            # Move to the next day
            current_dt += pd.Timedelta(days=1)

        logging.info(f"Data fetching completed from {start_dt.strftime('%Y-%m-%d')} to {end_dt.strftime('%Y-%m-%d')}.")


#Scheduler for API calls to USDA and Produce IQ
#Running the Scheduler
def schedule_jobs():
    # Define the Los Angeles timezone
    la_timezone = timezone('US/Pacific')
    
    scheduler = BackgroundScheduler(timezone=la_timezone)

    # Schedule ProduceIQ job to run every 2 hours starting at the 0th minute of the hour
    scheduler.add_job(
        func=fetch_daily_data, 
        trigger=IntervalTrigger(hours=2, start_date='2024-10-03 00:00:00', timezone=la_timezone),  # Runs every 2 hours starting at midnight LA time
        id="produce_iq_job"
    )

    # Schedule USDA job to run every 2 hours but 5 minutes after ProduceIQ job
    scheduler.add_job(
        func=fetch_usda_daily_data, 
        trigger=IntervalTrigger(hours=2, start_date='2024-10-03 00:05:00', timezone=la_timezone),  # Runs every 2 hours but starts 5 minutes after, LA time
        id="usda_job"
    )

    scheduler.start()
    logging.info("Scheduler has started with USDA and ProduceIQ jobs using LA timezone.")

schedule_jobs()
# Remember to shut down the scheduler when app exits
@app.before_request
def initialize():
    schedule_jobs()
@app.teardown_appcontext
def shutdown_session(exception=None):
    db.session.remove()


admin = Admin(app, name='Admin Panel')
admin.add_view(ModelView(User, db.session))
admin.add_view(ModelView(PriceData, db.session))  # Add PriceData to Admin panel


# User loader for Flask-Login
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Forms for login and registration
class RegisterForm(FlaskForm):
    username = StringField('Username', validators=[InputRequired(), Length(min=4, max=150)])
    email = StringField('Email', validators=[InputRequired(), Email(message='Invalid email'), Length(max=150)])
    password = PasswordField('Password', validators=[InputRequired(), Length(min=8)])
    confirm_password = PasswordField('Confirm Password', validators=[InputRequired(), EqualTo('password', message='Passwords must match')])
    role = SelectField('Role', choices=[('sales', 'Sales'), ('owner', 'Owner'), ('admin', 'Admin')])
    submit = SubmitField('Register')


class LoginForm(FlaskForm):
    email = StringField('Email', validators=[InputRequired(), Email(message='Invalid email')])
    password = PasswordField('Password', validators=[InputRequired(), Length(min=8)])
    submit = SubmitField('Login')

# Home page
@app.route('/')
@login_required
def index():
    if current_user.is_admin():
        return redirect(url_for('admin_dashboard'))
    elif current_user.is_owner():
        return redirect(url_for('owner_dashboard'))
    else:
        return redirect(url_for('sales_dashboard'))

# Dashboards
@app.route('/admin_dashboard')
@login_required
def admin_dashboard():
    return render_template('admin_dashboard.html')

@app.route('/owner_dashboard')
@login_required
def owner_dashboard():
    return render_template('owner_dashboard.html')


@app.route('/sales_dashboard', methods=['GET'])
@login_required
def sales_dashboard():
    selected_commodity = request.args.get('commodity', 'Jalapeno')
    selected_source = request.args.get('source', 'Historical')

    # Get the most recent year and day
    latest_year = db.session.query(db.func.max(PriceData.year)).scalar()
    latest_day = db.session.query(db.func.max(PriceData.day)).filter_by(year=latest_year).scalar()

    # Query the best sell market (city with the highest recent price)
    best_market = db.session.query(
        PriceData.city_name,
        db.func.max(PriceData.price).label('max_price'),
        PriceData.year,
        PriceData.day
    ).filter(
        PriceData.commodity == selected_commodity,
        PriceData.source == selected_source,
        PriceData.year == latest_year,
        PriceData.day == latest_day
    ).group_by(PriceData.city_name, PriceData.year, PriceData.day).order_by(db.desc('max_price')).all()

    # Check if query was successful
    if not best_market:
        best_market = []

    # Render the template and pass the variables
    return render_template(
        'sales_dashboard.html',
        best_market=best_market,  # Make sure to pass this variable
        selected_commodity=selected_commodity,
        selected_source=selected_source,
        datetime=datetime  # Pass datetime to handle date formatting in the template
    )


# Registration route
@app.route('/register', methods=['GET', 'POST'])
def register():
    form = RegisterForm()
    if form.validate_on_submit():
        hashed_password = generate_password_hash(form.password.data, method='scrypt')
        new_user = User(username=form.username.data, email=form.email.data, password=hashed_password, role=form.role.data, approved=False)
        db.session.add(new_user)
        db.session.commit()
        flash(f'Registration successful! You registered as {form.role.data}. Your account must be approved by an admin or owner.', 'success')
        return redirect(url_for('login'))
    return render_template('register.html', form=form)

# Login route with proper handling for session
@app.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        if user and check_password_hash(user.password, form.password.data):
            if not user.approved:
                flash('Your account is not approved yet. Please wait for approval from an admin or owner.', 'warning')
                return redirect(url_for('login'))

            login_user(user)  # Log in the user through Flask-Login

            # Create a session
            session['username'] = user.username
            session['role'] = user.role
            session.permanent = True  # Set session to use the PERMANENT_SESSION_LIFETIME config

            flash('Login successful!', 'success')

            next_page = request.args.get('next')
            return redirect(next_page) if next_page else redirect(url_for('index'))
        else:
            flash('Invalid email or password.', 'danger')
    return render_template('login.html', form=form)

# Logout route
@app.route('/logout')
@login_required
def logout():
    session.clear()  # Clear the session on logout
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))

# Route for approving users
@app.route('/approve_users')
@login_required
def approve_users():
    if not current_user.is_admin() and not current_user.is_owner():
        flash('Access denied! You do not have permission to approve users.', 'danger')
        return redirect(url_for('index'))

    unapproved_users = User.query.filter_by(approved=False).all()
    return render_template('approve_users.html', users=unapproved_users)

@app.route('/approve_user/<int:user_id>', methods=['POST'])
@login_required
def approve_user(user_id):
    if not current_user.is_admin() and not current_user.is_owner():
        flash('Access denied! You do not have permission to approve users.', 'danger')
        return redirect(url_for('index'))

    user = User.query.get_or_404(user_id)
    user.approved = True
    db.session.commit()
    flash(f'{user.username} has been approved.', 'success')
    return redirect(url_for('approve_users'))

#FrontEND API internal
@app.route('/api/best_sell_market', methods=['GET'])
@login_required
def api_best_sell_market():
    selected_commodity = request.args.get('commodity', 'Jalapeno')
    selected_source = request.args.get('source', 'USDA')  # Default to USDA
    last7Days = request.args.get('last7Days', 'false').lower() == 'true'

    # Debugging Logs
    print(f"Received Request - Commodity: {selected_commodity}, Source: {selected_source}, Last 7 Days Filter: {last7Days}")

    # Define the static cities
    cities = ['Baltimore', 'Boston', 'Chicago', 'Columbia', 'Miami', 'New York', 'Philadelphia', 'Los Angeles']

    # Get the current US time and calculate the date 7 days ago
    us_time = datetime.now(timezone('US/Eastern'))
    seven_days_ago = us_time - timedelta(days=7)
    print(f"Current US time: {us_time}, 7 Days Ago: {seven_days_ago}")

    best_market_data = []

    for city in cities:
        print(f"Processing city: {city}")
        
        query = db.session.query(
            func.min(PriceData.price).label('min_price'),
            func.max(PriceData.price).label('max_price'),
            PriceData.year,
            PriceData.day
        ).filter(
            func.upper(PriceData.city_name) == city.upper(),  # Convert to uppercase for case-insensitive comparison
            PriceData.commodity == selected_commodity,
            PriceData.source.in_(['Historical', selected_source])  # Either Historical or selected source
        ).group_by(PriceData.year, PriceData.day).order_by(
            PriceData.year.desc(),
            PriceData.day.desc()
        )

        if last7Days:
            print(f"Applying Last 7 Days filter for {city}")
            # Filter the query further if 'Only Consider Last 7 Days' is checked
            query = query.filter(
                PriceData.year >= seven_days_ago.year,
                PriceData.day >= seven_days_ago.timetuple().tm_yday
            )

        # Execute the query and get the latest prices
        latest_prices = query.first()
        print(f"Query Result for {city}: {latest_prices}")  # Log the result of the query

        # If prices are found, format the range and return the prices
        if latest_prices:
            actual_date = datetime.strptime(f'{latest_prices.year}-{latest_prices.day}', '%Y-%j').strftime('%Y-%m-%d')
            price_range = f"${latest_prices.min_price:.2f} - ${latest_prices.max_price:.2f}" if latest_prices.min_price != latest_prices.max_price else f"${latest_prices.max_price:.2f}"
            best_market_data.append({
                'city_name': city,
                'price_range': price_range,
                'max_price': latest_prices.max_price,  # This will be used for sorting
                'date': actual_date
            })
            print(f"Added data for {city}: Price Range = {price_range}, Date = {actual_date}")
        else:
            # If no data is found for this city, return 'N/A'
            best_market_data.append({
                'city_name': city,
                'price_range': '-',
                'max_price': 0,  # Sorting placeholder
                'date': '-'
            })
            print(f"No data for {city}, adding N/A")

    # Sort the cities by max price (highest to lowest), ensuring '-' prices go to the bottom
    best_market_data = sorted(
        best_market_data,
        key=lambda x: (x['max_price'] != '-', float(x['max_price']) if x['max_price'] != '-' else float('-inf')),
        reverse=True
    )

    print(f"Final Best Market Data (sorted): {best_market_data}")

    return jsonify({
        'best_market': best_market_data
    })


@app.route('/api/most_recent_prices', methods=['GET'])
@login_required
def api_most_recent_prices():
    # List of cities and commodities
    cities = ['Baltimore', 'Boston', 'Chicago', 'Columbia', 'Miami', 'New York', 'Philadelphia', 'Los Angeles']
    commodities = ['Anaheim', 'Cubanelles', 'Fresno', 'Habanero', 'Hungarian Wax', 'Jalapeno', 'Long Hot', 'Poblano', 'Serrano', 'Shishito']

    # Calculate the date 7 days ago
    seven_days_ago = datetime.now(timezone('US/Pacific')) - timedelta(days=7)

    recent_prices = {commodity: {} for commodity in commodities}

    # Fetch the most recent maximum prices for each commodity and city within the last 7 days
    for commodity in commodities:
        for city in cities:
            price_entry = db.session.query(
                func.max(PriceData.price).label('max_price'),
                PriceData.year,
                PriceData.day
            ).filter(
                PriceData.commodity == commodity,
                func.upper(PriceData.city_name) == city.upper(),
                PriceData.year >= seven_days_ago.year,
                PriceData.day >= seven_days_ago.timetuple().tm_yday
            ).group_by(PriceData.year, PriceData.day).order_by(
                PriceData.year.desc(), PriceData.day.desc()
            ).first()

            # If a price is found, store it; otherwise, store '-'
            if price_entry:
                recent_prices[commodity][city] = price_entry.max_price
            else:
                recent_prices[commodity][city] = '-'

    return jsonify({"prices": recent_prices})


#Historical Data (Visualization tab in Google Sheets)
@app.route('/api/historical_data', methods=['GET'])
def historical_data():
    # Fetch the parameters from the frontend
    commodities = request.args.get('commodities').split(',')
    cities = request.args.get('cities').split(',')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    source = request.args.get('source')

    # Convert start_date and end_date into year and day of the year
    start_year = datetime.strptime(start_date, '%Y-%m-%d').year
    start_day = datetime.strptime(start_date, '%Y-%m-%d').timetuple().tm_yday
    end_year = datetime.strptime(end_date, '%Y-%m-%d').year
    end_day = datetime.strptime(end_date, '%Y-%m-%d').timetuple().tm_yday

    # Query the PriceData table based on the filters
    query = PriceData.query.filter(
        PriceData.commodity.in_(commodities),
        PriceData.city_name.in_(cities),
        or_(
            PriceData.source == source,
            PriceData.source == 'Historical'
        ),
        ((PriceData.year == start_year) & (PriceData.day >= start_day)) | 
        ((PriceData.year == end_year) & (PriceData.day <= end_day))
    ).order_by(PriceData.year.asc(), PriceData.day.asc())

    # Extract the data from the query
    data = query.all()

    # Format the data to be returned as JSON for the frontend
    historical_data = []
    for entry in data:
        historical_data.append({
            'date': f"{entry.year}-{entry.day}",
            'city_name': entry.city_name,
            'commodity': entry.commodity,
            'price': entry.price
        })

    return jsonify(historical_data=historical_data)


@app.route('/api/download_historical_data', methods=['GET'])
def download_historical_data():
    # Fetch the parameters from the frontend
    commodities = request.args.get('commodities').split(',')
    cities = request.args.get('cities').split(',')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    source = request.args.get('source')

    # Query the PriceData table based on the filters
    query = PriceData.query.filter(
        PriceData.commodity.in_(commodities),
        PriceData.city_name.in_(cities),
        PriceData.source == source,
        PriceData.date >= start_date,
        PriceData.date <= end_date
    ).order_by(PriceData.date.asc())

    # Fetch the data
    data = query.all()

    # Create an Excel file in memory
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output, {'in_memory': True})
    worksheet = workbook.add_worksheet()

    # Write the headers to the Excel file
    headers = ['Date', 'City', 'Commodity', 'Price']
    for col_num, header in enumerate(headers):
        worksheet.write(0, col_num, header)

    # Write the data rows to the Excel file
    for row_num, entry in enumerate(data, start=1):
        worksheet.write(row_num, 0, entry.date.strftime('%Y-%m-%d'))
        worksheet.write(row_num, 1, entry.city_name)
        worksheet.write(row_num, 2, entry.commodity)
        worksheet.write(row_num, 3, entry.price)

    workbook.close()
    output.seek(0)

    # Send the Excel file as a response
    return send_file(output, attachment_filename='historical_data.xlsx', as_attachment=True)


#Forecast Calculator
def calculate_forecasted_price(variety, city, start_date, forecast_date):
    # Step 1: Determine the season of the forecast date
    season = determine_season_for_dashboard(forecast_date)
    
    # Step 2: Convert start date to year and day of the year
    start_year = start_date.year
    start_day = start_date.timetuple().tm_yday

    # Step 3: Query the PriceData for the given variety, city, and season, starting from the start_date
    historical_data = db.session.query(PriceData.price).filter(
        PriceData.commodity == variety,  # Match the commodity (variety)
        PriceData.city_name == city.upper(),  # Match the city (case insensitive)
        PriceData.season == season,  # Match the season
        PriceData.year >= start_year,  # Consider data from the start year onward
        PriceData.day >= start_day,  # Ensure data is after the start date in the year
        PriceData.source.in_(['USDA', 'Historical'])  # Data can be from USDA or Historical sources
    ).all()

    # Step 4: Calculate the average price from the historical data
    if historical_data:
        total_price = sum([entry.price for entry in historical_data])
        average_price = total_price / len(historical_data)
    else:
        # If no data is found, return a fallback price (optional: log a message)
        average_price = 0.0

    return average_price


@app.route('/api/calculate_forecast', methods=['POST'])
@login_required
def calculate_forecast():
    # Extract the form data
    variety = request.form.get('variety')
    city = request.form.get('city')
    start_date = request.form.get('start_date')
    forecast_date = request.form.get('forecast_date')
    yield_per_acre = request.form.get('yield_per_acre')

    # Validate the form inputs
    if not all([variety, city, start_date, forecast_date, yield_per_acre]):
        return jsonify({"error": "All form fields are required"}), 400

    try:
        # Convert the dates and yield per acre to appropriate data types
        start_date = datetime.strptime(start_date, '%Y-%m-%d')
        forecast_date = datetime.strptime(forecast_date, '%Y-%m-%d')
        yield_per_acre = float(yield_per_acre)
    except ValueError:
        return jsonify({"error": "Invalid date format or yield per acre"}), 400

    # Call the calculate_forecasted_price function
    forecasted_price = calculate_forecasted_price(variety, city, start_date, forecast_date)
    revenue_per_acre = forecasted_price * yield_per_acre

    # Determine the season for the forecast date
    season = determine_season_for_dashboard(forecast_date)

    # Return the results
    return jsonify({
        "forecasted_price": round(forecasted_price, 2),
        "revenue_per_acre": round(revenue_per_acre, 2),
        "season": season
    })



#API FOR Forecast visual
@app.route('/api/seasonal_prices', methods=['GET'])
@login_required
def get_seasonal_prices():
    variety = request.args.get('variety')
    city = request.args.get('city')

    # Check if variety or city is missing
    if not variety or not city:
        return jsonify({"error": "Missing variety or city"}), 400

    # Initialize seasonal_prices dictionary to store prices for each season
    seasonal_prices = {
        'Spring': 0,
        'Summer': 0,
        'Autumn': 0,
        'Winter': 0
    }

    # Define the start date as January 1st, 2018
    start_date = datetime(2018, 1, 1)

    # Loop through each season and calculate the average price
    for season in seasonal_prices.keys():
        # Query data for the given variety, city, and season, starting from the start_date
        historical_data = db.session.query(PriceData.price).filter(
            PriceData.commodity == variety,  # Match the commodity (variety)
            PriceData.city_name == city.upper(),  # Match the city (case insensitive)
            PriceData.season == season,  # Match the season
            PriceData.year >= start_date.year,  # Consider data from 2018 onward
            PriceData.day >= start_date.timetuple().tm_yday,  # Ensure data is after the start date
            PriceData.source.in_(['USDA', 'Historical'])  # Data can be from USDA or Historical sources
        ).all()

        # Calculate the average price from the historical data
        if historical_data:
            total_price = sum([entry.price for entry in historical_data])
            average_price = total_price / len(historical_data)
            seasonal_prices[season] = round(average_price, 2)  # Store the average price for this season
        else:
            seasonal_prices[season] = 0.0  # If no data, set the price to 0

    return jsonify(seasonal_prices)

#TEST ROUTE
@app.route('/trigger_usda_fetch', methods=['GET'])
def trigger_usda_fetch():
    fetch_usda_daily_data()
    fetch_daily_data()
    return "USDA Data Fetch Triggered"


# Run the app
if __name__ == '__main__':
    app.run(debug=True)