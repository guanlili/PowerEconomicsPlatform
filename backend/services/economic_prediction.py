"""
经济预测服务
重构自: backend/算法包/经济预测-以区域场景为例/经济预测.py

提供基于 ARIMA 时间序列模型的经济指标预测功能：
- 支持多指标并行预测
- 自动区分率值类指标和绝对值类指标使用不同 ARIMA 参数
- 提供预测值与实际值对比及精准度评估
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA

logger = logging.getLogger(__name__)

# Default ARIMA parameters
DEFAULT_FORECAST_PERIODS = 12
# For rate/percentage type indicators
RATE_ARIMA_ORDER = (1, 1, 1)
# For absolute value type indicators
VALUE_ARIMA_ORDER = (2, 1, 2)

# Keywords that indicate a rate/percentage type indicator
RATE_KEYWORDS = ["增速", "率", "PPI", "CPI", "ppi", "cpi"]


def _convert_time_format(time_str: Any) -> Optional[datetime]:
    """
    Convert various time string formats to datetime.

    Supports formats like:
    - '2023-01' (YYYY-MM with dash)
    - '202301' (6-digit YYYYMM)
    - '2023012' (7-digit, uncommon)
    - Any format pandas can parse
    """
    time_str = str(time_str)
    try:
        if "-" in time_str and len(time_str) >= 7:
            year = int(time_str[:4])
            month = int(time_str[5:7])
            return datetime(year, month, 1)
        elif len(time_str) == 6 and time_str.isdigit():
            year = int(time_str[:4])
            month = int(time_str[4:6])
            return datetime(year, month, 1)
        elif len(time_str) == 7 and time_str.isdigit():
            year = int(time_str[:4])
            month = int(time_str[4:7])
            return datetime(year, month, 1)
        else:
            return pd.to_datetime(time_str)
    except Exception:
        return None


def _detect_date_column(df: pd.DataFrame) -> Optional[str]:
    """Detect the date/time column in a DataFrame."""
    candidates = ["月份", "时间", "日期", "date", "time", "period"]
    for col in candidates:
        if col in df.columns:
            return col
    return None


def _arima_forecast(series: pd.Series, forecast_periods: int = 12,
                    p: int = 1, d: int = 1, q: int = 1) -> List[float]:
    """
    Run ARIMA forecast on a time series.

    Falls back to a simple estimate if ARIMA fails or data is insufficient.

    Args:
        series: Time series data
        forecast_periods: Number of periods to forecast
        p, d, q: ARIMA order parameters

    Returns:
        List of forecasted values
    """
    try:
        series = series.dropna()
        if len(series) < 12:
            logger.warning(f"数据点不足 ({len(series)} < 12)，使用末值填充")
            return [float(series.iloc[-1])] * forecast_periods

        model = ARIMA(series, order=(p, d, q))
        model_fit = model.fit()
        forecast = model_fit.forecast(steps=forecast_periods)
        return forecast.values.tolist()
    except Exception as e:
        logger.warning(f"ARIMA 预测失败: {e}，使用降级策略")
        last_value = float(series.iloc[-1])
        if len(series) >= 12:
            seasonal_avg = float(np.mean(series[-12:].values))
            return [last_value * 0.9 + seasonal_avg * 0.1] * forecast_periods
        else:
            return [last_value] * forecast_periods


def _is_rate_type(col_name: str) -> bool:
    """Check if an indicator is rate/percentage type based on its name."""
    for kw in RATE_KEYWORDS:
        if kw in col_name:
            return True
    return False


def _calculate_accuracy(actual: List[float], predicted: List[float]) -> Optional[float]:
    """
    Calculate prediction accuracy using MAPE (Mean Absolute Percentage Error).

    Returns accuracy as percentage (0-100), or None if calculation is impossible.
    """
    min_len = min(len(actual), len(predicted))
    actual_vals = actual[:min_len]
    predicted_vals = predicted[:min_len]

    ape_values = []
    for a, p in zip(actual_vals, predicted_vals):
        if a != 0:
            ape = abs((a - p) / a)
            ape_values.append(ape)

    if ape_values:
        mape = np.mean(ape_values)
        accuracy = (1 - mape) * 100
        return round(float(accuracy), 2)
    return None


def predict_economics(
    history_df: pd.DataFrame,
    actual_df: Optional[pd.DataFrame] = None,
    target_columns: Optional[List[str]] = None,
    forecast_periods: int = DEFAULT_FORECAST_PERIODS,
    start_date: Optional[str] = None,
    date_col: Optional[str] = None,
    date_start: Optional[str] = None,
    date_end: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Predict economic indicators using ARIMA time series models.

    Args:
        history_df: Historical economic data DataFrame (with date column and indicator columns)
        actual_df: Actual data for comparison/evaluation (optional)
        target_columns: List of indicator column names to predict.
                        If None, auto-detect all numeric columns.
        forecast_periods: Number of periods to forecast (default 12)
        start_date: Start date for forecast period in 'YYYY-MM-DD' format.
                    Auto-detected if None.
        date_col: Name of the date/time column. Auto-detected if None.
        date_start: Optional start date to filter history rows (e.g. "2020-01").
        date_end: Optional end date to filter history rows (e.g. "2023-06").

    Returns:
        Dict with keys:
            - forecasts: List of dicts with date and {indicator}_pred values
            - actuals: List of dicts with date and {indicator}_actual values (if actual_df provided)
            - comparison: List of dicts combining forecasts, actuals and monthly accuracy
            - accuracy_summary: List of dicts with indicator and accuracy
            - monthly_accuracy: List of dicts with date and per-indicator accuracy
            - target_columns: List of indicator names used

        On error, returns dict with 'error' key.
    """
    try:
        # --- 1. Detect date column and preprocess history ---
        if date_col is None:
            date_col = _detect_date_column(history_df)

        if date_col is None:
            return {
                "error": f"无法识别日期列，可用列为: {history_df.columns.tolist()}。请指定 date_col 参数。"
            }

        history_df = history_df.copy()
        history_df["_datetime"] = history_df[date_col].apply(_convert_time_format)
        history_df = history_df.dropna(subset=["_datetime"])
        history_df.set_index("_datetime", inplace=True)

        if len(history_df) == 0:
            return {"error": "历史数据中无有效时间数据"}

        # 1.5 Filter history rows by user-selected date range
        if date_start or date_end:
            try:
                if date_start:
                    start_dt = pd.to_datetime(date_start)
                    history_df = history_df[history_df.index >= start_dt]
                if date_end:
                    end_dt = pd.to_datetime(date_end)
                    history_df = history_df[history_df.index <= end_dt]
                if len(history_df) == 0:
                    return {"error": f"日期范围 [{date_start}, {date_end}] 内无数据"}
                logger.info(f"历史数据日期过滤: 起止={history_df.index[0].strftime('%Y-%m')} ~ {history_df.index[-1].strftime('%Y-%m')} ({len(history_df)} 行)")
            except Exception as e:
                logger.warning(f"历史数据日期过滤失败: {e}，使用全部数据")

        # --- 2. Determine target columns ---
        if target_columns is None or len(target_columns) == 0:
            # Auto-detect: all numeric columns except date
            target_columns = [
                col for col in history_df.columns
                if col != date_col and pd.api.types.is_numeric_dtype(history_df[col])
            ]

        if len(target_columns) == 0:
            return {"error": "未找到可预测的指标列"}

        # Filter to only existing columns
        available = [col for col in target_columns if col in history_df.columns]
        if len(available) == 0:
            return {
                "error": f"指定的目标列在历史数据中均不存在: {target_columns}"
            }

        target_columns = available

        # --- 3. Determine forecast start date ---
        if start_date:
            try:
                forecast_start = pd.to_datetime(start_date)
            except Exception:
                forecast_start = history_df.index[-1] + pd.DateOffset(months=1)
        else:
            forecast_start = history_df.index[-1] + pd.DateOffset(months=1)

        forecast_dates = pd.date_range(
            start=forecast_start, periods=forecast_periods, freq="MS"
        )

        # --- 4. Run ARIMA forecast for each target column ---
        forecast_results = pd.DataFrame(index=forecast_dates)

        for col in target_columns:
            series = history_df[col]
            if _is_rate_type(col):
                p, d, q = RATE_ARIMA_ORDER
            else:
                p, d, q = VALUE_ARIMA_ORDER

            predictions = _arima_forecast(series, forecast_periods, p, d, q)
            forecast_results[col] = predictions

        # --- 5. Format forecast values ---
        for col in forecast_results.columns:
            if _is_rate_type(col):
                forecast_results[col] = forecast_results[col].round(2)
            else:
                forecast_results[col] = forecast_results[col].round(0).astype(int)

        # --- 6. Build forecasts output ---
        forecasts_list: List[Dict] = []
        for idx, row in forecast_results.iterrows():
            item: Dict[str, Any] = {"date": idx.strftime("%Y-%m")}
            for col in target_columns:
                item[f"{col}_pred"] = (
                    float(row[col]) if not pd.isna(row[col]) else None
                )
            forecasts_list.append(item)

        result: Dict[str, Any] = {
            "forecasts": forecasts_list,
            "target_columns": target_columns,
        }

        # --- 7. Process actual data for comparison if provided ---
        if actual_df is not None:
            actual_df = actual_df.copy()
            actual_date_col = _detect_date_column(actual_df) or date_col

            if actual_date_col and actual_date_col in actual_df.columns:
                actual_df["_datetime"] = actual_df[actual_date_col].apply(
                    _convert_time_format
                )
                actual_df = actual_df.dropna(subset=["_datetime"])
                actual_df.set_index("_datetime", inplace=True)

                # Build actuals output
                actuals_list: List[Dict] = []
                for idx, row in actual_df.iterrows():
                    item: Dict[str, Any] = {"date": idx.strftime("%Y-%m")}
                    for col in target_columns:
                        if col in actual_df.columns:
                            item[f"{col}_actual"] = (
                                float(row[col]) if not pd.isna(row[col]) else None
                            )
                    actuals_list.append(item)
                result["actuals"] = actuals_list

                # --- 8. Build comparison table ---
                comparison = forecast_results.copy()

                for col in target_columns:
                    if col in actual_df.columns:
                        actual_series = actual_df[col]
                        aligned = actual_series.reindex(forecast_dates)
                        comparison[f"{col}_actual"] = aligned.values

                        # Calculate monthly accuracy
                        mask = (
                            comparison[f"{col}_actual"].notna()
                            & (comparison[f"{col}_actual"] != 0)
                        )
                        comparison[f"{col}_monthly_accuracy"] = np.nan
                        comparison.loc[mask, f"{col}_monthly_accuracy"] = (
                            (
                                1
                                - np.abs(
                                    (
                                        comparison.loc[mask, f"{col}_actual"]
                                        - comparison.loc[mask, col]
                                    )
                                    / comparison.loc[mask, f"{col}_actual"]
                                )
                            )
                            * 100
                        )

                # Format comparison
                comparison.index = comparison.index.strftime("%Y-%m")
                comparison = comparison.reset_index().rename(
                    columns={"index": "date"}
                )

                comparison_list: List[Dict] = []
                for _, row in comparison.iterrows():
                    item: Dict[str, Any] = {"date": row["date"]}
                    for col in target_columns:
                        if col in comparison.columns:
                            item[f"{col}_pred"] = (
                                float(row[col]) if not pd.isna(row[col]) else None
                            )
                        actual_key = f"{col}_actual"
                        if actual_key in comparison.columns:
                            item[actual_key] = (
                                float(row[actual_key])
                                if not pd.isna(row[actual_key])
                                else None
                            )
                        acc_key = f"{col}_monthly_accuracy"
                        if acc_key in comparison.columns:
                            item[acc_key] = (
                                float(row[acc_key])
                                if not pd.isna(row[acc_key])
                                else None
                            )
                    comparison_list.append(item)
                result["comparison"] = comparison_list

                # --- 9. Accuracy summary ---
                accuracy_summary = []
                for col in target_columns:
                    if col in actual_df.columns:
                        actual_vals = actual_df[col].values[:forecast_periods].tolist()
                        predicted_vals = forecast_results[col].values[:forecast_periods].tolist()
                        acc = _calculate_accuracy(actual_vals, predicted_vals)
                        accuracy_summary.append(
                            {"indicator": col, "accuracy": acc}
                        )
                result["accuracy_summary"] = accuracy_summary

                # --- 10. Monthly accuracy ---
                monthly_acc_list: List[Dict] = []
                for _, row in comparison.iterrows():
                    item: Dict[str, Any] = {"date": row["date"]}
                    for col in target_columns:
                        acc_key = f"{col}_monthly_accuracy"
                        if acc_key in comparison.columns:
                            item[acc_key] = (
                                float(row[acc_key])
                                if not pd.isna(row[acc_key])
                                else None
                            )
                    monthly_acc_list.append(item)
                result["monthly_accuracy"] = monthly_acc_list

        return result

    except Exception as e:
        logger.exception("经济预测失败")
        return {"error": f"预测过程出错: {str(e)}"}
