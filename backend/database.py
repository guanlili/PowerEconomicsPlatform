import os
import pandas as pd
from sqlalchemy import create_engine, text, inspect
import logging

from utils.time_utils import normalize_time_column, to_date_string

logger = logging.getLogger(__name__)

DATABASE_URL = "mysql+pymysql://root:root123@localhost:3306/power_economics?charset=utf8mb4"

_engine = None


def get_engine():
    global _engine
    if _engine is None:
        _engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=3600)
    return _engine


# Excel文件到表名的映射
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

TABLE_MAPPING = {
    "区域": {
        "用电量": "power_region",
        "影响因素": "factors_region",
        "目标经济变量": "economic_region",
    },
    "行业": {
        "用电量": "power_industry",
        "影响因素": "factors_industry",
        "目标经济变量": "economic_industry",
    },
    "产业": {
        "用电量": "power_sector",
        "影响因素": "factors_sector",
        "目标经济变量": "economic_sector",
    },
}


def get_table_name(data_type: str, sheet_name: str) -> str:
    """从(data_type, sheet_name)获取表名"""
    return TABLE_MAPPING[data_type][sheet_name]


def _table_has_data(engine, table_name: str) -> bool:
    """检查表是否存在且有数据"""
    insp = inspect(engine)
    if not insp.has_table(table_name):
        return False
    with engine.connect() as conn:
        result = conn.execute(text(f"SELECT COUNT(*) FROM `{table_name}`"))
        count = result.scalar()
        return count > 0


def init_db():
    """启动时检查并导入数据"""
    engine = get_engine()

    files = {
        "区域": os.path.join(DATA_DIR, "区域.xlsx"),
        "行业": os.path.join(DATA_DIR, "行业.xlsx"),
        "产业": os.path.join(DATA_DIR, "产业.xlsx"),
    }

    for data_type, file_path in files.items():
        if not os.path.exists(file_path):
            logger.warning(f"数据文件不存在: {file_path}")
            continue

        for sheet_name, table_name in TABLE_MAPPING[data_type].items():
            if _table_has_data(engine, table_name):
                logger.info(f"表 {table_name} 已有数据，跳过导入")
                continue

            logger.info(f"正在导入 {data_type}/{sheet_name} -> {table_name}")
            try:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
                # 标准化时间列
                if sheet_name == "用电量":
                    time_col, granularity = "数据日期", "day"
                else:
                    time_col, granularity = "时间", "month"
                if time_col in df.columns:
                    df[time_col] = normalize_time_column(df[time_col], granularity)
                    # 转为纯日期字符串，确保存入数据库为 YYYY-MM-DD 格式
                    df[time_col] = to_date_string(df[time_col])
                    logger.info(f"  时间列 '{time_col}' 已标准化为日期格式 (粒度={granularity})")
                df.to_sql(table_name, engine, if_exists='replace', index=False)
                logger.info(f"  导入完成: {len(df)} 行")
            except Exception as e:
                logger.error(f"  导入失败: {e}")
