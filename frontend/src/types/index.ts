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
  "有色金属冶炼和压延加工业",
  "黑色金属冶炼和压延加工业",
  "化学原料和化学制品制造业",
  "非金属矿物制品业",
  "电力及热力的生产和供应业",
  "石油煤炭及其他燃料加工业",
  "计算机通信和其他电子设备制造业",
  "电气机械和器材制造业",
  "汽车制造业",
  "通用设备制造业",
  "信息传输软件和信息技术服务业",
  "酒、饮料和精制茶制造业"
];

export const REGION_LIST = [
  "贵阳市", "遵义市", "六盘水市", "安顺市", "毕节市", "铜仁市", 
  "黔东南苗族侗族自治州", "黔南布依族苗族自治州", "黔西南布依族苗族自治州", "贵安新区"
];

export const REGION_ECONOMIC_INDICATORS = [
  { key: "gdp", label: "生产总值(GDP)", unit: "亿元" },
  { key: "fixed_asset_investment", label: "固定资产投资", unit: "亿元" },
  { key: "economic_growth_rate", label: "经济增速", unit: "%" },
  { key: "economic_added_value", label: "经济增加值", unit: "亿元" },
  { key: "ppi", label: "生产者物价指数（%）", unit: "%" },
  { key: "cpi", label: "消费者价格指数CPI（%）", unit: "%" },
  { key: "industrial_added_value", label: "规模以上工业增加值", unit: "亿元" },
  { key: "import_export_total", label: "进出口总额", unit: "亿元" }
];

export const INDUSTRY_ECONOMIC_INDICATORS = [
  { key: "industry_added_value", label: "行业增加值", unit: "亿元" },
  { key: "industry_total_output", label: "行业总产值", unit: "亿元" },
  { key: "industry_profit_margin", label: "行业利润率", unit: "%" },
  { key: "revenue", label: "营业收入", unit: "亿元" },
  { key: "total_profit", label: "利润总额", unit: "亿元" },
  { key: "import_export_value", label: "进出口额", unit: "亿元" }
];

export const SECTOR_ECONOMIC_INDICATORS = [
  { key: "sector_added_value", label: "产业增加值", unit: "亿元" },
  { key: "added_value_growth", label: "产业增加值增速", unit: "%" },
  { key: "gdp_ratio", label: "产业增加值占GDP比重", unit: "%" },
  { key: "retail_sales_total", label: "全社会消费品零售总额", unit: "亿元" },
  { key: "import_export_total", label: "进出口总额", unit: "亿元" }
];

