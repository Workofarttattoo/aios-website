"""
Copyright (c) 2025 Joshua Hendricks Cole (DBA: Corporation of Light). All Rights Reserved. PATENT PENDING.

Quantum Prediction Tools - Backtesting Framework
Tests quantum prediction algorithms against historical market data.
Validates accuracy, provides performance metrics, and generates reports.
"""

import numpy as np
from dataclasses import dataclass
from typing import Dict, List, Tuple
from datetime import datetime, timedelta
import json


@dataclass
class BacktestResult:
    """Results from backtesting a prediction model"""
    ticker: str
    prediction_horizon: int
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    total_predictions: int
    correct_predictions: int
    rmse: float
    mean_absolute_error: float
    sharpe_ratio: float
    max_drawdown: float
    win_rate: float
    avg_win: float
    avg_loss: float
    profit_factor: float
    test_period: str


class HistoricalDataGenerator:
    """Generates realistic historical price data for testing"""

    @staticmethod
    def generate_stock_data(ticker: str, days: int = 500, initial_price: float = 100) -> np.ndarray:
        """
        Generate realistic stock price data using geometric Brownian motion.
        Resembles actual market behavior with trends, reversions, and volatility clustering.
        """
        np.random.seed(hash(ticker) % 2**32)  # Consistent seed per ticker

        returns = np.random.normal(0.0005, 0.015, days)  # Daily returns: 0.05% mean, 1.5% std
        prices = initial_price * np.exp(np.cumsum(returns))

        # Add trend
        trend = np.linspace(0, 0.3, days)
        prices = prices * (1 + trend * 0.1)

        # Add mean reversion
        sma = np.convolve(prices, np.ones(20)/20, mode='same')
        prices = 0.7 * prices + 0.3 * sma

        return prices

    @staticmethod
    def generate_crypto_data(ticker: str, days: int = 500, initial_price: float = 50000) -> np.ndarray:
        """
        Generate cryptocurrency price data with higher volatility and regime changes.
        Models crypto-specific behaviors: rapid trends, crashes, recoveries.
        """
        np.random.seed(hash(ticker) % 2**32)

        prices = [initial_price]
        for i in range(days - 1):
            # Regime changes every 50-100 days
            regime = int(i / 75) % 3
            if regime == 0:  # Bull market
                daily_return = np.random.normal(0.002, 0.03)
            elif regime == 1:  # Bear market
                daily_return = np.random.normal(-0.001, 0.035)
            else:  # Volatile sideways
                daily_return = np.random.normal(0, 0.04)

            new_price = prices[-1] * (1 + daily_return)
            prices.append(max(new_price, prices[-1] * 0.7))  # Prevent crashes below 70%

        return np.array(prices)

    @staticmethod
    def split_into_windows(prices: np.ndarray, train_size: int = 300, test_size: int = 150) -> Tuple:
        """Split price data into train/validation/test windows"""
        train = prices[:train_size]
        val = prices[train_size:train_size + test_size]
        test = prices[train_size + test_size:]
        return train, val, test


