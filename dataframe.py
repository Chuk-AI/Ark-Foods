# from flask import Flask, jsonify, current_app
# from flask_sqlalchemy import SQLAlchemy
# import pandas as pd
# from sqlalchemy import text
# import threading
# import logging
# import plotly.graph_objs as go
# import os
# from datetime import datetime, timedelta


# # Configure logging
# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

# # Initialize Flask app
# app = Flask(__name__)

# # Database Configuration
# DATABASE_URL = os.environ.get("DATABASE_URL")
# if DATABASE_URL:
#     # Replace the "postgres://" scheme with "postgresql://" for compatibility with SQLAlchemy
#     app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL.replace(
#         "postgres://", "postgresql://", 1
#     )
# else:
#     # Use SQLite for local development
#     app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(
#         app.instance_path, "users.db"
#     )

# # Configure other Flask settings
# app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
# app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=1)

# # Initialize SQLAlchemy
# db = SQLAlchemy(app)

# # Global DataFrame and lock
# price_data_df = None
# df_lock = threading.Lock()

# def get_dataframe():
#     """
#     Safely get the global DataFrame, initializing if necessary
#     """
#     global price_data_df
    
#     if price_data_df is None:
#         with df_lock:
#             if price_data_df is None:
#                 try:
#                     logger.info("Initializing DataFrame on first request...")
#                     initialize_dataframe(current_app)
#                 except Exception as e:
#                     logger.error(f"Error initializing DataFrame: {str(e)}")
#                     raise
    
#     return price_data_df

# def initialize_dataframe(app):
#     """
#     Initialize the global DataFrame with data from the database.
#     """
#     global price_data_df
    
#     try:
#         logger.info("Starting DataFrame initialization...")
        
#         query = text("""
#             SELECT id, city_name, commodity, year, day, price, source, season
#             FROM price_data
#         """)
        
#         result = db.session.execute(query).fetchall()
#         logger.info(f"Query executed, fetched {len(result)} records")
        
#         # Fixed DataFrame creation
#         columns = ['id', 'city_name', 'commodity', 'year', 'day', 'price', 'source', 'season']
#         price_data_df = pd.DataFrame(data=result, columns=columns)
        
#         logger.info(f"DataFrame created with shape: {price_data_df.shape}")
#         logger.info(f"Memory usage: {price_data_df.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB")
#         logger.info("\nSample data:")
#         logger.info(price_data_df.head())
        
#     except Exception as e:
#         logger.error(f"Error in initialize_dataframe: {str(e)}")
#         raise

# # Test route to check DataFrame status
# @app.route("/api/test_dataframe")
# def test_dataframe():
#     try:
#         df = get_dataframe()
#         return jsonify({
#             "status": "success",
#             "total_records": len(df),
#             "columns": list(df.columns),
#             "sample_data": df.head(5).to_dict('records'),
#             "memory_usage": f"{df.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB",
#             "data_types": df.dtypes.astype(str).to_dict()
#         })
#     except Exception as e:
#         logger.error(f"Error in test_dataframe route: {str(e)}")
#         return jsonify({
#             "status": "error",
#             "message": str(e)
#         }), 500

# # Test route for violin plot
# # Test route for violin plot
# @app.route("/api/terminal_price_violin", methods=["GET"])
# def terminal_price_violin():
#     try:
#         logger.info("Generating terminal violin plots...")
        
#         df = get_dataframe()
        
#         if df is None or df.empty:
#             return jsonify({"error": "Data not available"}), 500
        
#         filtered_df = df[df['source'].isin(['USDA', 'ProduceIQ'])]
        
#         if filtered_df.empty:
#             return jsonify({"error": "No data available for selected sources"}), 404
        
#         data = {"USDA": {"x": [], "y": []}, "ProduceIQ": {"x": [], "y": []}}
        
#         for source in ['USDA', 'ProduceIQ']:
#             source_df = filtered_df[filtered_df['source'] == source]
#             data[source]["x"] = source_df['commodity'].tolist()
#             data[source]["y"] = source_df['price'].tolist()
        
#         charts = {}
#         for source in ["USDA", "ProduceIQ"]:
#             if data[source]["x"]:
#                 fig = go.Figure()
#                 fig.add_trace(
#                     go.Violin(
#                         x=data[source]["x"],
#                         y=data[source]["y"],
#                         name=source,
#                         box_visible=True,
#                         meanline_visible=True,
#                         marker_color='blue'
#                     )
#                 )
#                 fig.update_layout(
#                     title=f"{source} Terminal Data",
#                     xaxis_title="Commodity",
#                     yaxis_title="Price",
#                     height=500,
#                     width=600
#                 )
#                 charts[source] = fig.to_dict()
        
#         return jsonify(charts), 200
        
#     except Exception as e:
#         logger.error(f"Error in terminal_price_violin: {str(e)}")
#         return jsonify({"error": str(e)}), 500


# # Initialize DataFrame when starting the app
# print("Starting application...")
# with app.app_context():
#     try:
#         initialize_dataframe(app)
#         print("DataFrame initialized successfully!")
#     except Exception as e:
#         print(f"Error during initialization: {e}")
#         print("Application will continue and try to initialize DataFrame on first request")

# if __name__ == "__main__":
#     app.run(debug=True, port=5001)  # Using port 5001 to avoid conflicts