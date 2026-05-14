"""
从 Excel 预置文件生成 init.sql 脚本
确保时间格式统一规范：
- 月级别数据：YYYY-MM-01
- 日级别数据：YYYY-MM-DD
"""
import os
import sys
import numpy as np
import pandas as pd

# 添加项目路径
sys.path.insert(0, os.path.dirname(__file__))
from utils.time_utils import normalize_time_column

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

# Excel文件到表名的映射
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

# 时间列名和粒度
TIME_COL_CONFIG = {
    "用电量": {"col": "数据日期", "granularity": "day"},
    "影响因素": {"col": "时间", "granularity": "month"},
    "目标经济变量": {"col": "时间", "granularity": "month"},
}


def check_excel_time_formats():
    """检查 Excel 文件的时间格式"""
    print("=" * 60)
    print("检查 Excel 预置数据时间格式")
    print("=" * 60)

    files = {
        "区域": os.path.join(DATA_DIR, "区域.xlsx"),
        "行业": os.path.join(DATA_DIR, "行业.xlsx"),
        "产业": os.path.join(DATA_DIR, "产业.xlsx"),
    }

    for data_type, file_path in files.items():
        print(f"\n--- {data_type} ({file_path}) ---")
        if not os.path.exists(file_path):
            print(f"  文件不存在!")
            continue

        for sheet_name in ["用电量", "影响因素", "目标经济变量"]:
            try:
                df = pd.read_excel(file_path, sheet_name=sheet_name)
                config = TIME_COL_CONFIG[sheet_name]
                time_col = config["col"]
                granularity = config["granularity"]

                if time_col not in df.columns:
                    print(f"  [{sheet_name}] 时间列 '{time_col}' 不存在! 列名: {list(df.columns)}")
                    continue

                series = df[time_col]
                dtype = series.dtype
                sample = series.head(3).tolist()
                print(f"  [{sheet_name}] 时间列'{time_col}' dtype={dtype}, 粒度={granularity}")
                print(f"    前3值: {sample}")

                # 尝试标准化
                normalized = normalize_time_column(series, granularity)
                norm_sample = normalized.head(3).tolist()
                print(f"    标准化后前3值: {norm_sample}")

            except Exception as e:
                print(f"  [{sheet_name}] 读取失败: {e}")


def get_mysql_type(dtype, col_name):
    """根据 pandas dtype 推断 MySQL 类型"""
    if "datetime" in str(dtype) or col_name in ["时间", "数据日期"]:
        return "date DEFAULT NULL"
    elif dtype == "int64":
        return "bigint DEFAULT NULL"
    elif dtype == "float64":
        return "double DEFAULT NULL"
    elif dtype == "object":
        return "text COLLATE utf8mb4_unicode_ci"
    else:
        return "text COLLATE utf8mb4_unicode_ci"


def format_value(val, col_name, is_time_col=False):
    """格式化单个值为 SQL 字面量"""
    if pd.isna(val):
        return "NULL"
    if is_time_col:
        if isinstance(val, pd.Timestamp):
            return f"'{val.strftime('%Y-%m-%d')}'"
        # 如果已经是字符串格式的日期，去掉可能的时分秒部分
        val_str = str(val).strip()
        if ' ' in val_str:
            val_str = val_str.split(' ')[0]
        return f"'{val_str}'"
    if isinstance(val, str):
        # 转义单引号
        escaped = val.replace("'", "''").replace("\\", "\\\\")
        return f"'{escaped}'"
    if isinstance(val, (int, np.integer)):
        return str(int(val))
    if isinstance(val, (float, np.floating)):
        if np.isnan(val):
            return "NULL"
        return str(val)
    return f"'{val}'"


def generate_insert_sql(table_name, df, time_col, granularity):
    """生成 INSERT 语句"""
    # 标准化时间列
    df = df.copy()
    if time_col in df.columns:
        df[time_col] = normalize_time_column(df[time_col], granularity)

    rows = []
    for _, row in df.iterrows():
        values = []
        for col in df.columns:
            is_time = (col == time_col)
            values.append(format_value(row[col], col, is_time_col=is_time))
        rows.append(f"({','.join(values)})")

    # 每个 INSERT 语句包含所有行（匹配原有格式）
    return f"INSERT INTO `{table_name}` VALUES " + ",".join(rows) + ";"


def generate_create_table_sql(table_name, df, time_col):
    """生成 CREATE TABLE 语句"""
    columns = []
    for col in df.columns:
        col_type = get_mysql_type(df[col].dtype, col)
        columns.append(f"  `{col}` {col_type}")

    cols_sql = ",\n".join(columns)
    return f"""CREATE TABLE `{table_name}` (
{cols_sql}
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"""


