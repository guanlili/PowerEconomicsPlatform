# 电力看经济平台 (Power-to-Economy Insight Platform)

## 项目简介
本平台基于高频电力数据与月度宏观/行业/气象影响因素，构建区域、行业、产业三级经济指标预测与归因分析系统。

## 功能模块
- **M01 数据管理** (规划中)
- **M02 影响因素分析**: 可视化展示影响因素，计算相关性。
- **M03 经济预测**: 预测5项核心经济指标并评估精度。

## 技术栈
- **前端**: React, TypeScript, Vite, Ant Design, ECharts, Axios
- **后端**: Python, FastAPI, Pandas, NumPy, Scikit-learn, SciPy, Statsmodels (ARIMA)

## 快速开始

### 前端启动
1. 进入前端目录:
   ```bash
   cd frontend
   ```
2. 安装依赖:
   ```bash
   npm install
   ```
3. 启动开发服务器:
   ```bash
   npm run dev
   ```
4. 访问: http://localhost:5173

### 后端启动
1. 进入后端目录:
   ```bash
   cd backend
   ```
2. 创建虚拟环境并安装依赖:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. 启动 API 服务:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
4. 访问 API 文档: http://localhost:8000/docs

## 后端目录结构

```
backend/
├── main.py                         # FastAPI 入口，路由定义
├── requirements.txt                # Python 依赖
├── services/
│   ├── factor_analysis.py          # 影响因素分析服务
│   └── economic_prediction.py      # 经济预测服务（ARIMA）
├── utils/
│   └── excel_utils.py              # Excel 文件读取/校验工具
└── 算法包/
    ├── 影响因素分析-以产业场景为例/
    │   ├── 产业数据2025.xlsx
    │   └── 影响因素分析算法.py      # 原始算法脚本（已重构至 services/）
    └── 经济预测-以区域场景为例/
        ├── 2018-2022年经济指标数据.xlsx
        ├── 2023年影响因素数据.xlsx
        ├── 2023年经济指标.xlsx
        └── 经济预测.py              # 原始算法脚本（已重构至 services/）
```

## API 接口

| 端点 | 方法 | 说明 |
|---|---|---|
| `/` | GET | 服务健康检查 |
| `/api/analysis` | POST | 影响因素分析：上传 Excel + 目标列，返回 Pearson/Kendall/Spearman/MIC 相关性得分 |
| `/api/prediction` | POST | 经济预测：上传历史/实际数据 + 目标列，ARIMA 预测 + MAPE 精准度评估 |
| `/api/columns` | POST | 获取上传 Excel 文件的列名列表 |

### /api/analysis 请求示例
```bash
curl -X POST http://localhost:8000/api/analysis \
  -F "file=@产业数据2025.xlsx" \
  -F "target_col=产业增加值" \
  -F "top_n=5"
```

### /api/prediction 请求示例
```bash
curl -X POST http://localhost:8000/api/prediction \
  -F "history_file=@2018-2022年经济指标数据.xlsx" \
  -F "actual_file=@2023年经济指标.xlsx" \
  -F 'target_columns=["GDP（亿元）","CPI"]' \
  -F "forecast_periods=12"
```

## 算法说明

### 影响因素分析 (M02)
基于 Pearson、Kendall、Spearman 三种相关系数及最大信息系数（MIC），对上传数据中所有特征列与目标变量进行相关性量化评估。自动清洗列名、剔除缺失值/零方差列/重复列，按平均得分排序输出显著影响因素。

### 经济预测 (M03)
基于 ARIMA 时间序列模型，对历史经济指标数据进行趋势建模与未来预测。自动区分率值类指标（增速、CPI、PPI 等）与绝对值类指标，使用差异化 ARIMA 参数。可选上传实际值数据进行 MAPE 精准度评估。
