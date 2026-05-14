"""
统一时间格式处理模块

提供时间列的自动检测、多格式解析、粒度识别和标准化转换功能。
确保无论数据来源（预置文件或用户上传），时间列都能被正确识别和统一转换。
"""

import logging
import re
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)

# 常见时间列名，按优先级排序
TIME_COLUMN_CANDIDATES = ["时间", "数据日期", "月份", "日期", "年月", "年份", "date", "time", "month", "period"]


def normalize_time_column(series: pd.Series, granularity: str = "month") -> pd.Series:
    """
    统一规范化时间列，兼容多种输入格式。

    支持的格式：
    - 标准日期: 2023-01-01, 2023/01/01, 2023.01.01
    - 年月格式: 2023-01, 2023/01, 202301
    - 中文格式: 2023年1月, 2023年01月
    - Excel日期序列号: 44927
    - 已是 datetime64 类型

    Args:
        series: 时间列数据
        granularity: 'day' 或 'month'

    Returns:
        标准化后的时间 Series（datetime64 类型）
        - month 粒度：统一为每月1日（如 2023-01-01 表示2023年1月）
        - day 粒度：保留原始日期

    Raises:
        ValueError: 当时间列完全无法解析时
    """
    if series is None or series.empty:
        raise ValueError("时间列为空，无法进行标准化处理")

    result = pd.Series([pd.NaT] * len(series), index=series.index)
    unparsed_mask = pd.Series([True] * len(series), index=series.index)

    # 如果已经是 datetime64 类型，直接使用
    if pd.api.types.is_datetime64_any_dtype(series):
        result = series.copy()
        unparsed_mask[:] = False
    else:
        # 转为字符串处理
        str_series = series.astype(str).str.strip()

        # 1. 处理中文格式: 2023年1月, 2023年01月, 2023年1月1日
        chinese_pattern = re.compile(r"^(\d{4})年(\d{1,2})月(?:(\d{1,2})日?)?$")
        for idx in series.index:
            if not unparsed_mask[idx]:
                continue
            val = str_series[idx]
            match = chinese_pattern.match(val)
            if match:
                year, month = int(match.group(1)), int(match.group(2))
                day = int(match.group(3)) if match.group(3) else 1
                try:
                    result[idx] = pd.Timestamp(year=year, month=month, day=day)
                    unparsed_mask[idx] = False
                except (ValueError, OverflowError):
                    pass

        # 2. 处理纯数字格式: 202301 (YYYYMM)
        for idx in series.index:
            if not unparsed_mask[idx]:
                continue
            val = str_series[idx]
            if re.match(r"^\d{6}$", val):
                try:
                    year, month = int(val[:4]), int(val[4:6])
                    if 1 <= month <= 12:
                        result[idx] = pd.Timestamp(year=year, month=month, day=1)
                        unparsed_mask[idx] = False
                except (ValueError, OverflowError):
                    pass

        # 3. 处理 Excel 日期序列号（纯数字，通常 > 30000 且 < 100000）
        for idx in series.index:
            if not unparsed_mask[idx]:
                continue
            val = str_series[idx]
            # 匹配整数或浮点数格式的序列号
            if re.match(r"^\d{5}(\.\d+)?$", val):
                try:
                    num_val = float(val)
                    if 1 <= num_val <= 200000:  # 合理范围的Excel序列号
                        dt = pd.Timestamp("1899-12-30") + pd.Timedelta(days=int(num_val))
                        result[idx] = dt
                        unparsed_mask[idx] = False
                except (ValueError, OverflowError):
                    pass

        # 4. 尝试 pd.to_datetime 自动识别剩余的值
        remaining_idx = unparsed_mask[unparsed_mask].index
        if len(remaining_idx) > 0:
            remaining_vals = str_series[remaining_idx]
            # 尝试多种日期格式
            formats_to_try = [
                "%Y-%m-%d",
                "%Y/%m/%d",
                "%Y.%m.%d",
                "%Y-%m",
                "%Y/%m",
                "%Y%m%d",
            ]
            for fmt in formats_to_try:
                still_unparsed = unparsed_mask[unparsed_mask].index
                if len(still_unparsed) == 0:
                    break
                try:
                    parsed = pd.to_datetime(str_series[still_unparsed], format=fmt, errors="coerce")
                    valid_mask = parsed.notna()
                    for idx in still_unparsed[valid_mask]:
                        result[idx] = parsed[idx]
                        unparsed_mask[idx] = False
                except Exception:
                    continue

            # 最后尝试 pandas 的智能推断
            still_unparsed = unparsed_mask[unparsed_mask].index
            if len(still_unparsed) > 0:
                try:
                    parsed = pd.to_datetime(str_series[still_unparsed], errors="coerce", infer_datetime_format=True)
                    valid_mask = parsed.notna()
                    for idx in still_unparsed[valid_mask]:
                        result[idx] = parsed[idx]
                        unparsed_mask[idx] = False
                except Exception:
                    pass

    # 检查解析成功率
    total = len(series)
    failed = unparsed_mask.sum()
    if failed == total:
        raise ValueError(
            f"时间列无法解析：所有 {total} 个值均无法识别为有效日期。"
            f"示例值: {series.head(3).tolist()}"
        )
    elif failed > 0:
        success_rate = ((total - failed) / total) * 100
        logger.warning(
            f"时间列部分解析失败: {failed}/{total} 个值无法识别 "
            f"(成功率: {success_rate:.1f}%)。未识别示例: {series[unparsed_mask].head(3).tolist()}"
        )

    # 根据粒度统一处理
    if granularity == "month":
        # 统一归到月初（1号）
        valid_mask = result.notna()
        if valid_mask.any():
            result[valid_mask] = result[valid_mask].apply(
                lambda dt: dt.replace(day=1) if pd.notna(dt) else dt
            )

    return result


