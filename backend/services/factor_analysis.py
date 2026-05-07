"""
影响因素分析服务
重构自: backend/算法包/影响因素分析-以产业场景为例/影响因素分析算法.py

提供基于相关性分析的影响因素识别功能：
- 支持 Pearson、Kendall、Spearman 相关系数
- 支持最大信息系数 (MIC)
- 自动数据清洗（缺失处理、零方差剔除、重复列剔除）
"""

import logging
import re
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from scipy.stats import pearsonr, kendalltau, spearmanr
from sklearn.feature_selection import mutual_info_regression
from sklearn.preprocessing import MinMaxScaler

logger = logging.getLogger(__name__)

# Top N factors to report as significant
DEFAULT_TOP_N = 3


def _clean_column_name(col: str) -> str:
    """Remove special characters from column name, keep Chinese, letters and digits."""
    return re.sub(r"[^\u4e00-\u9fa5\w]", "", str(col))


def analyze_factors(
    df: pd.DataFrame,
    target_col: str,
    date_col: Optional[str] = None,
    factor_cols: Optional[List[str]] = None,
    top_n: int = DEFAULT_TOP_N,
    date_start: Optional[str] = None,
    date_end: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Analyze influencing factors for a given target variable using correlation analysis.

    Computes four correlation metrics (Pearson, Kendall, Spearman, MIC) for each
    feature column against the target, then ranks by average score.

    Args:
        df: Input DataFrame containing features and target column
        target_col: Name of the target variable column
        date_col: Name of the date/time column to exclude (auto-detected if None)
        factor_cols: Optional list of column names to include as factors.
                     If provided, only these columns + target_col will be analyzed.
                     If None, all non-target columns are analyzed.
        top_n: Number of top significant factors to return (default 3)
        date_start: Optional start date to filter rows (e.g. "2025-01").
                    Requires a detectable date column.
        date_end: Optional end date to filter rows (e.g. "2025-06").

    Returns:
        Dict with keys:
            - scores: List of dicts with variable, pearson, kendall, spearman, mic, avg_score
            - top_factors: List of top N variable names
            - feature_count: Number of features analyzed
            - data_points: Number of data rows used
            - columns: All column names in the DataFrame (for frontend reference)

        On error, returns dict with 'error' key.
    """
    try:
        # 1. Clean column names
        df = df.copy()
        df.columns = [_clean_column_name(c) for c in df.columns]

        # 2. Validate target column exists
        if target_col not in df.columns:
            return {
                "error": f"未找到目标列 '{target_col}'，可用列为: {df.columns.tolist()}"
            }

        # 3. Detect and save date column, then remove from working df
        date_col_found: Optional[str] = None
        date_series: Optional[pd.Series] = None

        if date_col and date_col in df.columns:
            date_col_found = date_col
        else:
            common_date_cols = ["月份", "时间", "日期", "年月"]
            for dc in common_date_cols:
                if dc in df.columns:
                    date_col_found = dc
                    break

        if date_col_found:
            date_series = df[date_col_found].copy()

            # 3.1 Filter rows by user-selected date range
            if date_start or date_end:
                try:
                    date_parsed = pd.to_datetime(date_series, errors="coerce")
                    mask = pd.Series(True, index=df.index)
                    if date_start:
                        start_dt = pd.to_datetime(date_start)
                        mask &= date_parsed >= start_dt
                    if date_end:
                        end_dt = pd.to_datetime(date_end)
                        mask &= date_parsed <= end_dt
                    before = len(df)
                    df = df.loc[mask]
                    date_series = date_series.loc[mask]
                    if len(df) == 0:
                        return {"error": f"日期范围 [{date_start}, {date_end}] 内无数据"}
                    logger.info(f"日期过滤: {before} → {len(df)} 行 (范围: {date_start} ~ {date_end})")
                except Exception as e:
                    logger.warning(f"日期过滤失败: {e}，将使用全部数据")

            df = df.drop(columns=[date_col_found])

        # 3.5 Filter to only user-selected factor columns (if specified)
        if factor_cols:
            # Keep only: target_col + specified factor columns + date_col (if exists)
            cols_to_keep = [target_col] + [c for c in factor_cols if c in df.columns and c != target_col]
            # Also keep detected date column for reference
            if date_col and date_col in df.columns:
                cols_to_keep.append(date_col)
            # Remove duplicates while preserving order
            seen = set()
            cols_to_keep = [c for c in cols_to_keep if not (c in seen or seen.add(c))]
            missing = [c for c in factor_cols if c not in df.columns and c != target_col]
            if missing:
                logger.warning(f"以下指定因素列在数据中不存在: {missing}")
            df = df[cols_to_keep]
            if len(cols_to_keep) <= 1:
                return {"error": "过滤后没有可分析的特征列，请检查选中的列名是否在文件中存在"}

        # 4. Split X / y
        X = df.drop(columns=[target_col])
        y = df[target_col]

        if X.shape[1] == 0:
            return {"error": "去除目标列和日期列后无可分析的特征列"}

        # 5. Data type conversion & missing value handling
        X = X.apply(pd.to_numeric, errors="coerce")
        X = X.dropna()
        y = y.loc[X.index]

        if len(y) == 0:
            return {"error": "数据清洗后无有效数据行"}

        # 5.5 Build table data for frontend display (date + target + factors, cleaned rows)
        table_data: List[Dict[str, Any]] = []
        for idx in y.index:
            row: Dict[str, Any] = {}
            if date_series is not None and idx in date_series.index:
                row["date"] = str(date_series.loc[idx])
            row[target_col] = None if pd.isna(y.loc[idx]) else float(y.loc[idx])
            for col in X.columns:
                row[col] = None if pd.isna(X.loc[idx, col]) else float(X.loc[idx, col])
            table_data.append(row)

        # 6. Remove columns identical to target
        dup_cols = [c for c in X.columns if X[c].equals(y)]
        if dup_cols:
            logger.warning(f"发现与目标变量完全相同的列，已剔除：{dup_cols}")
            X = X.drop(columns=dup_cols)

        # 7. Remove zero-variance columns
        zero_var_cols = X.columns[X.var() == 0].tolist()
        if zero_var_cols:
            logger.warning(f"发现无变化的列，已剔除：{zero_var_cols}")
            X = X.drop(columns=zero_var_cols)

        features = X.columns.tolist()
        if len(features) == 0:
            return {"error": "没有可用的特征列，请检查数据！"}

        # 8. Compute correlation metrics
        scores_data: Dict[str, list] = {
            "variable": [],
            "pearson": [],
            "kendall": [],
            "spearman": [],
            "mic": [],
        }

        for col in features:
            x = X[col]
            try:
                p_val, _ = pearsonr(x, y)
                k_val, _ = kendalltau(x, y)
                s_val, _ = spearmanr(x, y)
            except Exception as e:
                logger.warning(f"{col} 相关性计算失败: {e}")
                p_val = k_val = s_val = np.nan

            scores_data["variable"].append(col)
            scores_data["pearson"].append(p_val)
            scores_data["kendall"].append(k_val)
            scores_data["spearman"].append(s_val)

        # 9. Mutual Information (MIC)
        try:
            mi_raw = mutual_info_regression(X, y, random_state=42)
            mi_scaled = MinMaxScaler().fit_transform(mi_raw.reshape(-1, 1)).flatten()
            scores_data["mic"] = mi_scaled.tolist()
        except Exception as e:
            logger.warning(f"互信息计算失败: {e}")
            scores_data["mic"] = [None] * len(features)

        # 10. Build score DataFrame and compute average (from raw values)
        score_df = pd.DataFrame(scores_data)
        numeric_cols = ["pearson", "kendall", "spearman", "mic"]
        score_df["avg_score"] = score_df[numeric_cols].mean(axis=1, skipna=True)

        # 11. Check if all scores are the same
        if score_df["avg_score"].nunique() == 1:
            logger.warning(
                "所有特征得分完全一致！请检查数据是否有重复或无效列。"
            )

        # 12. Sort by average score descending
        score_df.sort_values("avg_score", ascending=False, inplace=True)
        score_df.reset_index(drop=True, inplace=True)

        # 13. Extract top N factors
        top_factors = score_df["variable"].head(top_n).tolist()

        # 14. Build response (round values for JSON output)
        scores_list = []
        for _, row in score_df.iterrows():
            scores_list.append({
                "variable": row["variable"],
                "pearson": None if pd.isna(row["pearson"]) else round(float(row["pearson"]), 6),
                "kendall": None if pd.isna(row["kendall"]) else round(float(row["kendall"]), 6),
                "spearman": None if pd.isna(row["spearman"]) else round(float(row["spearman"]), 6),
                "mic": None if pd.isna(row["mic"]) else round(float(row["mic"]), 6),
                "avg_score": round(float(row["avg_score"]), 6),
            })

        return {
            "scores": scores_list,
            "top_factors": top_factors,
            "feature_count": len(features),
            "data_points": len(y),
            "columns": df.columns.tolist(),
            "table_data": table_data,
        }

    except Exception as e:
        logger.exception("影响因素分析失败")
        return {"error": f"分析过程出错: {str(e)}"}
