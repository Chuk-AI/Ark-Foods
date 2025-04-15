import logging
from datetime import datetime, timedelta
from sqlalchemy import func, desc, and_

from app import db
from app import AlertSetting, Notification, PriceData, app

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_price_alerts():
    """
    Main function to check for price alerts.
    This is called by the scheduler to check for significant price changes.
    """
    logger.info(f"Running price alert check at {datetime.now()}")
    
    try:
        # Process all active alert settings
        active_alerts = AlertSetting.query.filter_by(is_active=True).all()
        logger.info(f"Processing {len(active_alerts)} active alert settings")

        
        for alert in active_alerts:
            logger.info(f"Checking alert for user {alert.user_id}, {alert.commodity} with threshold {alert.threshold}%")
            
            # Get the latest and previous prices specifically for this commodity
            latest_price_data = PriceData.query.filter(
                PriceData.commodity == alert.commodity,
                PriceData.city_name == alert.city,
                PriceData.source == "ProduceIQ"
            ).order_by(PriceData.year.desc(), PriceData.day.desc()).first()
            
            if not latest_price_data:
                logger.warning(f"No current price found for {alert.commodity} in {alert.city}")
                continue
            
            # Get second most recent price data for this commodity
            previous_price_data = PriceData.query.filter(
                PriceData.commodity == alert.commodity,
                PriceData.city_name == alert.city,
                PriceData.source == "ProduceIQ",
                ((PriceData.year < latest_price_data.year) | 
                ((PriceData.year == latest_price_data.year) & (PriceData.day < latest_price_data.day)))
            ).order_by(PriceData.year.desc(), PriceData.day.desc()).first()
            
            if not previous_price_data:
                logger.warning(f"No previous price found for {alert.commodity} in {alert.city}")
                continue
            
            logger.info(f"Found data: Latest price=${latest_price_data.price} on day {latest_price_data.day}/{latest_price_data.year}, Previous price=${previous_price_data.price} on day {previous_price_data.day}/{previous_price_data.year}")
            
            # Calculate price change percentage
            price_change_pct = ((latest_price_data.price - previous_price_data.price) / previous_price_data.price) * 100
            logger.info(f"Price change: {price_change_pct:.2f}% (threshold: {alert.threshold}%)")
            
            # Check if threshold is exceeded - handle both positive and negative thresholds
            if (alert.threshold >= 0 and price_change_pct >= alert.threshold) or \
               (alert.threshold < 0 and price_change_pct <= alert.threshold):
                
                # Description based on whether it's an increase or decrease
                change_type = "increase" if price_change_pct >= 0 else "decrease"
                logger.info(f"Alert triggered for user {alert.user_id}, {alert.commodity}: {price_change_pct:.2f}% {change_type}")
                
                # Check if we already sent this alert
                existing_notification = Notification.query.filter(
                    and_(
                        Notification.alert_setting_id == alert.id,
                        Notification.created_at >= datetime.utcnow() - timedelta(days=1)
                    )
                ).first()
                
                if not existing_notification:
                    # Create notification
                    if price_change_pct >= 0:
                        title = f"{alert.commodity} Price Alert: {price_change_pct:.1f}% Increase"
                        message = (
                            f"The price of {alert.commodity} in {alert.city} has increased by {price_change_pct:.1f}%, "
                            f"from ${previous_price_data.price:.2f} to ${latest_price_data.price:.2f}. "
                            f"This exceeds your alert threshold of {alert.threshold:.1f}%."
                        )
                    else:
                        title = f"{alert.commodity} Price Alert: {abs(price_change_pct):.1f}% Decrease"
                        message = (
                            f"The price of {alert.commodity} in {alert.city} has decreased by {abs(price_change_pct):.1f}%, "
                            f"from ${previous_price_data.price:.2f} to ${latest_price_data.price:.2f}. "
                            f"This meets your alert threshold of {alert.threshold:.1f}%."
                        )
                    
                    notification = Notification(
                        user_id=alert.user_id,  # Include user_id from the alert
                        alert_setting_id=alert.id,
                        title=title,
                        message=message,
                        read=False
                    )
                    
                    db.session.add(notification)
                    logger.info(f"Created notification for user {alert.user_id}: {title}")
                else:
                    logger.info(f"Alert already sent for user {alert.user_id}, {alert.commodity} within the last 24 hours")
        
        # Commit all changes
        db.session.commit()
        logger.info("Price alert check completed successfully")
            
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in price alert check: {str(e)}")

