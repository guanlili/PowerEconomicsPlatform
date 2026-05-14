import io
import json
import logging
from typing import List, Optional

import pandas as pd
from fastapi import FastAPI, Form, Query, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text, inspect

from database import get_engine, init_db, get_table_name, TABLE_MAPPING
from services.factor_analysis import analyze_factors
from services.economic_prediction import predict_economics
from utils.excel_utils import detect_date_column
from utils.time_utils import normalize_time_column, detect_time_column, detect_granularity, format_for_api, to_date_string

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _resolve_column_name(col_name: str, available_columns: List[str]) -> str:
    """
    解析列名：精确匹配优先，否则使用前缀匹配。

    当前端传来的列名（如"产业增加值"）在数据中找不到精确匹配时，
    尝试找到以该名称为前缀的列（如"产业增加值亿元"）。
    如果匹配到唯一结果则使用该列，匹配到多个则报错。

    Args:
        col_name: 前端传来的列名
        available_columns: 数据中实际可用的列名列表

    Returns:
        匹配到的实际列名

    Raises:
        HTTPException: 匹配到多个列或未匹配到任何列时
    """
    # 精确匹配
    if col_name in available_columns:
        return col_name

    # 前缀匹配：查找以 col_name 开头的列
    prefix_matches = [c for c in available_columns if c.startswith(col_name)]

    if len(prefix_matches) == 1:
        logger.info(f"列名前缀匹配: '{col_name}' → '{prefix_matches[0]}'")
        return prefix_matches[0]
    elif len(prefix_matches) > 1:
        raise HTTPException(
            status_code=400,
            detail=f"列名 '{col_name}' 存在歧义，匹配到多个列: {prefix_matches}，请使用完整列名",
        )

    # 反向前缀匹配：查找是 col_name 前缀的列（即实际列名是传入名称的前缀）
    reverse_matches = [c for c in available_columns if col_name.startswith(c)]
    if len(reverse_matches) == 1:
        logger.info(f"列名反向前缀匹配: '{col_name}' → '{reverse_matches[0]}'")
        return reverse_matches[0]

    # 未匹配到，返回原始名称，让下游 service 层报错
    return col_name


def _resolve_column_names(col_names: List[str], available_columns: List[str]) -> List[str]:
    """批量解析列名列表"""
    return [_resolve_column_name(c, available_columns) for c in col_names]

app = FastAPI(title="电力看经济平台 API", version="1.0")

# CORS - allow frontend dev server
# 注：allow_origins=['*'] 与 allow_credentials=True 在浏览器标准下不允许共存，
#     本项目未使用 cookie/session，关闭 credentials 以免以后踩坑。
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== 数据管理模块 ====================
SHEET_NAMES = ["用电量", "影响因素", "目标经济变量"]
VALID_DATA_TYPES = ["区域", "行业", "产业"]


@app.on_event("startup")
async def startup_event():
    init_db()


def _read_from_db(table_name: str) -> pd.DataFrame:
    """从数据库读取整表"""
    engine = get_engine()
    return pd.read_sql_table(table_name, engine)


def _read_from_db_paged(table_name: str, page: int, page_size: int):
    """从数据库分页读取"""
    engine = get_engine()
    offset = (page - 1) * page_size
    df = pd.read_sql(f"SELECT * FROM `{table_name}` LIMIT {page_size} OFFSET {offset}", engine)
    with engine.connect() as conn:
        result = conn.execute(text(f"SELECT COUNT(*) FROM `{table_name}`"))
        total = result.scalar()
    return df, total


def _get_table_meta(table_name: str):
    """轻量获取表的列名和行数，不读取数据

    用 SQLAlchemy inspector 拿列名（走 information_schema），
    用 SELECT COUNT(*) 拿行数，避免 pd.read_sql_table 把整表读进内存。
    """
    engine = get_engine()
    inspector = inspect(engine)
    if not inspector.has_table(table_name):
        raise ValueError(f"表不存在: {table_name}")
    columns = [col["name"] for col in inspector.get_columns(table_name)]
    with engine.connect() as conn:
        result = conn.execute(text(f"SELECT COUNT(*) FROM `{table_name}`"))
        row_count = result.scalar() or 0
    return columns, row_count