// For backward compatibility and common indicators
export const ECONOMIC_INDICATORS = [
  ...REGION_ECONOMIC_INDICATORS,
  ...INDUSTRY_ECONOMIC_INDICATORS,
  ...SECTOR_ECONOMIC_INDICATORS
].filter((v, i, a) => a.findIndex(t => (t.key === v.key)) === i);

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
    { name: "cpi", label: "消费者价格指数CPI（%）", unit: "%同比" },
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
    { name: "cpi", label: "消费者价格指数CPI（%）", unit: "%同比" },
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
     { name: "cpi", label: "消费者价格指数CPI（%）", unit: "%同比" },
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
  "有色金属冶炼和压延加工业": [
    { name: "rainfall_total", label: "月内总降雨量", unit: "mm" },
    { name: "max_temp", label: "最高温", unit: "℃" },
    { name: "humidity_avg", label: "月内湿度均值", unit: "%" },
    { name: "non_ferrous_price", label: "有色金属现货均价", unit: "元/吨" },
    { name: "non_ferrous_output", label: "有色金属产量", unit: "万吨" },
    { name: "finished_goods_inventory", label: "产成品存货", unit: "亿元" },
    { name: "power_price", label: "工业用电价格", unit: "元/kWh" },
    { name: "green_power_ratio", label: "行业绿电消纳占比", unit: "%" }
  ],
  "黑色金属冶炼和压延加工业": [
    { name: "rainfall_total", label: "月内总降雨量", unit: "mm" },
    { name: "temp_avg", label: "月内温度均值", unit: "℃" },
    { name: "humidity_avg", label: "月内湿度均值", unit: "%" },
    { name: "power_price", label: "工业用电价格", unit: "元/kWh" },
    { name: "steel_output", label: "钢材产量", unit: "万吨" },
    { name: "iron_ore_import_price", label: "铁矿石进口均价", unit: "美元/吨" },
    { name: "steel_price_index", label: "钢材综合价格指数", unit: "点" },
    { name: "load_peak_valley_diff_rate", label: "负荷峰谷差率", unit: "%" }
  ],
  "化学原料和化学制品制造业": [
    { name: "rainfall_total", label: "月内总降雨量", unit: "mm" },
    { name: "temp_avg", label: "月内温度均值", unit: "℃" },
    { name: "humidity_avg", label: "月内湿度均值", unit: "%" },
    { name: "power_price", label: "工业用电价格", unit: "元/kWh" },
    { name: "ccpi", label: "化工产品价格指数（CCPI）", unit: "点" },
    { name: "crude_oil_price", label: "原油购进价格", unit: "元/吨" },
    { name: "coal_price", label: "煤炭购进价格", unit: "元/吨" },
    { name: "capacity_utilization", label: "行业产能利用率", unit: "%" },
    { name: "power_reliability", label: "供电可靠性", unit: "%" }
  ],
  "非金属矿物制品业": [
    { name: "rainfall_total", label: "月内总降雨量", unit: "mm" },
    { name: "temp_avg", label: "月内温度均值", unit: "℃" },
    { name: "humidity_avg", label: "月内湿度均值", unit: "%" },
    { name: "power_price", label: "工业用电价格", unit: "元/kWh" },
    { name: "fixed_asset_investment", label: "固定资产投资完成额", unit: "亿元" },
    { name: "coal_price", label: "煤炭购进价格", unit: "元/吨" },
    { name: "real_estate_investment", label: "房地产开发投资额", unit: "亿元" },
    { name: "main_product_output", label: "水泥、玻璃等主要产品产量", unit: "万吨" },
    { name: "load_rate", label: "用电负荷率", unit: "%" }
  ],
  "电力及热力的生产和供应业": [
    { name: "rainfall_total", label: "月内总降雨量", unit: "mm" },
    { name: "temp_avg", label: "月内温度均值", unit: "℃" },
    { name: "humidity_avg", label: "月内湿度均值", unit: "%" },
    { name: "power_price", label: "工业用电价格", unit: "元/kWh" },
    { name: "coal_price_index", label: "电煤购进价格指数", unit: "点" },
    { name: "fixed_asset_investment", label: "电力、热力生产和供应业固定资产投资额", unit: "亿元" },
    { name: "capacity_utilization", label: "行业产能利用率", unit: "%" },
    { name: "equipment_utilization_hours", label: "发电设备平均利用小时数", unit: "h" }
  ],
  "石油煤炭及其他燃料加工业": [
    { name: "rainfall_total", label: "月内总降雨量", unit: "mm" },
    { name: "temp_avg", label: "月内温度均值", unit: "℃" },
    { name: "humidity_avg", label: "月内湿度均值", unit: "%" },
    { name: "power_price", label: "工业用电价格", unit: "元/kWh" },
    { name: "brent_oil_price", label: "布伦特原油现货价格", unit: "美元/桶" },
    { name: "ppi_index", label: "石油煤炭加工行业出厂价格指数", unit: "点" },
    { name: "fixed_asset_investment", label: "行业固定资产投资额", unit: "亿元" },
    { name: "renewable_energy_consumption_rate", label: "可再生能源消纳率", unit: "%" }
  ],
  "计算机通信和其他电子设备制造业": [
    { name: "rainfall_total", label: "月内总降雨量", unit: "mm" },
    { name: "temp_avg", label: "月内温度均值", unit: "℃" },
    { name: "humidity_avg", label: "月内湿度均值", unit: "%" },
    { name: "power_price", label: "工业用电价格", unit: "元/kWh" },
    { name: "ppi_index", label: "计算机通信和其他电子设备制造业出厂价格指数", unit: "点" },
    { name: "ic_import_price", label: "集成电路进口均价", unit: "美元/个" },
    { name: "export_delivery_value", label: "出口交货值", unit: "亿元" },
    { name: "fixed_asset_investment", label: "行业固定资产投资额", unit: "亿元" },
    { name: "green_power_weight", label: "绿电与可再生能源证书（绿证）认购权重", unit: "%" }
  ],
  "电气机械和器材制造业": [
    { name: "rainfall_total", label: "月内总降雨量", unit: "mm" },
    { name: "temp_avg", label: "月内温度均值", unit: "℃" },
    { name: "humidity_avg", label: "月内湿度均值", unit: "%" },
    { name: "power_price", label: "工业用电价格", unit: "元/kWh" },
    { name: "metal_price", label: "工业金属价格", unit: "元/吨" },
    { name: "fixed_asset_investment", label: "行业固定资产投资额", unit: "亿元" },
    { name: "ppi_index", label: "电气机械和器材制造业出厂价格指数", unit: "点" },
    { name: "max_load", label: "月用电最大负荷", unit: "MW" }
  ],
  "汽车制造业": [
    { name: "rainfall_total", label: "月内总降雨量", unit: "mm" },
    { name: "temp_avg", label: "月内温度均值", unit: "℃" },
    { name: "humidity_avg", label: "月内湿度均值", unit: "%" },
    { name: "power_price", label: "工业用电价格", unit: "元/kWh" },
    { name: "ppi_index", label: "汽车制造业出厂价格指数", unit: "点" },
    { name: "car_output_sales", label: "汽车产量与销量", unit: "万辆" },
    { name: "export_delivery_value", label: "出口交货值", unit: "亿元" },
    { name: "fixed_asset_investment", label: "汽车制造业固定资产投资额", unit: "亿元" },
    { name: "max_load", label: "月用电最大负荷", unit: "MW" }
  ],
  "通用设备制造业": [
    { name: "rainfall_total", label: "月内总降雨量", unit: "mm" },
    { name: "temp_avg", label: "月内温度均值", unit: "℃" },
    { name: "humidity_avg", label: "月内湿度均值", unit: "%" },
    { name: "power_price", label: "工业用电价格", unit: "元/kWh" },
    { name: "ppi_index", label: "通用设备制造业出厂价格指数", unit: "点" },
    { name: "ferrous_metal_purchase_price", label: "黑色金属购进价格", unit: "元/吨" },
    { name: "fixed_asset_investment", label: "通用设备制造业固定资产投资额", unit: "亿元" },
    { name: "export_delivery_value", label: "出口交货值", unit: "亿元" },
    { name: "load_peak_valley_diff_rate", label: "负荷峰谷差率", unit: "%" }
  ],
  "信息传输软件和信息技术服务业": [
    { name: "rainfall_total", label: "月内总降雨量", unit: "mm" },
    { name: "temp_avg", label: "月内温度均值", unit: "℃" },
    { name: "humidity_avg", label: "月内湿度均值", unit: "%" },
    { name: "power_price", label: "工业用电价格", unit: "元/kWh" },
    { name: "rd_investment", label: "行业研发经费投入", unit: "亿元" },
    { name: "broadband_users", label: "互联网宽带接入用户数", unit: "万户" },
    { name: "avg_salary", label: "从业人员平均工资", unit: "元" },
    { name: "fixed_asset_investment", label: "行业固定资产投资额", unit: "亿元" },
    { name: "it_export_value", label: "信息技术服务出口额", unit: "亿美元" },
    { name: "backup_power_duration", label: "备用电源供电保障时长", unit: "h" }
  ],
  "酒、饮料和精制茶制造业": [
    { name: "rainfall_total", label: "月内总降雨量", unit: "mm" },
    { name: "temp_avg", label: "月内温度均值", unit: "℃" },
    { name: "humidity_avg", label: "月内湿度均值", unit: "%" },
    { name: "power_price", label: "工业用电价格", unit: "元/kWh" },
    { name: "ppi_index", label: "酒、饮料和精制茶制造业出厂价格指数", unit: "点" },
    { name: "retail_sales_total", label: "社会消费品零售总额", unit: "亿元" },
    { name: "ag_product_purchase_price", label: "粮食、原料等农产品购进价格", unit: "元/吨" },
    { name: "tourism_catering_revenue", label: "旅游及餐饮业营业额", unit: "亿元" },
    { name: "load_peak_valley_diff_rate", label: "负荷峰谷差率", unit: "%" }
  ]
};

// Deprecated single lists but kept for compatibility if needed (will remove if unused)
export const SECTOR_FACTORS = SECTOR_FACTORS_MAP["第三产业"]; // Default placeholder
export const INDUSTRY_FACTORS = INDUSTRY_FACTORS_MAP["农林牧渔业"]; // Default placeholder

export const SECTOR_LIST = ["第一产业", "第二产业", "第三产业"];