def process_alert(alert, current_day, current_year):
    """Process a single alert setting to check for price changes."""
    try:
        # Get the latest price for this commodity
        latest_price = get_latest_price(alert.city, alert.commodity, current_day, current_year)
        
        if not latest_price:
            logger.warning(f"No current price found for {alert.commodity}")
            return
            
        # Get the recent price history to compare against
        previous_price = get_previous_price(alert.city, alert.commodity, current_day, current_year)
        
        if not previous_price:
            logger.warning(f"No previous price found for {alert.commodity}")
            return
            
        # Calculate the price change percentage
        price_change_pct = ((latest_price - previous_price) / previous_price) * 100
        
        # Check if threshold is exceeded - handle both positive and negative thresholds
        if (alert.threshold >= 0 and price_change_pct >= alert.threshold) or \
           (alert.threshold < 0 and price_change_pct <= alert.threshold):
            # Threshold exceeded, create notification
            change_type = "increase" if price_change_pct >= 0 else "decrease"
            logger.info(f"Alert triggered for user {alert.user_id}, {alert.commodity}: {price_change_pct:.2f}% {change_type}")
            
            # Check if we already sent this alert
            existing_notification = Notification.query.filter(
                and_(
                    Notification.alert_setting_id == alert.id,
                    Notification.created_at >= datetime.utcnow() - timedelta(days=1)
                )
            ).first()
            
            if not existing_notification:
                create_price_alert_notification(
                    alert, 
                    latest_price, 
                    previous_price, 
                    price_change_pct
                )
            else:
                logger.info(f"Alert already sent for user {alert.user_id}, {alert.commodity} within the last 24 hours")
                
    except Exception as e:
        logger.error(f"Error processing alert {alert.id}: {str(e)}")


def get_latest_price(city, commodity, current_day, current_year):
    """Get the latest price for a commodity."""
    # Query the most recent price for this commodity
    price_data = PriceData.query.filter(
        PriceData.city_name == city,  # Add city filter
        PriceData.commodity == commodity,
        PriceData.year == current_year,
        PriceData.day == current_day,
        PriceData.source == "ProduceIQ"
    ).order_by(desc(PriceData.id)).first()
    
    return price_data.price if price_data else None

def test_notification_creation():
    """Test if notification creation works properly."""
    try:
        # Create a test notification
        test_notification = Notification(
            user_id=1,  # Add a default user ID for testing
            alert_setting_id=None,  # Can be null
            title="Test Notification",
            message="This is a test notification",
            read=False
        )
        
        db.session.add(test_notification)
        db.session.commit()
        
        return {"success": True, "notification_id": test_notification.id}
    except Exception as e:
        db.session.rollback()
        return {"success": False, "error": str(e)}
        

def get_previous_price(city, commodity, current_day, current_year):
    """Get the previous price for comparison."""
    # Find the previous data point to compare against
    # First try yesterday
    yesterday_day = current_day - 1
    yesterday_year = current_year
    
    # Handle year boundary
    if yesterday_day <= 0:
        yesterday_day = 365
        yesterday_year = current_year - 1
    
    # Query the previous price
    previous_price_data = PriceData.query.filter(
        PriceData.city_name == city,  # Add city filter
        PriceData.commodity == commodity,
        PriceData.year == yesterday_year,
        PriceData.day == yesterday_day,
        PriceData.source == "ProduceIQ"
    ).first()
    
    # If no data for yesterday, try to find the most recent data before today
    if not previous_price_data:
        previous_price_data = PriceData.query.filter(
            PriceData.city_name == city,  # Add city filter
            PriceData.commodity == commodity,
            ((PriceData.year < current_year) | 
             ((PriceData.year == current_year) & (PriceData.day < current_day))),
            PriceData.source == "ProduceIQ"
        ).order_by(PriceData.year.desc(), PriceData.day.desc()).first()
    
    return previous_price_data.price if previous_price_data else None


def create_price_alert_notification(alert, latest_price, previous_price, price_change_pct):
    """Create a notification for a price alert."""
    # Format the notification based on whether it's an increase or decrease
    if price_change_pct >= 0:
        title = f"{alert.commodity} Price Alert: {price_change_pct:.1f}% Increase"
        message = (
            f"The price of {alert.commodity} in {alert.city} has increased by {price_change_pct:.1f}%, "
            f"from ${previous_price:.2f} to ${latest_price:.2f}. "
            f"This exceeds your alert threshold of {alert.threshold:.1f}%."
        )
    else:
        title = f"{alert.commodity} Price Alert: {abs(price_change_pct):.1f}% Decrease"
        message = (
            f"The price of {alert.commodity} in {alert.city} has decreased by {abs(price_change_pct):.1f}%, "
            f"from ${previous_price:.2f} to ${latest_price:.2f}. "
            f"This meets your alert threshold of {alert.threshold:.1f}%."
        )
    
    # Create the notification
    notification = Notification(
        user_id=alert.user_id,  # Include user_id from the alert
        alert_setting_id=alert.id,
        title=title,
        message=message,
        read=False
    )
    
    db.session.add(notification)
    logger.info(f"Created notification for user {alert.user_id}, alert {alert.id}: {title}")


def update_price_history():
    """
    This function is no longer needed since we're using the existing PriceData model.
    It remains as a placeholder for backward compatibility with the scheduler.
    """
    logger.info("Price history update skipped - using existing PriceData model")
    return


# Only run this if the file is executed directly
if __name__ == "__main__":
    with app.app_context():
        check_price_alerts()