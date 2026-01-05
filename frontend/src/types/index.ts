export type SceneType = 'region' | 'industry' | 'sector';

export interface BaseFactor {
  province: string;
  year: number;
  month: number;
}

export interface RegionFactor extends BaseFactor {
  city: string;
  district: string;
  min_temp_avg?: number;
  max_temp_avg?: number;
  rainfall_total?: number;
  retail_sales?: number;
  urbanization_rate?: number;
  population?: number;
  clean_energy_ratio?: number;
  power_generation?: number;
}

export interface IndustryFactor extends BaseFactor {
  industry: string;
  investment_growth_rate?: number;
  power_generation?: number;
  rainfall_total?: number;
  min_temp_avg?: number;
  max_temp_avg?: number;
  industrial_capacity_utilization?: number; // Industrial specific
  ppi_purchase_index?: number; // Industrial specific
  real_estate_sales?: number; // Real estate specific
  // ... other specific factors
}

export interface SectorFactor extends BaseFactor {
  sector: '第一产业' | '第二产业' | '第三产业';
  coal_price?: number; // Secondary sector
  car_production?: number; // Secondary sector
  tourism_revenue?: number; // Tertiary sector
  '5g_base_stations'?: number; // Tertiary sector
}

export type EconomicIndicator = 
  | 'gdp'
  | 'fixed_asset_investment'
  | 'economic_growth_rate'
  | 'economic_added_value'
  | 'ppi';

export interface EconomicData {
  year: number;
  month: number;
  gdp?: number;
  fixed_asset_investment?: number;
  economic_growth_rate?: number;
  economic_added_value?: number;
  ppi?: number;
}

export const INDUSTRY_LIST = [
  "农林牧渔业", "工业", "建筑业", "批发和零售业",
  "交通运输、仓储和邮政业", "住宿和餐饮业", "金融业",
  "房地产业", "信息传输、软件和信息技术服务业",
  "租赁和商务服务业", "公共服务及管理组织"
];

export const ECONOMIC_INDICATORS = [
  { key: "gdp", label: "生产总值(GDP)", unit: "亿元" },
  { key: "fixed_asset_investment", label: "固定资产投资", unit: "亿元" },
  { key: "economic_growth_rate", label: "经济增速", unit: "%" },
  { key: "economic_added_value", label: "经济增加值", unit: "亿元" },
  { key: "ppi", label: "生产价格指数", unit: "%" }
];

export interface FactorConfig {
  name: string;
  label: string;
  unit: string;
}

// Helper to get factor list based on scene
export const REGION_FACTORS: FactorConfig[] = [
  { name: "min_temp_avg", label: "月内每日最低温度均值", unit: "℃" },
  { name: "max_temp_avg", label: "月内每日最高温度均值", unit: "℃" },
  { name: "rainfall_total", label: "月内总降雨量", unit: "mm" },
  { name: "retail_sales", label: "社会消费品零售总额", unit: "亿元" },
  { name: "urbanization_rate", label: "城镇化率", unit: "%" },
  { name: "population", label: "常住人口", unit: "万人" },
  { name: "clean_energy_ratio", label: "清洁能源占比", unit: "%" },
  { name: "power_generation", label: "发电量", unit: "亿千瓦时" }
];