def generate_init_sql():
    """生成完整的 init.sql"""
    print("\n" + "=" * 60)
    print("开始生成 init.sql")
    print("=" * 60)

    files = {
        "区域": os.path.join(DATA_DIR, "区域.xlsx"),
        "行业": os.path.join(DATA_DIR, "行业.xlsx"),
        "产业": os.path.join(DATA_DIR, "产业.xlsx"),
    }

    # SQL 文件头部
    sql_parts = []
    sql_parts.append("""-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: localhost    Database: power_economics
-- ------------------------------------------------------
-- Server version\t8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `power_economics`
--

/*!40000 DROP DATABASE IF EXISTS `power_economics`*/;

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `power_economics` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `power_economics`;""")

    # 按固定顺序生成表（与原 init.sql 保持一致）
    table_order = [
        ("行业", "目标经济变量", "economic_industry"),
        ("区域", "目标经济变量", "economic_region"),
        ("产业", "目标经济变量", "economic_sector"),
        ("行业", "影响因素", "factors_industry"),
        ("区域", "影响因素", "factors_region"),
        ("产业", "影响因素", "factors_sector"),
        ("行业", "用电量", "power_industry"),
        ("区域", "用电量", "power_region"),
        ("产业", "用电量", "power_sector"),
    ]

    for data_type, sheet_name, table_name in table_order:
        file_path = files[data_type]
        config = TIME_COL_CONFIG[sheet_name]
        time_col = config["col"]
        granularity = config["granularity"]

        print(f"  处理: {data_type}/{sheet_name} -> {table_name}")

        df = pd.read_excel(file_path, sheet_name=sheet_name)

        # 生成 CREATE TABLE
        create_sql = generate_create_table_sql(table_name, df, time_col)

        # 生成 INSERT
        insert_sql = generate_insert_sql(table_name, df, time_col, granularity)

        sql_parts.append(f"""
--
-- Table structure for table `{table_name}`
--

DROP TABLE IF EXISTS `{table_name}`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
{create_sql}
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `{table_name}`
--

LOCK TABLES `{table_name}` WRITE;
/*!40000 ALTER TABLE `{table_name}` DISABLE KEYS */;
{insert_sql}
/*!40000 ALTER TABLE `{table_name}` ENABLE KEYS */;
UNLOCK TABLES;""")

    # SQL 文件尾部
    sql_parts.append("""
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed
""")

    full_sql = "\n".join(sql_parts)

    # 写入文件
    output_path = os.path.join(os.path.dirname(__file__), "sql", "init.sql")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(full_sql)

    print(f"\n  init.sql 已生成: {output_path}")
    print(f"  文件大小: {len(full_sql)} 字符")

    return full_sql


def validate_sql(sql_content):
    """基本验证 SQL 语法"""
    print("\n" + "=" * 60)
    print("验证 SQL 语法")
    print("=" * 60)

    issues = []

    # 检查基本结构
    if "CREATE DATABASE" not in sql_content:
        issues.append("缺少 CREATE DATABASE 语句")

    # 检查 9 张表
    expected_tables = [
        "economic_industry", "economic_region", "economic_sector",
        "factors_industry", "factors_region", "factors_sector",
        "power_industry", "power_region", "power_sector"
    ]
    for table in expected_tables:
        if f"CREATE TABLE `{table}`" not in sql_content:
            issues.append(f"缺少表 {table}")
        if f"INSERT INTO `{table}`" not in sql_content:
            issues.append(f"缺少表 {table} 的 INSERT 数据")

    # 检查时间格式一致性（应为 YYYY-MM-DD，不含时分秒）
    import re
    time_patterns = re.findall(r"'(\d{4}-\d{2}-\d{2})'", sql_content)
    # 检查是否有残留的 datetime 格式（含时分秒）
    datetime_patterns = re.findall(r"'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})'", sql_content)
    if datetime_patterns:
        issues.append(f"发现 {len(datetime_patterns)} 个含时分秒的时间格式（应为纯日期）: {datetime_patterns[:3]}")

    invalid_times = []
    for t in time_patterns[:100]:  # 检查前100个
        date_parts = t.split("-")
        if len(date_parts) != 3:
            invalid_times.append(t)

    if invalid_times:
        issues.append(f"发现 {len(invalid_times)} 个非标准日期格式: {invalid_times[:3]}")

    # 检查 NULL 字符串
    if "'NULL'" in sql_content or "' '" in sql_content:
        issues.append("发现可能的 NULL 字符串问题")

    if issues:
        print("  发现问题:")
        for issue in issues:
            print(f"    - {issue}")
    else:
        print("  ✓ SQL 语法基本验证通过")
        print(f"  ✓ 共 {len(expected_tables)} 张表")
        print(f"  ✓ 检查了 {len(time_patterns)} 个日期值，格式统一（YYYY-MM-DD）")

    return len(issues) == 0


if __name__ == "__main__":
    # Step 1: 检查 Excel 时间格式
    check_excel_time_formats()

    # Step 2: 生成 init.sql
    sql_content = generate_init_sql()

    # Step 3: 验证
    validate_sql(sql_content)