def detect_time_column(df: pd.DataFrame) -> Optional[str]:
    """
    自动检测 DataFrame 中的时间列。

    优先级：'时间' > '数据日期' > '月份' > '日期' > '年月' > '年份'
    如果常见名称都不匹配，则尝试找到包含 datetime 数据的列。

    Args:
        df: 输入的 DataFrame

    Returns:
        检测到的时间列名，未找到时返回 None
    """
    if df is None or df.empty:
        return None

    # 按优先级检查常见时间列名
    for col_name in TIME_COLUMN_CANDIDATES:
        if col_name in df.columns:
            return col_name

    # 尝试找到已经是 datetime 类型的列
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            return col

    # 尝试解析各列，找到能成功解析为日期的列
    for col in df.columns:
        try:
            sample = df[col].dropna().head(5)
            if len(sample) == 0:
                continue
            parsed = pd.to_datetime(sample, errors="coerce")
            if parsed.notna().sum() >= len(sample) * 0.8:
                return col
        except (ValueError, TypeError):
            continue

    return None


def detect_granularity(series: pd.Series) -> str:
    """
    自动检测时间粒度。

    如果所有有效日期都是月初（1号），则为 'month'，否则为 'day'。

    Args:
        series: datetime64 类型的时间序列

    Returns:
        'month' 或 'day'
    """
    if series is None or series.empty:
        return "month"

    # 确保是 datetime 类型
    if not pd.api.types.is_datetime64_any_dtype(series):
        try:
            series = pd.to_datetime(series, errors="coerce")
        except Exception:
            return "month"

    valid = series.dropna()
    if len(valid) == 0:
        return "month"

    # 检查所有日期是否都是 1 号
    all_first_day = (valid.dt.day == 1).all()
    return "month" if all_first_day else "day"


def format_for_api(dt, granularity: str = "month") -> str:
    """
    统一 API 返回的时间格式。

    Args:
        dt: datetime 对象或 Timestamp
        granularity: 'month' 返回 YYYY-MM，'day' 返回 YYYY-MM-DD

    Returns:
        格式化后的时间字符串
    """
    if pd.isna(dt):
        return ""
    if granularity == "month":
        return pd.Timestamp(dt).strftime("%Y-%m")
    return pd.Timestamp(dt).strftime("%Y-%m-%d")


def parse_api_date_range(date_str: Optional[str]) -> Optional[pd.Timestamp]:
    """
    解析前端传来的时间范围参数（格式固定为 YYYY-MM）。

    Args:
        date_str: 前端传来的日期字符串，如 '2023-01'

    Returns:
        对应的 Timestamp（月初），无效时返回 None
    """
    if not date_str:
        return None
    try:
        return pd.Timestamp(date_str + "-01")
    except Exception:
        try:
            return pd.to_datetime(date_str)
        except Exception:
            logger.warning(f"无法解析日期参数: {date_str}")
            return None


def to_date_string(series: pd.Series) -> pd.Series:
    """
    将 datetime64 类型的 Series 转换为纯日期字符串（YYYY-MM-DD）。

    用于在导入数据库前，将 normalize_time_column 返回的 datetime64
    转为纯日期字符串，确保存入数据库时不带时分秒。

    Args:
        series: datetime64 类型的时间列

    Returns:
        格式为 'YYYY-MM-DD' 的字符串 Series，NaT 转为 None
    """
    if series is None or series.empty:
        return series

    # 如果已经是 datetime 类型，直接格式化
    if pd.api.types.is_datetime64_any_dtype(series):
        return series.dt.strftime("%Y-%m-%d").where(series.notna(), other=None)

    # 如果是字符串类型，尝试去掉时分秒部分
    return series.astype(str).str.split(" ").str[0].where(series.notna(), other=None)