export const SECTOR_FACTORS_MAP: Record<string, FactorConfig[]> = {
  "第一产业": [
    { name: "min_temp_avg", label: "月内每日最低温度均值", unit: "℃" },
    { name: "max_temp_avg", label: "月内每日最高温度均值", unit: "℃" },
    { name: "rainfall_total", label: "月内总降雨量", unit: "mm" },
    { name: "labor_productivity", label: "劳动生产率", unit: "%" },
    { name: "cpi", label: "消费者价格指数CPI", unit: "%同比" },
    { name: "grid_load_rate", label: "电网负荷率", unit: "%" },
    { name: "ag_product_price_index", label: "农产品价格指数", unit: "%" },
    { name: "relative_humidity", label: "相对湿度", unit: "%" },
    { name: "livestock_output_value", label: "畜牧业产值", unit: "亿元" },
    { name: "aquatic_production", label: "水产品产量", unit: "万吨" }
  ],
  "第二产业": [
    { name: "min_temp_avg", label: "月内每日最低温度均值", unit: "℃" },
    { name: "max_temp_avg", label: "月内每日最高温度均值", unit: "℃" },
    { name: "rainfall_total", label: "月内总降雨量", unit: "mm" },
    { name: "labor_productivity", label: "劳动生产率", unit: "%" },
    { name: "cpi", label: "消费者价格指数CPI", unit: "%同比" },
    { name: "grid_load_rate", label: "电网负荷率", unit: "%" },
    { name: "energy_price_index", label: "能源价格指数", unit: "%" },
    { name: "coal_price_index", label: "煤炭价格指数", unit: "元/吨" },
    { name: "chip_production", label: "芯片/集成电路产量", unit: "万块" },
    { name: "motor_production", label: "电动机产量", unit: "万台" },
    { name: "pesticide_production", label: "化学农药原药", unit: "万吨" },
    { name: "car_production", label: "汽车产量", unit: "万辆" },
    { name: "thermal_power_hours", label: "火电机组利用小时数", unit: "h" }
  ],
  "第三产业": [
     { name: "min_temp_avg", label: "月内每日最低温度均值", unit: "℃" },
     { name: "max_temp_avg", label: "月内每日最高温度均值", unit: "℃" },
     { name: "rainfall_total", label: "月内总降雨量", unit: "mm" },
     { name: "cpi", label: "消费者价格指数CPI", unit: "%同比" },
     { name: "grid_load_rate", label: "电网负荷率", unit: "%" },
     { name: "retail_sales", label: "社会消费品零售总额", unit: "亿元" },
     { name: "finance_added_value", label: "金融业增加值", unit: "亿元" },
     { name: "logistics_transport_volume", label: "物流运输量", unit: "万吨" },
     { name: "warehouse_area", label: "仓储设施总面积", unit: "万㎡" },
     { name: "5g_base_stations", label: "5G基站数量", unit: "万个" },
     { name: "tourism_stats", label: "旅游收入及人次", unit: "万人" },
     { name: "clean_energy_ratio", label: "清洁能源占比", unit: "%" }
  ]
};

