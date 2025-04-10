from app import app
from alert_service import check_price_alerts

with app.app_context():
    check_price_alerts()