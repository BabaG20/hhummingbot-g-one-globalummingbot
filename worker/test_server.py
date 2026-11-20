import unittest
from server import validate_payload

class PaperPayloadTests(unittest.TestCase):
    def good(self):
        return {"name":"btc_paper","exchange":"binance_paper_trade","trading_pair":"BTC-USDT","order_amount":0.001,"bid_spread":0.004,"ask_spread":0.004,"order_refresh_time":15}
    def test_accepts_paper_config(self):
        result = validate_payload(self.good())
        self.assertEqual(result["exchange"], "binance_paper_trade")
        self.assertEqual(result["price_type"], "mid")
    def test_rejects_live_connector(self):
        data = self.good(); data["exchange"] = "binance"
        with self.assertRaises(ValueError): validate_payload(data)
    def test_rejects_invalid_pair(self):
        data = self.good(); data["trading_pair"] = "../../BTC"
        with self.assertRaises(ValueError): validate_payload(data)
    def test_rejects_nonpositive_order_amount(self):
        data = self.good(); data["order_amount"] = 0
        with self.assertRaises(ValueError): validate_payload(data)
    def test_rejects_percentage_not_decimal_spread(self):
        data = self.good(); data["bid_spread"] = 0.4
        with self.assertRaises(ValueError): validate_payload(data)
    def test_rejects_boolean_as_number(self):
        data = self.good(); data["order_amount"] = True
        with self.assertRaises(ValueError): validate_payload(data)
    def test_rejects_fractional_refresh_seconds(self):
        data = self.good(); data["order_refresh_time"] = 1.5
        with self.assertRaises(ValueError): validate_payload(data)

if __name__ == "__main__": unittest.main()