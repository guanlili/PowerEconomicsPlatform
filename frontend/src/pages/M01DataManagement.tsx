import React, { useState, useMemo } from 'react';
import {
  Layout,
  Card,
  Table,
  Button,
  Space,
  Select,
  Upload,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Tag,
  Typography,
  Tooltip,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  DownloadOutlined,
  DatabaseOutlined,
  FilterOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  LineChartOutlined,
  CloudOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

// ============================================================
// Types
// ============================================================

type DataCategory = 'power' | 'economic' | 'weather';
type DataScope = '区域' | '行业' | '产业';

interface DataRecord {
  id: string;
  year: number;
  month: number;
  scope: DataScope;
  indicator: string;
  value: number;
  unit: string;
  region?: string;
}

// ============================================================
// Indicator Definitions
// ============================================================

const POWER_REGION_INDICATORS = [
  { name: '区域用电量', unit: '亿千瓦时' },
  { name: '发电量', unit: '亿千瓦时' },
  { name: '清洁能源占比', unit: '%' },
];

const POWER_INDUSTRY_INDICATORS = [
  { name: '行业用电量', unit: '亿千瓦时' },
  { name: '用电价格', unit: '元/千瓦时' },
  { name: '行业绿电消纳占比', unit: '%' },
  { name: '负荷峰谷差率', unit: '%' },
  { name: '供电可靠性', unit: '%' },
  { name: '用电负荷率', unit: '%' },
  { name: '电煤购进价格指数', unit: '指数' },
  { name: '发电设备平均利用小时数', unit: '小时' },
  { name: '可再生能源消纳率', unit: '%' },
  { name: '绿电与可再生能源证书（绿证）认购权重', unit: '%' },
  { name: '月用电最大负荷', unit: '万千瓦' },
  { name: '备用电源供电保障时长', unit: '小时' },
];

const POWER_INDUSTRY_SECTOR_INDICATORS = [
  { name: '产业用电量', unit: '亿千瓦时' },
  { name: '电网负荷率', unit: '%' },
  { name: '火电机组利用小时数', unit: '小时' },
  { name: '清洁能源占比', unit: '%' },
];

const ECONOMIC_REGION_INDICATORS = [
  { name: '社会消费品零售总额', unit: '亿元' },
  { name: '城镇化率', unit: '%' },
  { name: '常住人口', unit: '万人' },
  { name: '生产总值(GDP)', unit: '亿元' },
  { name: '固定资产投资', unit: '亿元' },
  { name: '经济增速', unit: '%' },
  { name: '经济增加值', unit: '亿元' },
  { name: '生产价格指数(PPI)', unit: '指数' },
  { name: '居民消费价格指数(CPI)', unit: '指数' },
  { name: '规模以上工业增加值', unit: '亿元' },
  { name: '进出口总额', unit: '亿元' },
];

const ECONOMIC_INDUSTRY_INDICATORS = [
  { name: '有色金属现货均价', unit: '元/吨' },
  { name: '有色金属产量', unit: '万吨' },
  { name: '产成品存货', unit: '亿元' },
  { name: '钢材产量', unit: '万吨' },
  { name: '铁矿石进口均价', unit: '美元/吨' },
  { name: '钢材综合价格指数', unit: '指数' },
  { name: '化工产品价格指数（CCPI）', unit: '指数' },
  { name: '原油购进价格', unit: '元/吨' },
  { name: '煤炭购进价格', unit: '元/吨' },
  { name: '行业产能利用率', unit: '%' },
  { name: '固定资产投资完成额', unit: '亿元' },
  { name: '房地产开发投资额', unit: '亿元' },
  { name: '水泥产量', unit: '万吨' },
  { name: '玻璃产量', unit: '万重量箱' },
  { name: '电力、热力生产和供应业固定资产投资额', unit: '亿元' },
  { name: '布伦特原油现货价格', unit: '美元/桶' },
  { name: '石油煤炭加工行业出厂价格指数', unit: '指数' },
  { name: '行业固定资产投资额', unit: '亿元' },
  { name: '计算机通信和其他电子设备制造业出厂价格指数', unit: '指数' },
  { name: '集成电路进口均价', unit: '美元/个' },
  { name: '出口交货值', unit: '亿元' },
  { name: '金属价格', unit: '指数' },
  { name: '电气机械和器材制造业出厂价格指数', unit: '指数' },
  { name: '汽车制造业出厂价格指数', unit: '指数' },
  { name: '汽车产量', unit: '万辆' },
  { name: '汽车销量', unit: '万辆' },
  { name: '汽车制造业固定资产投资额', unit: '亿元' },
  { name: '通用设备制造业出厂价格指数', unit: '指数' },
  { name: '黑色金属购进价格', unit: '指数' },
  { name: '通用设备制造业固定资产投资额', unit: '亿元' },
  { name: '行业研发经费投入', unit: '亿元' },
  { name: '互联网宽带接入用户数', unit: '万户' },
  { name: '从业人员平均工资', unit: '元/月' },
  { name: '信息技术服务出口额', unit: '亿美元' },
  { name: '酒、饮料和精制茶制造业出厂价格指数', unit: '指数' },
  { name: '社会消费品零售总额', unit: '亿元' },
  { name: '粮食购进价格', unit: '指数' },
  { name: '原料购进价格', unit: '指数' },
  { name: '农产品购进价格', unit: '指数' },
  { name: '旅游及餐饮业营业额', unit: '亿元' },
  { name: '行业增加值', unit: '亿元' },
  { name: '行业总产值', unit: '亿元' },
  { name: '行业利润率', unit: '%' },
  { name: '营业收入', unit: '亿元' },
  { name: '利润总额', unit: '亿元' },
  { name: '进出口额', unit: '亿元' },
];

const ECONOMIC_INDUSTRY_SECTOR_INDICATORS = [
  { name: '劳动生产率', unit: '元/人' },
  { name: '消费者价格指数(CPI)', unit: '指数' },
  { name: '农产品价格指数', unit: '指数' },
  { name: '畜牧业产值', unit: '亿元' },
  { name: '水产品产量', unit: '万吨' },
  { name: '能源价格指数', unit: '指数' },
  { name: '煤炭价格指数', unit: '指数' },
  { name: '社会消费品零售总额', unit: '亿元' },
  { name: '金融业增加值', unit: '亿元' },
  { name: '物流运输量', unit: '万吨' },
  { name: '仓储设施总面积', unit: '万平方米' },
  { name: '5G基站数量', unit: '个' },
  { name: '旅游收入', unit: '亿元' },
  { name: '旅游人次', unit: '万人次' },
  { name: '产业增加值', unit: '亿元' },
  { name: '产业增加值增速', unit: '%' },
  { name: '产业增加值占GDP比重', unit: '%' },
  { name: '进出口总额', unit: '亿元' },
];

const WEATHER_REGION_INDICATORS = [
  { name: '月内每日最低温度均值', unit: '°C' },
  { name: '月内每日最高温度均值', unit: '°C' },
  { name: '月内总降雨量', unit: 'mm' },
];

const WEATHER_INDUSTRY_INDICATORS = [
  { name: '月内每日最低温度均值', unit: '°C' },
  { name: '月内每日最高温度均值', unit: '°C' },
  { name: '月内总降雨量', unit: 'mm' },
];

const WEATHER_INDUSTRY_SECTOR_INDICATORS = [
  { name: '月内每日最低温度均值', unit: '°C' },
  { name: '月内每日最高温度均值', unit: '°C' },
  { name: '月内总降雨量', unit: 'mm' },
  { name: '相对湿度', unit: '%' },
];

const INDICATOR_MAP: Record<DataCategory, Record<DataScope, { name: string; unit: string }[]>> = {
  power: {
    区域: POWER_REGION_INDICATORS,
    行业: POWER_INDUSTRY_INDICATORS,
    产业: POWER_INDUSTRY_SECTOR_INDICATORS,
  },
  economic: {
    区域: ECONOMIC_REGION_INDICATORS,
    行业: ECONOMIC_INDUSTRY_INDICATORS,
    产业: ECONOMIC_INDUSTRY_SECTOR_INDICATORS,
  },
  weather: {
    区域: WEATHER_REGION_INDICATORS,
    行业: WEATHER_INDUSTRY_INDICATORS,
    产业: WEATHER_INDUSTRY_SECTOR_INDICATORS,
  },
};

// ============================================================
// Mock Data Generator
// ============================================================

let idCounter = 10000;
const genId = () => `rec-${++idCounter}`;

const REGIONS = ['贵阳市', '遵义市', '六盘水市', '安顺市', '毕节市', '铜仁市'];
const INDUSTRIES = ['黑色金属冶炼', '化学原料制造', '非金属矿物制品', '计算机通信电子', '汽车制造', '电力热力生产'];
const INDUSTRY_SECTORS = ['第一产业', '第二产业', '第三产业'];

function generateMockData(category: DataCategory): DataRecord[] {
  const records: DataRecord[] = [];
  const years = [2020, 2021, 2022, 2023, 2024, 2025];

  // Helper to get a scope-specific region label
  const getScopeRegion = (scope: DataScope, idx: number): string => {
    if (scope === '区域') return REGIONS[idx % REGIONS.length];
    if (scope === '行业') return INDUSTRIES[idx % INDUSTRIES.length];
    return INDUSTRY_SECTORS[idx % INDUSTRY_SECTORS.length];
  };

  const scopes: DataScope[] = ['区域', '行业', '产业'];
  scopes.forEach((scope) => {
    const indicators = INDICATOR_MAP[category][scope];
    years.forEach((year) => {
      // Generate data for months 1-12, but only fill first 3 indicators per scope to avoid 500+ rows
      const sampledIndicators = indicators.slice(0, Math.min(indicators.length, 4));
      sampledIndicators.forEach((ind, iIdx) => {
        for (let month = 1; month <= 12; month++) {
          // Skip some months randomly for realism
          if (Math.random() < 0.15) continue;
          const baseVal = 50 + Math.random() * 950;
          const roundedVal = parseFloat(baseVal.toFixed(2));
          records.push({
            id: genId(),
            year,
            month,
            scope,
            indicator: ind.name,
            value: roundedVal,
            unit: ind.unit,
            region: getScopeRegion(scope, iIdx),
          });
        }
      });
    });
  });

  return records;
}

// Pre-generate mock data per category
const MOCK_DATA: Record<DataCategory, DataRecord[]> = {
  power: generateMockData('power'),
  economic: generateMockData('economic'),
  weather: generateMockData('weather'),
};

// ============================================================
// Helpers
// ============================================================

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

const CATEGORY_META: Record<DataCategory, { label: string; color: string; icon: React.ReactNode }> = {
  power: { label: '电力数据', color: '#1677ff', icon: <ThunderboltOutlined /> },
  economic: { label: '经济数据', color: '#52c41a', icon: <LineChartOutlined /> },
  weather: { label: '气象数据', color: '#fa8c16', icon: <CloudOutlined /> },
};

const SCOPE_COLOR: Record<DataScope, string> = {
  区域: 'blue',
  行业: 'purple',
  产业: 'cyan',
};

// ============================================================
// Main Component
// ============================================================

const M01DataManagement: React.FC = () => {
  const [category, setCategory] = useState<DataCategory>('power');
  const [filterScope, setFilterScope] = useState<DataScope | 'all'>('all');
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState<number | null>(null);
  const [filterIndicator, setFilterIndicator] = useState<string>('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [formScope, setFormScope] = useState<DataScope>('区域');

  // Per-category mutable data stored in state
  const [dataMap, setDataMap] = useState<Record<DataCategory, DataRecord[]>>(MOCK_DATA);

  const currentData = dataMap[category];
  const currentMeta = CATEGORY_META[category];

  // ---- Filtered data ----
  const filteredData = useMemo(() => {
    return currentData.filter((r) => {
      if (filterScope !== 'all' && r.scope !== filterScope) return false;
      if (filterYear !== null && r.year !== filterYear) return false;
      if (filterMonth !== null && r.month !== filterMonth) return false;
      if (filterIndicator && !r.indicator.includes(filterIndicator)) return false;
      return true;
    });
  }, [currentData, filterScope, filterYear, filterMonth, filterIndicator]);

  // ---- Stats ----
  const stats = useMemo(() => {
    const total = filteredData.length;
    const scopes = new Set(filteredData.map((r) => r.scope)).size;
    const indicators = new Set(filteredData.map((r) => r.indicator)).size;
    return { total, scopes, indicators };
  }, [filteredData]);

  // ---- Available indicators for add-form ----
  const availableIndicators = useMemo(() => {
    return INDICATOR_MAP[category][formScope];
  }, [category, formScope]);

  // ---- Columns ----
  const columns: ColumnsType<DataRecord> = [
    {
      title: '年份',
      dataIndex: 'year',
      key: 'year',
      width: 80,
      sorter: (a, b) => a.year - b.year,
    },
    {
      title: '月份',
      dataIndex: 'month',
      key: 'month',
      width: 70,
      render: (m: number) => `${m}月`,
      sorter: (a, b) => a.month - b.month,
    },
    {
      title: '数据范畴',
      dataIndex: 'scope',
      key: 'scope',
      width: 90,
      render: (scope: DataScope) => <Tag color={SCOPE_COLOR[scope]}>{scope}</Tag>,
    },
    {
      title: '地区/行业/产业',
      dataIndex: 'region',
      key: 'region',
      width: 160,
      ellipsis: true,
    },
    {
      title: '指标名称',
      dataIndex: 'indicator',
      key: 'indicator',
      ellipsis: { showTitle: false },
      render: (text: string) => (
        <Tooltip placement="topLeft" title={text}>
          {text}
        </Tooltip>
      ),
    },
    {
      title: '数值',
      dataIndex: 'value',
      key: 'value',
      width: 120,
      sorter: (a, b) => a.value - b.value,
      render: (v: number) => v.toLocaleString('zh-CN'),
    },
    {
      title: '单位',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Popconfirm
          title="确认删除"
          description="确定要删除这条记录吗？"
          onConfirm={() => handleDeleteOne(record.id)}
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
        >
          <Button type="link" danger size="small" icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  // ---- Handlers ----

  const handleDeleteOne = (id: string) => {
    setDataMap((prev) => ({
      ...prev,
      [category]: prev[category].filter((r) => r.id !== id),
    }));
    message.success('删除成功');
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先勾选要删除的记录');
      return;
    }
    Modal.confirm({
      title: '批量删除',
      content: `确定删除选中的 ${selectedRowKeys.length} 条记录吗？`,
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        const ids = new Set(selectedRowKeys as string[]);
        setDataMap((prev) => ({
          ...prev,
          [category]: prev[category].filter((r) => !ids.has(r.id)),
        }));
        setSelectedRowKeys([]);
        message.success(`已删除 ${ids.size} 条记录`);
      },
    });
  };

  const handleAddSubmit = () => {
    form.validateFields().then((values) => {
      const ind = availableIndicators.find((i) => i.name === values.indicator);
      const newRecord: DataRecord = {
        id: genId(),
        year: values.year,
        month: values.month,
        scope: values.scope,
        indicator: values.indicator,
        value: values.value,
        unit: ind?.unit ?? '',
        region: values.region,
      };
      setDataMap((prev) => ({
        ...prev,
        [category]: [newRecord, ...prev[category]],
      }));
      message.success('新增成功');
      setAddModalOpen(false);
      form.resetFields();
    });
  };

  const handleDownloadTemplate = () => {
    // Build CSV content for the current category
    const header = ['年份', '月份', '数据范畴', '地区/行业/产业', '指标名称', '数值', '单位'];
    const exampleRows: string[][] = [];
    const scopes: DataScope[] = ['区域', '行业', '产业'];
    scopes.forEach((scope) => {
      const inds = INDICATOR_MAP[category][scope].slice(0, 2);
      inds.forEach((ind) => {
        exampleRows.push(['2024', '1', scope, scope === '区域' ? '贵阳市' : scope === '行业' ? '黑色金属冶炼' : '第一产业', ind.name, '100', ind.unit]);
      });
    });
    const csvContent = [header, ...exampleRows].map((r) => r.join(',')).join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentMeta.label}_导入模板.csv`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('模板下载成功');
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.replace(/^\uFEFF/, '').split('\n').filter(Boolean);
        const dataLines = lines.slice(1); // skip header
        const newRecords: DataRecord[] = [];
        dataLines.forEach((line) => {
          const cols = line.split(',');
          if (cols.length < 7) return;
          const [yearStr, monthStr, scope, region, indicator, valueStr, unit] = cols;
          newRecords.push({
            id: genId(),
            year: parseInt(yearStr.trim()),
            month: parseInt(monthStr.trim()),
            scope: scope.trim() as DataScope,
            indicator: indicator.trim(),
            value: parseFloat(valueStr.trim()),
            unit: unit.trim(),
            region: region.trim(),
          });
        });
        if (newRecords.length === 0) {
          message.warning('文件中未解析到有效数据，请检查格式');
          return;
        }
        setDataMap((prev) => ({
          ...prev,
          [category]: [...newRecords, ...prev[category]],
        }));
        message.success(`成功导入 ${newRecords.length} 条记录`);
        setImportModalOpen(false);
      } catch {
        message.error('文件解析失败，请检查格式');
      }
    };
    reader.readAsText(file);
    return false; // prevent default upload behavior
  };

  const resetFilters = () => {
    setFilterScope('all');
    setFilterYear(null);
    setFilterMonth(null);
    setFilterIndicator('');
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <Layout style={{ padding: 16, background: 'transparent', minHeight: 'calc(100vh - 64px)' }}>
      <Content>
        {/* ---- Page Header ---- */}
        <div
          style={{
            background: 'linear-gradient(135deg, #001529 0%, #002952 50%, #003a6b 100%)',
            borderRadius: 12,
            padding: '20px 28px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 20px rgba(0,21,41,0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                color: '#fff',
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <DatabaseOutlined />
            </div>
            <div>
              <Title level={4} style={{ color: '#fff', margin: 0, fontWeight: 700 }}>
                数据管理 (M01)
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
                管理 2020-2025 年电力、经济、气象三类核心数据
              </Text>
            </div>
          </div>
          {/* Category switcher */}
          <Space size={8}>
            {(['power', 'economic', 'weather'] as DataCategory[]).map((cat) => {
              const meta = CATEGORY_META[cat];
              const active = category === cat;
              return (
                <button
                  key={cat}
                  id={`category-btn-${cat}`}
                  onClick={() => {
                    setCategory(cat);
                    setSelectedRowKeys([]);
                    resetFilters();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 18px',
                    border: active ? `2px solid ${meta.color}` : '2px solid rgba(255,255,255,0.2)',
                    borderRadius: 8,
                    background: active ? `${meta.color}22` : 'rgba(255,255,255,0.08)',
                    color: active ? meta.color : 'rgba(255,255,255,0.75)',
                    cursor: 'pointer',
                    fontWeight: active ? 700 : 400,
                    fontSize: 14,
                    transition: 'all 0.25s',
                  }}
                >
                  {meta.icon}
                  {meta.label}
                </button>
              );
            })}
          </Space>
        </div>

        {/* ---- Stats Cards ---- */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8}>
            <Card
              style={{
                borderRadius: 10,
                background: 'linear-gradient(135deg, #e6f4ff, #bae0ff)',
                border: '1px solid #91caff',
              }}
              styles={{ body: { padding: '16px 20px' } }}
            >
              <Statistic
                title={<span style={{ color: '#1677ff', fontWeight: 600 }}>总记录数</span>}
                value={stats.total}
                suffix="条"
                valueStyle={{ color: '#1677ff', fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card
              style={{
                borderRadius: 10,
                background: 'linear-gradient(135deg, #f6ffed, #d9f7be)',
                border: '1px solid #b7eb8f',
              }}
              styles={{ body: { padding: '16px 20px' } }}
            >
              <Statistic
                title={<span style={{ color: '#52c41a', fontWeight: 600 }}>数据范畴数</span>}
                value={stats.scopes}
                suffix="类"
                valueStyle={{ color: '#52c41a', fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card
              style={{
                borderRadius: 10,
                background: 'linear-gradient(135deg, #fff7e6, #ffd591)',
                border: '1px solid #ffc069',
              }}
              styles={{ body: { padding: '16px 20px' } }}
            >
              <Statistic
                title={<span style={{ color: '#fa8c16', fontWeight: 600 }}>指标种类数</span>}
                value={stats.indicators}
                suffix="项"
                valueStyle={{ color: '#fa8c16', fontWeight: 700 }}
              />
            </Card>
          </Col>
        </Row>

        {/* ---- Filter & Action Bar ---- */}
        <Card
          style={{ borderRadius: 10, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          styles={{ body: { padding: '14px 20px' } }}
        >
          <Row gutter={[12, 12]} align="middle">
            <Col>
              <FilterOutlined style={{ color: '#8c8c8c', marginRight: 4 }} />
              <Text type="secondary" style={{ fontSize: 13 }}>筛选：</Text>
            </Col>
            <Col>
              <Select
                id="filter-scope"
                value={filterScope}
                onChange={setFilterScope}
                style={{ width: 110 }}
                size="small"
              >
                <Option value="all">全部范畴</Option>
                <Option value="区域">区域</Option>
                <Option value="行业">行业</Option>
                <Option value="产业">产业</Option>
              </Select>
            </Col>
            <Col>
              <Select
                id="filter-year"
                placeholder="选择年份"
                allowClear
                value={filterYear ?? undefined}
                onChange={(v) => setFilterYear(v ?? null)}
                style={{ width: 110 }}
                size="small"
              >
                {[2020, 2021, 2022, 2023, 2024, 2025].map((y) => (
                  <Option key={y} value={y}>{y}年</Option>
                ))}
              </Select>
            </Col>
            <Col>
              <Select
                id="filter-month"
                placeholder="选择月份"
                allowClear
                value={filterMonth ?? undefined}
                onChange={(v) => setFilterMonth(v ?? null)}
                style={{ width: 110 }}
                size="small"
              >
                {MONTHS.map((m, idx) => (
                  <Option key={idx + 1} value={idx + 1}>{m}</Option>
                ))}
              </Select>
            </Col>
            <Col flex="auto">
              <Input
                id="filter-indicator"
                placeholder="搜索指标名称..."
                value={filterIndicator}
                onChange={(e) => setFilterIndicator(e.target.value)}
                allowClear
                size="small"
                style={{ maxWidth: 220 }}
              />
            </Col>
            <Col>
              <Button size="small" icon={<ReloadOutlined />} onClick={resetFilters}>
                重置
              </Button>
            </Col>

            {/* Action buttons */}
            <Col style={{ marginLeft: 'auto' }}>
              <Space size={8}>
                {selectedRowKeys.length > 0 && (
                  <Badge count={selectedRowKeys.length} size="small">
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={handleBatchDelete}
                      id="btn-batch-delete"
                    >
                      批量删除
                    </Button>
                  </Badge>
                )}
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={handleDownloadTemplate}
                  id="btn-download-template"
                >
                  下载模板
                </Button>
                <Button
                  size="small"
                  icon={<UploadOutlined />}
                  onClick={() => setImportModalOpen(true)}
                  id="btn-import"
                >
                  导入数据
                </Button>
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setAddModalOpen(true)}
                  id="btn-add"
                  style={{ background: currentMeta.color, borderColor: currentMeta.color }}
                >
                  新增数据
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* ---- Data Table ---- */}
        <Card
          title={
            <Space>
              {currentMeta.icon}
              <span style={{ fontWeight: 600, color: currentMeta.color }}>{currentMeta.label}</span>
              <Tag color={currentMeta.color} style={{ marginLeft: 4 }}>
                共 {filteredData.length} 条
              </Tag>
            </Space>
          }
          style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          styles={{ body: { padding: 0 } }}
        >
          <Table<DataRecord>
            rowKey="id"
            columns={columns}
            dataSource={filteredData}
            size="small"
            scroll={{ x: 900, y: 'calc(100vh - 440px)' }}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total) => `共 ${total} 条`,
              size: 'small',
            }}
            style={{ borderRadius: 10, overflow: 'hidden' }}
          />
        </Card>

        {/* ============================================================
            Add Data Modal
        ============================================================ */}
        <Modal
          title={
            <Space>
              <PlusOutlined style={{ color: currentMeta.color }} />
              <span>新增{currentMeta.label}</span>
            </Space>
          }
          open={addModalOpen}
          onOk={handleAddSubmit}
          onCancel={() => { setAddModalOpen(false); form.resetFields(); }}
          okText="保存"
          cancelText="取消"
          width={520}
          destroyOnHidden
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={{ scope: '区域', year: 2024, month: 1 }}
            style={{ marginTop: 12 }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="年份" name="year" rules={[{ required: true, message: '请选择年份' }]}>
                  <Select id="form-year">
                    {[2020, 2021, 2022, 2023, 2024, 2025].map((y) => (
                      <Option key={y} value={y}>{y}年</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="月份" name="month" rules={[{ required: true, message: '请选择月份' }]}>
                  <Select id="form-month">
                    {MONTHS.map((m, idx) => (
                      <Option key={idx + 1} value={idx + 1}>{m}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="数据范畴" name="scope" rules={[{ required: true }]}>
              <Select
                id="form-scope"
                onChange={(v) => {
                  setFormScope(v as DataScope);
                  form.setFieldValue('indicator', undefined);
                }}
              >
                <Option value="区域">区域</Option>
                <Option value="行业">行业</Option>
                <Option value="产业">产业</Option>
              </Select>
            </Form.Item>
            <Form.Item label="地区/行业/产业名称" name="region" rules={[{ required: true, message: '请输入名称' }]}>
              <Input id="form-region" placeholder="如：贵阳市、黑色金属冶炼、第一产业" />
            </Form.Item>
            <Form.Item label="指标名称" name="indicator" rules={[{ required: true, message: '请选择指标' }]}>
              <Select
                id="form-indicator"
                showSearch
                placeholder="请选择指标"
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {availableIndicators.map((ind) => (
                  <Option key={ind.name} value={ind.name}>
                    {ind.name}（{ind.unit}）
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item label="数值" name="value" rules={[{ required: true, message: '请输入数值' }]}>
              <InputNumber id="form-value" style={{ width: '100%' }} placeholder="请输入数值" />
            </Form.Item>
          </Form>
        </Modal>

        {/* ============================================================
            Import Modal
        ============================================================ */}
        <Modal
          title={
            <Space>
              <UploadOutlined style={{ color: currentMeta.color }} />
              <span>导入{currentMeta.label}</span>
            </Space>
          }
          open={importModalOpen}
          onCancel={() => setImportModalOpen(false)}
          footer={null}
          width={480}
          destroyOnHidden
        >
          <div style={{ padding: '12px 0' }}>
            <div
              style={{
                background: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 13, color: '#389e0d', display: 'block', marginBottom: 4 }}>
                📋 导入格式说明
              </Text>
              <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.8 }}>
                请上传 CSV 格式文件，列顺序为：年份、月份、数据范畴（区域/行业/产业）、地区/行业/产业名称、指标名称、数值、单位。
                可先点击"下载模板"获取标准格式文件。
              </Text>
            </div>
            <Upload.Dragger
              accept=".csv"
              beforeUpload={handleImport}
              showUploadList={false}
              id="upload-dragger"
              style={{ borderRadius: 8 }}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined style={{ fontSize: 36, color: currentMeta.color }} />
              </p>
              <p className="ant-upload-text">点击或拖拽 CSV 文件到此区域</p>
              <p className="ant-upload-hint" style={{ color: '#8c8c8c' }}>
                仅支持 .csv 格式，请确保编码为 UTF-8
              </p>
            </Upload.Dragger>
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <Button icon={<DownloadOutlined />} size="small" onClick={handleDownloadTemplate}>
                下载导入模板
              </Button>
            </div>
          </div>
        </Modal>
      </Content>
    </Layout>
  );
};

export default M01DataManagement;