export const INDUSTRY_FACTORS_MAP: Record<string, FactorConfig[]> = {
  "农林牧渔业": [
    { name: "investment_growth_rate", label: "投资完成额累计增长", unit: "%" },
    { name: "power_generation", label: "发电量", unit: "亿千瓦时" },
    { name: "rainfall_total", label: "月内总降雨量", unit: "mm" },
    { name: "max_temp_avg", label: "月内每日最高温度均值", unit: "℃" },
    { name: "min_temp_avg", label: "月内每日最低温度均值", unit: "℃" },
    { name: "frost_days", label: "冻害日数", unit: "天" },
    { name: "fertilizer_usage", label: "化肥使用量", unit: "万吨" }
  ],
  "工业": [
    { name: "investment_growth_rate", label: "投资完成额累计增长", unit: "%" },
    { name: "ppi_purchase", label: "工业生产者购进价格指数", unit: "%" },
    { name: "industrial_added_value_growth", label: "工业增加值同比增长", unit: "%" },
    { name: "power_generation", label: "发电量", unit: "亿千瓦时" },
    { name: "rainfall_total", label: "月内总降雨量", unit: "mm" },
    { name: "min_temp_avg", label: "月内每日最低温度均值", unit: "℃" },
    { name: "max_temp_avg", label: "月内每日最高温度均值", unit: "℃" },
    { name: "industrial_capacity_utilization", label: "工业产能利用率", unit: "%" }
  ],
  "建筑业": [
    { name: "investment_growth_rate", label: "投资完成额累计增长", unit: "%" },
    { name: "power_generation", label: "发电量", unit: "亿千瓦时" },
    { name: "rainfall_total", label: "月内总降雨量", unit: "mm" },
    { name: "min_temp_avg", label: "月内每日最低温度均值", unit: "℃" },
    { name: "max_temp_avg", label: "月内每日最高温度均值", unit: "℃" },
    { name: "construction_area", label: "房屋建筑施工面积", unit: "万㎡" }
  ],
  "批发和零售业": [
    { name: "investment_growth_rate", label: "投资完成额累计增长", unit: "%" },
    { name: "power_generation", label: "发电量", unit: "亿千瓦时" },
    { name: "rainfall_total", label: "月内总降雨量", unit: "mm" },
    { name: "min_temp_avg", label: "月内每日最低温度均值", unit: "℃" },
    { name: "max_temp_avg", label: "月内每日最高温度均值", unit: "℃" },
    { name: "retail_sales", label: "社会消费品零售总额", unit: "亿元" },
    { name: "inventory_turnover", label: "商品库存周转率", unit: "%" }
  ],
  "交通运输、仓储和邮政业": [
    { name: "investment_growth_rate", label: "投资完成额累计增长", unit: "%" },
    { name: "power_generation", label: "发电量", unit: "亿千瓦时" },
    { name: "rainfall_total", label: "月内总降雨量", unit: "mm" },
    { name: "min_temp_avg", label: "月内每日最低温度均值", unit: "℃" },
    { name: "max_temp_avg", label: "月内每日最高温度均值", unit: "℃" },
    { name: "transport_maintenance_cost", label: "运输车辆维护成本", unit: "万元/月" },
    { name: "warehouse_turnover", label: "仓储企业库存周转率", unit: "%" }
  ],
  "住宿和餐饮业": [
    { name: "investment_growth_rate", label: "投资完成额累计增长", unit: "%" },
    { name: "power_generation", label: "发电量", unit: "亿千瓦时" },
    { name: "rainfall_total", label: "月内总降雨量", unit: "mm" },
    { name: "min_temp_avg", label: "月内每日最低温度均值", unit: "℃" },
    { name: "max_temp_avg", label: "月内每日最高温度均值", unit: "℃" },
    { name: "catering_revenue", label: "餐饮收入", unit: "亿元" }
  ],
  "金融业": [
    { name: "investment_growth_rate", label: "投资完成额累计增长", unit: "%" },
    { name: "power_generation", label: "发电量", unit: "亿千瓦时" },
    { name: "rainfall_total", label: "月内总降雨量", unit: "mm" },
    { name: "min_temp_avg", label: "月内每日最低温度均值", unit: "℃" },
    { name: "max_temp_avg", label: "月内每日最高温度均值", unit: "℃" },
    { name: "bond_issuance", label: "债券发行量", unit: "亿元" },
    { name: "loan_deposit_ratio", label: "银行存贷比", unit: "%" }
  ],
  "房地产业": [
    { name: "investment_growth_rate", label: "投资完成额累计增长", unit: "%" },
    { name: "power_generation", label: "发电量", unit: "亿千瓦时" },
    { name: "rainfall_total", label: "月内总降雨量", unit: "mm" },
    { name: "min_temp_avg", label: "月内每日最低温度均值", unit: "℃" },
    { name: "max_temp_avg", label: "月内每日最高温度均值", unit: "℃" },
    { name: "commercial_housing_sales", label: "商品房销售额", unit: "亿元" },
    { name: "real_estate_investment", label: "房地产开发投资完成额", unit: "亿元" }
  ],
  "信息传输、软件和信息技术服务业": [
    { name: "investment_growth_rate", label: "投资完成额累计增长", unit: "%" },
    { name: "power_generation", label: "发电量", unit: "亿千瓦时" },
    { name: "rainfall_total", label: "月内总降雨量", unit: "mm" },
    { name: "min_temp_avg", label: "月内每日最低温度均值", unit: "℃" },
    { name: "max_temp_avg", label: "月内每日最高温度均值", unit: "℃" },
    { name: "internet_users", label: "互联网用户数", unit: "万人" },
    { name: "it_employees", label: "信息技术行业从业人员数", unit: "万人" }
  ],
  "租赁和商务服务业": [
    { name: "investment_growth_rate", label: "投资完成额累计增长", unit: "%" },
    { name: "power_generation", label: "发电量", unit: "亿千瓦时" },
    { name: "rainfall_total", label: "月内总降雨量", unit: "mm" },
    { name: "min_temp_avg", label: "月内每日最低温度均值", unit: "℃" },
    { name: "max_temp_avg", label: "月内每日最高温度均值", unit: "℃" },
    { name: "equipment_rental_market", label: "设备租赁市场规模", unit: "亿元" }
  ],
  "公共服务及管理组织": [
    { name: "investment_growth_rate", label: "投资完成额累计增长", unit: "%" },
    { name: "power_generation", label: "发电量", unit: "亿千瓦时" },
    { name: "rainfall_total", label: "月内总降雨量", unit: "mm" },
    { name: "min_temp_avg", label: "月内每日最低温度均值", unit: "℃" },
    { name: "max_temp_avg", label: "月内每日最高温度均值", unit: "℃" },
    { name: "cpi", label: "居民消费价格指数", unit: "%" },
    { name: "retail_sales_social", label: "社会消费品零售总额", unit: "亿元" },
    { name: "unemployment_rate", label: "失业率", unit: "%" }
  ]
};

// Deprecated single lists but kept for compatibility if needed (will remove if unused)
export const SECTOR_FACTORS = SECTOR_FACTORS_MAP["第三产业"]; // Default placeholder
export const INDUSTRY_FACTORS = INDUSTRY_FACTORS_MAP["农林牧渔业"]; // Default placeholder

export const SECTOR_LIST = ["第一产业", "第二产业", "第三产业"];