class QuantumPredictionBacktester:
    """Backtest quantum predictions against historical data"""

    def __init__(self, framework_module):
        """Initialize with quantum prediction framework"""
        self.framework = framework_module
        self.results = []

    def test_stock_prediction(self, ticker: str, horizon: int = 30) -> BacktestResult:
        """
        Backtest stock prediction on historical data.

        Process:
        1. Generate/fetch historical stock data
        2. Create overlapping windows for time-series evaluation
        3. Make predictions for each window
        4. Compare predictions to actual prices
        5. Calculate accuracy metrics
        """
        print(f"\n{'='*60}")
        print(f"Testing {ticker} - {horizon} day horizon")
        print(f"{'='*60}")

        # Generate historical data
        prices = HistoricalDataGenerator.generate_stock_data(ticker, days=500)
        train, val, test = HistoricalDataGenerator.split_into_windows(
            prices, train_size=300, test_size=100
        )

        # Train on historical data
        predictor = self.framework.QuantumEnsemblePredictor(num_ensemble_members=3)

        # Make predictions on test set using walk-forward validation
        predictions = []
        actuals = []
        confidences = []

        for i in range(horizon, len(test) - horizon):
            # Use data up to current point
            hist_window = np.concatenate([train, val, test[:i]])

            # Make prediction
            pred_result = predictor.predict(hist_window)
            predictions.append(pred_result.prediction)
            confidences.append(pred_result.confidence)

            # Actual future price (normalized to [-1, 1] for comparison)
            actual_change = (test[i + horizon] - test[i]) / test[i]
            actuals.append(actual_change)

        predictions = np.array(predictions)
        actuals = np.array(actuals)
        confidences = np.array(confidences)

        # Calculate metrics
        pred_direction = np.sign(predictions)
        actual_direction = np.sign(actuals)

        # Accuracy: % of correct directional predictions
        correct_direction = np.sum(pred_direction == actual_direction)
        accuracy = correct_direction / len(predictions)

        # RMSE and MAE
        rmse = np.sqrt(np.mean((predictions - actuals) ** 2))
        mae = np.mean(np.abs(predictions - actuals))

        # Precision and Recall (for "bullish" predictions)
        pred_bullish = pred_direction > 0
        actual_bullish = actual_direction > 0

        true_positives = np.sum(pred_bullish & actual_bullish)
        false_positives = np.sum(pred_bullish & ~actual_bullish)
        false_negatives = np.sum(~pred_bullish & actual_bullish)

        precision = true_positives / (true_positives + false_positives + 1e-10)
        recall = true_positives / (true_positives + false_negatives + 1e-10)
        f1 = 2 * (precision * recall) / (precision + recall + 1e-10)

        # Trading metrics
        returns = actuals  # Actual returns
        pred_returns = predictions  # Predicted returns

        # Sharpe ratio (excess return per unit of risk)
        sharpe = np.sqrt(252) * np.mean(returns) / (np.std(returns) + 1e-10)

        # Maximum drawdown
        cumulative_returns = np.cumprod(1 + returns)
        running_max = np.maximum.accumulate(cumulative_returns)
        drawdown = (cumulative_returns - running_max) / running_max
        max_drawdown = np.min(drawdown)

        # Win rate and profit metrics
        wins = np.sum(returns > 0)
        win_rate = wins / len(returns)
        avg_win = np.mean(returns[returns > 0]) if np.any(returns > 0) else 0
        avg_loss = np.mean(returns[returns < 0]) if np.any(returns < 0) else 0
        profit_factor = abs(np.sum(returns[returns > 0]) / np.sum(returns[returns < 0])) if np.any(returns < 0) else 0

        result = BacktestResult(
            ticker=ticker,
            prediction_horizon=horizon,
            accuracy=float(accuracy),
            precision=float(precision),
            recall=float(recall),
            f1_score=float(f1),
            total_predictions=len(predictions),
            correct_predictions=int(correct_direction),
            rmse=float(rmse),
            mean_absolute_error=float(mae),
            sharpe_ratio=float(sharpe),
            max_drawdown=float(max_drawdown),
            win_rate=float(win_rate),
            avg_win=float(avg_win),
            avg_loss=float(avg_loss),
            profit_factor=float(profit_factor),
            test_period=f"300 training, 100 validation, {len(test)-horizon} test days"
        )

        self._print_result(result)
        self.results.append(result)
        return result

    def test_crypto_prediction(self, ticker: str, horizon: int = 7) -> BacktestResult:
        """Backtest crypto prediction (higher volatility, different regime)"""
        print(f"\n{'='*60}")
        print(f"Testing {ticker} (Crypto) - {horizon} day horizon")
        print(f"{'='*60}")

        # Generate crypto data (higher volatility)
        prices = HistoricalDataGenerator.generate_crypto_data(ticker, days=500)
        train, val, test = HistoricalDataGenerator.split_into_windows(
            prices, train_size=300, test_size=100
        )

        predictor = self.framework.QuantumEnsemblePredictor(num_ensemble_members=3)

        predictions = []
        actuals = []

        for i in range(horizon, len(test) - horizon):
            hist_window = np.concatenate([train, val, test[:i]])
            pred_result = predictor.predict(hist_window)
            predictions.append(pred_result.prediction)

            actual_change = (test[i + horizon] - test[i]) / test[i]
            actuals.append(actual_change)

        predictions = np.array(predictions)
        actuals = np.array(actuals)

        # Same calculations as stock
        pred_direction = np.sign(predictions)
        actual_direction = np.sign(actuals)

        correct_direction = np.sum(pred_direction == actual_direction)
        accuracy = correct_direction / len(predictions)

        rmse = np.sqrt(np.mean((predictions - actuals) ** 2))
        mae = np.mean(np.abs(predictions - actuals))

        pred_bullish = pred_direction > 0
        actual_bullish = actual_direction > 0

        true_positives = np.sum(pred_bullish & actual_bullish)
        false_positives = np.sum(pred_bullish & ~actual_bullish)
        false_negatives = np.sum(~pred_bullish & actual_bullish)

        precision = true_positives / (true_positives + false_positives + 1e-10)
        recall = true_positives / (true_positives + false_negatives + 1e-10)
        f1 = 2 * (precision * recall) / (precision + recall + 1e-10)

        returns = actuals
        sharpe = np.sqrt(365) * np.mean(returns) / (np.std(returns) + 1e-10)

        cumulative_returns = np.cumprod(1 + returns)
        running_max = np.maximum.accumulate(cumulative_returns)
        drawdown = (cumulative_returns - running_max) / running_max
        max_drawdown = np.min(drawdown)

        wins = np.sum(returns > 0)
        win_rate = wins / len(returns)
        avg_win = np.mean(returns[returns > 0]) if np.any(returns > 0) else 0
        avg_loss = np.mean(returns[returns < 0]) if np.any(returns < 0) else 0
        profit_factor = abs(np.sum(returns[returns > 0]) / np.sum(returns[returns < 0])) if np.any(returns < 0) else 0

        result = BacktestResult(
            ticker=ticker,
            prediction_horizon=horizon,
            accuracy=float(accuracy),
            precision=float(precision),
            recall=float(recall),
            f1_score=float(f1),
            total_predictions=len(predictions),
            correct_predictions=int(correct_direction),
            rmse=float(rmse),
            mean_absolute_error=float(mae),
            sharpe_ratio=float(sharpe),
            max_drawdown=float(max_drawdown),
            win_rate=float(win_rate),
            avg_win=float(avg_win),
            avg_loss=float(avg_loss),
            profit_factor=float(profit_factor),
            test_period=f"300 training, 100 validation, {len(test)-horizon} test days (Crypto)"
        )

        self._print_result(result)
        self.results.append(result)
        return result

    def _print_result(self, result: BacktestResult):
        """Print formatted backtest result"""
        print(f"\n{'BACKTEST RESULTS':^60}")
        print(f"{'='*60}")
        print(f"Ticker: {result.ticker:30} Horizon: {result.prediction_horizon} days")
        print(f"{'-'*60}")
        print(f"Accuracy: {result.accuracy:.1%} ({result.correct_predictions}/{result.total_predictions} correct)")
        print(f"Precision: {result.precision:.1%} | Recall: {result.recall:.1%} | F1: {result.f1_score:.3f}")
        print(f"{'-'*60}")
        print(f"RMSE: {result.rmse:.4f} | MAE: {result.mean_absolute_error:.4f}")
        print(f"Sharpe Ratio: {result.sharpe_ratio:.3f}")
        print(f"Max Drawdown: {result.max_drawdown:.1%}")
        print(f"{'-'*60}")
        print(f"Win Rate: {result.win_rate:.1%}")
        print(f"Avg Win: {result.avg_win:+.3f} | Avg Loss: {result.avg_loss:+.3f}")
        print(f"Profit Factor: {result.profit_factor:.2f}")
        print(f"{'='*60}\n")

    def generate_report(self) -> Dict:
        """Generate comprehensive backtest report"""
        return {
            "timestamp": datetime.now().isoformat(),
            "results": [
                {
                    "ticker": r.ticker,
                    "horizon_days": r.prediction_horizon,
                    "accuracy": r.accuracy,
                    "f1_score": r.f1_score,
                    "sharpe_ratio": r.sharpe_ratio,
                    "win_rate": r.win_rate,
                    "profit_factor": r.profit_factor,
                    "test_period": r.test_period
                }
                for r in self.results
            ],
            "summary": {
                "total_tests": len(self.results),
                "avg_accuracy": np.mean([r.accuracy for r in self.results]),
                "avg_sharpe": np.mean([r.sharpe_ratio for r in self.results]),
                "avg_profit_factor": np.mean([r.profit_factor for r in self.results])
            }
        }