def _df_to_records(df: pd.DataFrame) -> list:
    """将DataFrame转为JSON安全的记录列表，处理日期和NaN"""
    df_copy = df.copy()
    # 转换日期列为字符串
    for col in df_copy.columns:
        if pd.api.types.is_datetime64_any_dtype(df_copy[col]):
            df_copy[col] = df_copy[col].dt.strftime("%Y-%m-%d")
    # 转为字典列表并处理NaN
    records = df_copy.to_dict(orient="records")
    for record in records:
        for key, value in record.items():
            if pd.isna(value):
                record[key] = None
    return records


@app.get("/")
def read_root():
    return {"message": "Welcome to Power-to-Economy Insight Platform API"}


@app.post("/api/analysis")
async def api_analyze_factors(
    data_type: str = Form(..., description="预置数据类型（区域/行业/产业）"),
    target_col: str = Form(..., description="目标变量列名"),
    date_col: Optional[str] = Form(None, description="日期列名（可选，自动检测）"),
    factor_cols: Optional[str] = Form(None, description="指定参与分析的影响因素列名，JSON 数组字符串。留空则使用所有非目标列"),
    top_n: int = Form(3, description="返回显著性影响因素数量"),
    date_start: Optional[str] = Form(None, description="过滤起始日期，如 '2025-01'"),
    date_end: Optional[str] = Form(None, description="过滤结束日期，如 '2025-06'"),
):
    """
    影响因素分析 API

    选择预置数据类型，指定目标变量，返回各影响因素的相关性得分排名。
    """
    _validate_data_type(data_type)
    target_df = _read_from_db(get_table_name(data_type, "目标经济变量")).copy()
    factor_df = _read_from_db(get_table_name(data_type, "影响因素")).copy()

    # 自动识别两张表的时间列，避免硬编码“时间”导致的 KeyError
    target_time_col = detect_time_column(target_df) or "时间"
    factor_time_col = detect_time_column(factor_df) or "时间"
    if target_time_col not in target_df.columns:
        raise HTTPException(status_code=500, detail=f"目标经济变量表未找到时间列，可用列: {target_df.columns.tolist()}")
    if factor_time_col not in factor_df.columns:
        raise HTTPException(status_code=500, detail=f"影响因素表未找到时间列，可用列: {factor_df.columns.tolist()}")
    # 统一两表的时间列名为目标表的名称
    if factor_time_col != target_time_col:
        factor_df = factor_df.rename(columns={factor_time_col: target_time_col})

    try:
        df = pd.merge(target_df, factor_df, on=target_time_col, how="inner", validate="1:1")
    except pd.errors.MergeError as e:
        raise HTTPException(
            status_code=400,
            detail=f"目标经济变量表与影响因素表按 '{target_time_col}' 列合并失败（可能存在重复时间值）: {str(e)}",
        )
    logger.info(f"预置数据合并: {data_type}, 目标经济变量({len(target_df)}行) + 影响因素({len(factor_df)}行) → 合并({len(df)}行)")

    # 列名前缀匹配：将前端传来的列名映射到实际数据列名
    available_columns = df.columns.tolist()
    target_col = _resolve_column_name(target_col, available_columns)

    # Parse factor_cols if provided
    parsed_factor_cols: Optional[List[str]] = None
    if factor_cols:
        try:
            parsed_factor_cols = json.loads(factor_cols)
            if not isinstance(parsed_factor_cols, list):
                raise ValueError("factor_cols 必须是 JSON 数组")
        except (json.JSONDecodeError, ValueError) as e:
            raise HTTPException(status_code=400, detail=f"factor_cols 格式错误: {str(e)}")
        # 对每个 factor_col 也进行前缀匹配
        parsed_factor_cols = _resolve_column_names(parsed_factor_cols, available_columns)

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
    data_type: str = Form(..., description="预置数据类型（区域/行业/产业）"),
    target_columns: Optional[str] = Form(None, description="预测目标列名，JSON 数组字符串，如 '[\"GDP\",\"CPI\"]'。留空则自动检测所有数值列"),
    forecast_periods: int = Form(12, description="预测周期数，默认12个月"),
    date_col: Optional[str] = Form(None, description="日期列名（可选，自动检测）"),
    date_start: Optional[str] = Form(None, description="过滤历史数据起始日期，如 '2020-01'"),
    date_end: Optional[str] = Form(None, description="过滤历史数据结束日期，如 '2023-06'"),
):
    """
    经济预测 API

    选择预置数据类型，使用 ARIMA 模型进行经济指标预测。
    """
    _validate_data_type(data_type)
    history_df = _read_from_db(get_table_name(data_type, "目标经济变量")).copy()
    logger.info(f"预置数据: {data_type}/目标经济变量 ({len(history_df)}行)")
    # 使用全量历史数据作为实际值来源：当 date_end 过滤掉训练集之后的样本时，
    # 数据库中仍存在的真实观测可作为预测期的「实际值」用于对比与精准度计算
    actual_df = history_df.copy()

    # Parse target columns if provided
    parsed_targets: Optional[List[str]] = None
    if target_columns:
        try:
            parsed_targets = json.loads(target_columns)
            if not isinstance(parsed_targets, list):
                raise ValueError("target_columns 必须是 JSON 数组")
        except (json.JSONDecodeError, ValueError) as e:
            raise HTTPException(status_code=400, detail=f"target_columns 格式错误: {str(e)}")
        # 列名前缀匹配：将前端传来的列名映射到实际数据列名
        available_columns = history_df.columns.tolist()
        parsed_targets = _resolve_column_names(parsed_targets, available_columns)

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


