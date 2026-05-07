import logging
from io import BytesIO
from typing import List, Optional

import pandas as pd
from fastapi import UploadFile, HTTPException

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".xlsx", ".xls"}


def read_excel_to_df(file: UploadFile, sheet_name: int | str = 0) -> pd.DataFrame:
    """
    Read an uploaded Excel file into a pandas DataFrame.

    Args:
        file: FastAPI UploadFile object
        sheet_name: Sheet index (int) or name (str), default 0

    Returns:
        pd.DataFrame

    Raises:
        HTTPException: If file format is invalid or reading fails
    """
    # Validate file extension
    filename = file.filename or ""
    ext = filename.lower()
    if not any(ext.endswith(e) for e in ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件格式：{ext}，仅支持 .xlsx / .xls",
        )

    try:
        contents = file.file.read()
        df = pd.read_excel(BytesIO(contents), sheet_name=sheet_name)
    except Exception as e:
        logger.error(f"读取 Excel 文件失败: {e}")
        raise HTTPException(status_code=400, detail=f"无法读取 Excel 文件: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="上传的 Excel 文件为空")

    return df


def validate_columns(df: pd.DataFrame, required_cols: List[str]) -> List[str]:
    """
    Validate that all required columns exist in the DataFrame.

    Args:
        df: DataFrame to check
        required_cols: List of column names that must exist

    Returns:
        List of missing column names (empty if all present)
    """
    existing = set(df.columns)
    missing = [col for col in required_cols if col not in existing]
    return missing


def get_column_names(df: pd.DataFrame) -> List[str]:
    """
    Get all column names from a DataFrame.

    Args:
        df: DataFrame to inspect

    Returns:
        List of column names (as strings)
    """
    return df.columns.tolist()


def detect_date_column(df: pd.DataFrame) -> Optional[str]:
    """
    Try to detect a date/time column in the DataFrame.

    Looks for columns named '月份', '时间', '日期' etc.
    Also checks if any column contains datetime-like values.

    Args:
        df: DataFrame to scan

    Returns:
        Column name if found, None otherwise
    """
    # Common date column names in Chinese
    date_candidates = ["月份", "时间", "日期", "年月", "month", "date", "time", "period"]
    for col in date_candidates:
        if col in df.columns:
            return col

    # Try to find any column that looks like a datetime
    for col in df.columns:
        try:
            pd.to_datetime(df[col])
            return col
        except (ValueError, TypeError):
            continue

    return None