def run_comprehensive_backtest():
    """Run complete backtest suite"""
    print("\n" + "="*60)
    print("QUANTUM PREDICTION TOOLS - COMPREHENSIVE BACKTEST")
    print("="*60)

    import sys
    sys.path.insert(0, '/Users/noone/aios-website')

    try:
        import quantum_prediction_framework as qpf
    except ImportError:
        print("Error: quantum_prediction_framework not found")
        return

    backtester = QuantumPredictionBacktester(qpf)

    # Test stocks
    print("\n>>> STOCK MARKET PREDICTIONS")
    backtester.test_stock_prediction("AAPL", horizon=7)
    backtester.test_stock_prediction("AAPL", horizon=30)
    backtester.test_stock_prediction("MSFT", horizon=30)
    backtester.test_stock_prediction("TSLA", horizon=30)

    # Test crypto
    print("\n>>> CRYPTOCURRENCY PREDICTIONS")
    backtester.test_crypto_prediction("BTC", horizon=7)
    backtester.test_crypto_prediction("ETH", horizon=7)
    backtester.test_crypto_prediction("BTC", horizon=30)

    # Generate report
    report = backtester.generate_report()

    print("\n" + "="*60)
    print("SUMMARY REPORT")
    print("="*60)
    print(f"Total Tests: {report['summary']['total_tests']}")
    print(f"Average Accuracy: {report['summary']['avg_accuracy']:.1%}")
    print(f"Average Sharpe Ratio: {report['summary']['avg_sharpe']:.3f}")
    print(f"Average Profit Factor: {report['summary']['avg_profit_factor']:.2f}")
    print("="*60)

    return report


if __name__ == "__main__":
    report = run_comprehensive_backtest()
    print("\nBacktest complete. Report available in output.")