def _validate_data_type(data_type: str) -> None:
    """校验 data_type 参数是否合法"""
    if data_type not in VALID_DATA_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"无效的数据类型: {data_type}，可选值: {VALID_DATA_TYPES}",
        )


@app.get("/api/data/columns")
async def api_data_columns(
    data_type: str = Query(..., description="数据类型（区域/行业/产业）"),
):
    """
    根据预置数据类型返回可选的目标列、影响因素列及时间范围。
    """
    _validate_data_type(data_type)

    target_df = _read_from_db(get_table_name(data_type, "目标经济变量"))
    factor_df = _read_from_db(get_table_name(data_type, "影响因素"))

    # 检测时间列（使用统一时间工具）
    date_col = detect_time_column(target_df) or "时间"

    # 获取非时间列
    target_columns = [c for c in target_df.columns if c != date_col]
    factor_columns = [c for c in factor_df.columns if c != date_col]

    # 计算两个Sheet的时间交集范围（使用统一时间处理）
    date_range = [None, None]
    try:
        t_dates = normalize_time_column(target_df[date_col], granularity="month").dropna()
        f_date_col = detect_time_column(factor_df) or date_col
        f_dates = normalize_time_column(factor_df[f_date_col], granularity="month").dropna()
        if len(t_dates) > 0 and len(f_dates) > 0:
            common_start = max(t_dates.min(), f_dates.min())
            common_end = min(t_dates.max(), f_dates.max())
            date_range = [
                format_for_api(common_start, "month"),
                format_for_api(common_end, "month"),
            ]
    except Exception as e:
        logger.warning(f"计算时间交集失败: {e}")

    return {
        "data_type": data_type,
        "target_columns": target_columns,
        "factor_columns": factor_columns,
        "date_range": date_range,
        "date_column": date_col,
    }


