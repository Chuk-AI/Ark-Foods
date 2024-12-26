import unittest
from unittest.mock import patch
from notebook import fetch_commodity_data, fetch_data_from_api, get_best_start_dates
import pandas as pd

class TestFetchData(unittest.TestCase):
    
    @patch('your_module.requests.get')
    def test_fetch_commodity_data(self, mock_get):
        # Mock API response
        mock_response = {
            "subset": [{"date": "2024-01-01", "price": 100}, {"date": "2024-01-02", "price": 110}]
        }
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = mock_response

        # Call the function
        start_date = pd.Timestamp("2024-01-01")
        end_date = pd.Timestamp("2024-01-31")
        url = "https://mock-api.com/mock-endpoint"
        data = fetch_commodity_data(start_date, end_date, url)

        # Validate
        self.assertTrue(len(data) > 0)
        self.assertEqual(data[0][2]["subset"][0]["price"], 100)

    @patch('your_module.get_most_recent_file')
    @patch('your_module.pd.read_excel')
    def test_get_best_start_dates(self, mock_read_excel, mock_get_file):
        # Mock file detection and reading
        mock_get_file.return_value = "mock-file.xlsx"
        mock_df = pd.DataFrame({
            "varietyName": ["Pepper1", "Pepper2"],
            "date": pd.to_datetime(["2024-01-01", "2024-01-02"])
        })
        mock_read_excel.return_value = mock_df

        # Call the function
        start_dates = get_best_start_dates()

        # Validate
        self.assertIn("terminal_market", start_dates)
        self.assertIn("shipping_point", start_dates)
        self.assertIsInstance(start_dates["terminal_market"], pd.Timestamp)

if __name__ == "__main__":
    unittest.main()
