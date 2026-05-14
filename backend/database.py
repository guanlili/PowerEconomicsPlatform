import os

from sqlalchemy import create_engine, text, inspect
import logging

logger = logging.getLogger(__name__)

# 数据库连接地址支持通过环境变量覆盖，方便 Docker 部署
# 本地开发（不设环境变量）仍默认连 localhost:3306
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:root123@localhost:3306/power_economics?charset=utf8mb4",
)

_engine = None


def get_engine():
    global _engine
    if _engine is None:
        _engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=3600)
    return _engine


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


def init_db():
    """启动时检查数据库连接

    不再自动从 backend/data/*.xlsx 导入数据，数据统一通过平台
    《数据管理 -> 导入数据》入口手动导入。本函数仅验证连接可用，
    并记录当前数据库中已有的表，方便排查。
    """
    engine = get_engine()
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        logger.exception(f"数据库连接失败: {e}")
        raise

    insp = inspect(engine)
    existing = []
    for data_type, mapping in TABLE_MAPPING.items():
        for sheet_name, table_name in mapping.items():
            if insp.has_table(table_name):
                existing.append(f"{data_type}/{sheet_name}({table_name})")
    if existing:
        logger.info(f"数据库连接就绪，已存在表: {', '.join(existing)}")
    else:
        logger.info("数据库连接就绪，当前无预置数据表，请通过「数据管理 -> 导入数据」导入")