@app.get("/api/data/sheets")
async def api_data_sheets():
    """
    获取可用Sheet列表及各Sheet下的数据类型信息
    """
    sheets = []
    for sheet_name in SHEET_NAMES:
        data_types = []
        for data_type in VALID_DATA_TYPES:
            try:
                table_name = get_table_name(data_type, sheet_name)
                columns, row_count = _get_table_meta(table_name)
                data_types.append({
                    "name": data_type,
                    "columns": columns,
                    "row_count": row_count,
                })
            except Exception as e:
                logger.warning(f"读取 {data_type}/{sheet_name} 元信息失败: {e}")
                continue
        sheets.append({"name": sheet_name, "data_types": data_types})
    return {"sheets": sheets}


@app.post("/api/data/import")
async def api_data_import(
    file: UploadFile = File(...),
    sheet_name: str = Form(...),
    data_type: str = Form(...),
    mode: str = Form("smart"),
):
    """
    导入 Excel 数据到数据库

    mode:
      - smart（默认）: 去重追加，跳过已存在的行，只导入新数据
      - replace: 替换整表
    """
    # 验证参数
    if sheet_name not in SHEET_NAMES:
        raise HTTPException(status_code=400, detail=f"无效的Sheet名: {sheet_name}，可选值: {SHEET_NAMES}")
    _validate_data_type(data_type)
    if mode not in ("smart", "replace"):
        raise HTTPException(status_code=400, detail=f"无效的导入模式: {mode}，可选值: ['smart', 'replace']")

    # 验证文件类型
    filename = file.filename or ""
    if not filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="仅支持 .xlsx 或 .xls 格式的 Excel 文件")

    # 读取上传文件
    try:
        contents = await file.read()
        new_df = pd.read_excel(io.BytesIO(contents), sheet_name=0)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"读取 Excel 文件失败: {str(e)}")

    if new_df.empty:
        raise HTTPException(status_code=400, detail="上传的 Excel 文件无数据")

    # 统一时间列格式标准化
    time_col = detect_time_column(new_df)
    if time_col:
        try:
            # 根据sheet类型确定粒度：用电量为日级别，其他为月级别
            granularity = "day" if sheet_name == "用电量" else "month"
            new_df[time_col] = normalize_time_column(new_df[time_col], granularity=granularity)
            # 转为纯日期字符串，确保存入数据库为 YYYY-MM-DD 格式
            new_df[time_col] = to_date_string(new_df[time_col])
            logger.info(f"时间列 '{time_col}' 标准化为日期格式成功 (粒度: {granularity})")
        except ValueError as e:
            logger.warning(f"时间列标准化失败: {e}，将保留原始格式")

    # 确定目标表名
    table_name = get_table_name(data_type, sheet_name)
    engine = get_engine()

    # replace 模式：直接替换整表
    if mode == "replace":
        try:
            new_df.to_sql(table_name, engine, if_exists="replace", index=False)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"写入数据库失败: {str(e)}")

        total_rows = len(new_df)
        logger.info(f"数据导入成功(replace): {data_type}/{sheet_name} -> {table_name}, 导入 {total_rows} 行")
        return {
            "success": True,
            "table_name": table_name,
            "imported_rows": total_rows,
            "skipped_rows": 0,
            "total_rows": total_rows,
            "columns": new_df.columns.tolist(),
        }

    # smart 模式：去重追加
    # 根据 sheet 确定唯一键列
    if sheet_name == "用电量":
        # 用电量表的前两列是实体名 + 数据日期
        key_cols = list(new_df.columns[:2])
    else:
        # 影响因素和目标经济变量表的第一列是时间
        key_cols = [new_df.columns[0]]

    # 只读取已有数据的键列用于去重（避免整表读入内存）
    key_cols_sql = ", ".join(f"`{c}`" for c in key_cols)
    try:
        existing_keys = pd.read_sql(f"SELECT {key_cols_sql} FROM `{table_name}`", engine)
    except Exception:
        existing_keys = pd.DataFrame(columns=key_cols)

    if existing_keys.empty:
        # 表为空，全部导入
        rows_to_import = new_df
        skipped_rows = 0
    else:
        # 统一键列数据类型为字符串进行比较，避免日期格式不一致问题
        new_df_keys = new_df[key_cols].copy()
        existing_df_keys = existing_keys[key_cols].copy()
        for col in key_cols:
            # 对 datetime 类型键先转为 'YYYY-MM-DD' 字符串，避免 astype(str) 变成带时分秒的形式
            if pd.api.types.is_datetime64_any_dtype(new_df_keys[col]):
                new_df_keys[col] = to_date_string(new_df_keys[col])
            if pd.api.types.is_datetime64_any_dtype(existing_df_keys[col]):
                existing_df_keys[col] = to_date_string(existing_df_keys[col])
            new_df_keys[col] = new_df_keys[col].astype(str).str.strip()
            existing_df_keys[col] = existing_df_keys[col].astype(str).str.strip()

        # 用 merge 找出新数据（在 new_df 中但不在 existing 中的行）
        merged = new_df_keys.merge(existing_df_keys, on=key_cols, how="left", indicator=True)
        mask = merged["_merge"] == "left_only"
        rows_to_import = new_df[mask.values].reset_index(drop=True)
        skipped_rows = len(new_df) - len(rows_to_import)

    if rows_to_import.empty:
        # 没有新数据需要导入
        with engine.connect() as conn:
            result = conn.execute(text(f"SELECT COUNT(*) FROM `{table_name}`"))
            total_rows = result.scalar()
        logger.info(f"数据导入跳过(无新数据): {data_type}/{sheet_name} -> {table_name}, 跳过 {skipped_rows} 行")
        return {
            "success": True,
            "table_name": table_name,
            "imported_rows": 0,
            "skipped_rows": skipped_rows,
            "total_rows": total_rows,
            "columns": new_df.columns.tolist(),
        }

    # 只导入新数据
    try:
        rows_to_import.to_sql(table_name, engine, if_exists="append", index=False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"写入数据库失败: {str(e)}")

    # 查询导入后总行数
    with engine.connect() as conn:
        result = conn.execute(text(f"SELECT COUNT(*) FROM `{table_name}`"))
        total_rows = result.scalar()

    imported_rows = len(rows_to_import)
    logger.info(f"数据导入成功(smart): {data_type}/{sheet_name} -> {table_name}, 导入 {imported_rows} 行, 跳过 {skipped_rows} 行, 总计 {total_rows} 行")

    return {
        "success": True,
        "table_name": table_name,
        "imported_rows": imported_rows,
        "skipped_rows": skipped_rows,
        "total_rows": total_rows,
        "columns": new_df.columns.tolist(),
    }


@app.get("/api/data/list")
async def api_data_list(
    sheet: str = Query(..., description="Sheet名（用电量/影响因素/目标经济变量）"),
    data_type: str = Query(..., description="数据类型（区域/行业/产业）"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(50, ge=1, le=500, description="每页条数"),
):
    """
    分页获取具体数据
    """
    if sheet not in SHEET_NAMES:
        raise HTTPException(status_code=400, detail=f"无效的Sheet名: {sheet}，可选值: {SHEET_NAMES}")
    _validate_data_type(data_type)

    table_name = get_table_name(data_type, sheet)
    page_df, total = _read_from_db_paged(table_name, page, page_size)

    # 列名优先从 page_df 拿，为空时走元数据查询，避免多余的 SELECT * LIMIT 1
    if not page_df.columns.empty:
        columns = page_df.columns.tolist()
    else:
        columns, _ = _get_table_meta(table_name)

    return {
        "total": total,
        "columns": columns,
        "data": _df_to_records(page_df),
        "data_type": data_type,
        "sheet": sheet,
        "page": page,
        "page_size": page_size,
    }
