import json
import logging
from typing import List, Optional

import pandas as pd
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from services.factor_analysis import analyze_factors
from services.economic_prediction import predict_economics
from utils.excel_utils import read_excel_to_df, get_column_names, validate_columns, detect_date_column

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="电力看经济平台 API", version="1.0")

# CORS - allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


@app.get("/")
def read_root():
    return {"message": "Welcome to Power-to-Economy Insight Platform API"}


@app.post("/api/analysis")
async def api_analyze_factors(
    file: UploadFile = File(..., description="上传 Excel 数据文件"),
    target_col: str = Form(..., description="目标变量列名"),
    date_col: Optional[str] = Form(None, description="日期列名（可选，自动检测）"),
    factor_cols: Optional[str] = Form(None, description="指定参与分析的影响因素列名，JSON 数组字符串。留空则使用所有非目标列"),
    top_n: int = Form(3, description="返回显著性影响因素数量"),
    date_start: Optional[str] = Form(None, description="过滤起始日期，如 '2025-01'"),
    date_end: Optional[str] = Form(None, description="过滤结束日期，如 '2025-06'"),
):
    """
    影响因素分析 API

    上传 Excel 文件，指定目标变量，返回各影响因素的相关性得分排名。
    """
    # Validate file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="文件大小超过 50MB 限制")
    # Reset file pointer for reading
    await file.seek(0)

    # Read Excel
    try:
        df = read_excel_to_df(file)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"文件读取失败: {str(e)}")

    # Parse factor_cols if provided
    parsed_factor_cols: Optional[List[str]] = None
    if factor_cols:
        try:
            parsed_factor_cols = json.loads(factor_cols)
            if not isinstance(parsed_factor_cols, list):
                raise ValueError("factor_cols 必须是 JSON 数组")
        except (json.JSONDecodeError, ValueError) as e:
            raise HTTPException(status_code=400, detail=f"factor_cols 格式错误: {str(e)}")

    # Run analysis
    result = analyze_factors(
        df=df,
        target_col=target_col,
        date_col=date_col,
        factor_cols=parsed_factor_cols,
        top_n=top_n,
        date_start=date_start,
        date_end=date_end,
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


@app.post("/api/prediction")
async def api_predict_economics(
    history_file: UploadFile = File(..., description="上传历史经济数据 Excel 文件"),
    actual_file: Optional[UploadFile] = File(None, description="上传实际值数据 Excel 文件（用于精准度对比）"),
    target_columns: Optional[str] = Form(None, description="预测目标列名，JSON 数组字符串，如 '[\"GDP\",\"CPI\"]'。留空则自动检测所有数值列"),
    forecast_periods: int = Form(12, description="预测周期数，默认12个月"),
    date_col: Optional[str] = Form(None, description="日期列名（可选，自动检测）"),
    date_start: Optional[str] = Form(None, description="过滤历史数据起始日期，如 '2020-01'"),
    date_end: Optional[str] = Form(None, description="过滤历史数据结束日期，如 '2023-06'"),
):
    """
    经济预测 API

    上传历史数据 Excel 文件，使用 ARIMA 模型进行经济指标预测。
    可选择性上传实际值文件以获得精准度评估。
    """
    # Validate history file size
    hist_contents = await history_file.read()
    if len(hist_contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="历史数据文件大小超过 50MB 限制")
    await history_file.seek(0)

    # Read history data
    try:
        history_df = read_excel_to_df(history_file)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"历史数据文件读取失败: {str(e)}")

    # Read actual data if provided
    actual_df = None
    if actual_file:
        act_contents = await actual_file.read()
        if len(act_contents) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="实际值数据文件大小超过 50MB 限制")
        await actual_file.seek(0)
        try:
            actual_df = read_excel_to_df(actual_file)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"实际值数据文件读取失败: {str(e)}")

    # Parse target columns if provided
    parsed_targets: Optional[List[str]] = None
    if target_columns:
        try:
            parsed_targets = json.loads(target_columns)
            if not isinstance(parsed_targets, list):
                raise ValueError("target_columns 必须是 JSON 数组")
        except (json.JSONDecodeError, ValueError) as e:
            raise HTTPException(status_code=400, detail=f"target_columns 格式错误: {str(e)}")

    # Run prediction
    result = predict_economics(
        history_df=history_df,
        actual_df=actual_df,
        target_columns=parsed_targets,
        forecast_periods=forecast_periods,
        date_col=date_col,
        date_start=date_start,
        date_end=date_end,
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result


@app.post("/api/columns")
async def api_get_columns(
    file: UploadFile = File(..., description="上传 Excel 文件"),
):
    """
    获取上传 Excel 文件的列名列表及日期范围（供前端动态选择目标列等）
    """
    try:
        df = read_excel_to_df(file)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"文件读取失败: {str(e)}")

    response: dict = {"columns": get_column_names(df)}

    # 检测日期列并返回起止日期
    date_col = detect_date_column(df)
    if date_col:
        try:
            date_series = pd.to_datetime(df[date_col], errors="coerce").dropna()
            if len(date_series) > 0:
                response["date_range"] = [
                    date_series.iloc[0].strftime("%Y-%m"),
                    date_series.iloc[-1].strftime("%Y-%m"),
                ]
                response["date_column"] = date_col
        except Exception:
            pass

    return response
