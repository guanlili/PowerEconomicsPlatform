import React, { useState } from 'react';
import { Layout, Card, Form, Select, DatePicker, Button, Checkbox, Row, Col, Table, Typography, message, Tabs, Input, Cascader } from 'antd';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import {
  INDUSTRY_LIST,
  ECONOMIC_INDICATORS,
  REGION_FACTORS,
  SECTOR_FACTORS_MAP,
  INDUSTRY_FACTORS_MAP,
  SECTOR_LIST,
  REGION_LIST,
  REGION_ECONOMIC_INDICATORS,
  INDUSTRY_ECONOMIC_INDICATORS,
  SECTOR_ECONOMIC_INDICATORS
} from '../types';
import type { FactorConfig } from '../types';
import { generateDates, generateFactorData, generateCorrelationMatrix } from '../utils/mockData';

const { Sider, Content } = Layout;
const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const MONTHS_CN = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

const monthCellRender = (date: any) => {
  return (
    <div className="ant-picker-cell-inner">
      {MONTHS_CN[date.month()]}
    </div>
  );
};
const M02Analysis: React.FC = () => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('sector');
  const [currentObject, setCurrentObject] = useState<string>('第一产业'); // Default for sector
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [correlationData, setCorrelationData] = useState<any[]>([]);
  const [selectedFactors, setSelectedFactors] = useState<string[]>([]);
  const [selectedEconomicVars, setSelectedEconomicVars] = useState<string[]>([]);

  // Get current indicators based on active tab
  const getCurrentIndicators = () => {
    switch (activeTab) {
      case 'region': return REGION_ECONOMIC_INDICATORS;
      case 'industry': return INDUSTRY_ECONOMIC_INDICATORS;
      case 'sector': return SECTOR_ECONOMIC_INDICATORS;
      default: return REGION_ECONOMIC_INDICATORS;
    }
  };

  // Get current factors config based on active tab and selected object
  const getCurrentFactors = (): FactorConfig[] => {
    switch (activeTab) {
      case 'region': return REGION_FACTORS;
      case 'industry': return (currentObject && INDUSTRY_FACTORS_MAP[currentObject]) ? INDUSTRY_FACTORS_MAP[currentObject] : [];
      case 'sector': return (currentObject && SECTOR_FACTORS_MAP[currentObject]) ? SECTOR_FACTORS_MAP[currentObject] : [];
      default: return REGION_FACTORS;
    }
  };

  // Handle form value changes to update current object state
  const handleValuesChange = (changedValues: any) => {
    if (changedValues.object) {
      setCurrentObject(changedValues.object);
      // Reset selected factors when object changes because factor list changes
      form.setFieldValue('factors', []);
    }
  };

  // Reset form fields when tab changes
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    form.resetFields(['object', 'factors', 'economicVars']);
    setChartData([]);
    setCorrelationData([]);

    // Set default object for the new tab to improve UX
    let defaultObject = '';
    if (key === 'sector') defaultObject = SECTOR_LIST[0];
    if (key === 'industry') defaultObject = INDUSTRY_LIST[0];
    if (key === 'region') defaultObject = REGION_LIST[0];

    if (defaultObject) {
      form.setFieldValue('object', defaultObject);
      setCurrentObject(defaultObject);
    }
  };

  const onFinish = (values: any) => {
    setLoading(true);
    const { dateRange, factors, economicVars } = values;

    if (!dateRange || dateRange.length !== 2) {
      message.error('请选择时间范围');
      setLoading(false);
      return;
    }

    if (!factors || factors.length === 0) {
      message.error('请选择至少一个影响因素');
      setLoading(false);
      return;
    }

    if (!economicVars || economicVars.length === 0) {
      message.error('请选择至少一个目标经济变量');
      setLoading(false);
      return;
    }

    const start = dateRange[0].format('YYYY-MM');
    const end = dateRange[1].format('YYYY-MM');
    const dates = generateDates(start, end);

    // Mock API call delay
    setTimeout(() => {
      const allKeys = [...factors, ...economicVars];
      const factorData = generateFactorData(dates, allKeys);
      const corrMatrix = generateCorrelationMatrix(factors, economicVars);

      setChartData(factorData);
      setCorrelationData(corrMatrix);
      setSelectedFactors(factors);
      setSelectedEconomicVars(economicVars);
      setLoading(false);
      message.success('分析完成');
    }, 500);
  };

  const getChartOption = () => {
    if (chartData.length === 0) return {};

    const currentFactors = getCurrentFactors();
    const currentIndicators = getCurrentIndicators();

    return {
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: [
          ...selectedFactors.map(f => currentFactors.find(rf => rf.name === f)?.label || f),
          ...selectedEconomicVars.map(e => currentIndicators.find(ei => ei.key === e)?.label || e)
        ]
      },
      xAxis: {
        type: 'category',
        data: chartData.map(item => item.date)
      },
      yAxis: [
        {
          type: 'value',
          position: 'left',
          axisLine: { show: true, lineStyle: { color: '#5470C6' } }
        },
        {
          type: 'value',
          position: 'right',
          axisLine: { show: true, lineStyle: { color: '#EE6666' } },
          splitLine: { show: false },
          axisLabel: { formatter: '{value}%' }
        }
      ],
      series: [
        ...selectedFactors.map(factor => {
          const config = currentFactors.find(f => f.name === factor);
          const isPercentage = config?.unit.includes('%');
          return {
            name: config?.label || factor,
            type: 'line',
            data: chartData.map(item => item[factor]),
            smooth: true,
            yAxisIndex: isPercentage ? 1 : 0
          };
        }),
        ...selectedEconomicVars.map(ev => {
          const config = currentIndicators.find(e => e.key === ev);
          const isPercentage = config?.unit.includes('%');
          return {
            name: config?.label || ev,
            type: 'line',
            data: chartData.map(item => item[ev]),
            smooth: true,
            yAxisIndex: isPercentage ? 1 : 0,
            lineStyle: { type: 'dashed' }
          };
        })
      ]
    };
  };

  const currentFactors = getCurrentFactors();

  const factorColumns = [
    { title: '日期', dataIndex: 'date', key: 'date', fixed: 'left' as const, width: 120 },
    ...selectedFactors.map(f => {
      const config = currentFactors.find(rf => rf.name === f);
      return {
        title: `${config?.label} (${config?.unit})`,
        dataIndex: f,
        key: f,
        render: (value: number) => value?.toFixed(2)
      };
    }),
    ...selectedEconomicVars.map(e => {
      const config = getCurrentIndicators().find(ei => ei.key === e);
      const label = config?.label || e;
      return {
        title: `${label} (目标变量)`,
        dataIndex: e,
        key: e,
        render: (value: number) => <span style={{ color: '#EE6666' }}>{value?.toFixed(2)}{config?.unit.includes('%') ? '%' : ''}</span>
      };
    })
  ];

  const correlationColumns = [
    {
      title: '经济指标', dataIndex: 'indicator', key: 'indicator',
      render: (text: string) => getCurrentIndicators().find(e => e.key === text)?.label || text
    },
    ...selectedFactors.map(f => {
      const config = currentFactors.find(rf => rf.name === f);
      return {
        title: config?.label || f,
        dataIndex: f,
        key: f,
        render: (value: string) => {
          const val = parseFloat(value);
          const color = val > 0 ? 'red' : 'green';
          return <span style={{ color }}>{value}</span>;
        }
      };
    })
  ];

  const renderObjectSelector = () => {
    switch (activeTab) {
      case 'region':
        return (
          <Form.Item name="object" label="区域选择" rules={[{ required: true, message: '请选择区域' }]}>
            <Select placeholder="请选择市/州">
              {REGION_LIST.map(city => <Option key={city} value={city}>{city}</Option>)}
            </Select>
          </Form.Item>
        );
      case 'industry':
        return (
          <Form.Item name="object" label="行业选择" rules={[{ required: true, message: '请选择行业' }]}>
            <Select placeholder="请选择行业">
              {INDUSTRY_LIST.map(ind => <Option key={ind} value={ind}>{ind}</Option>)}
            </Select>
          </Form.Item>
        );
      case 'sector':
        return (
          <Form.Item name="object" label="产业选择" rules={[{ required: true, message: '请选择产业' }]}>
            <Select placeholder="请选择产业">
              {SECTOR_LIST.map(sec => <Option key={sec} value={sec}>{sec}</Option>)}
            </Select>
          </Form.Item>
        );
      default:
        return null;
    }
  };

  return (
    <Layout style={{ height: 'calc(100vh - 64px)' }}>
      <Sider
        width={340}
        theme="light"
        style={{ padding: '0', borderRight: '1px solid #f0f0f0', overflowY: 'auto' }}
        breakpoint="lg"
        collapsedWidth="0"
      >
        <div style={{ padding: '24px 24px 0 24px' }}>
          <Title level={4}>分析配置</Title>
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            items={[
              { key: 'sector', label: '产业' },
              { key: 'region', label: '区域' },
              { key: 'industry', label: '行业' },
            ]}
          />
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          onValuesChange={handleValuesChange}
          style={{ padding: '0 24px 24px 24px' }}
          initialValues={{
            province: '贵州省',
            object: '请选择',
            dateRange: [dayjs('2023-01', 'YYYY-MM'), dayjs('2023-12', 'YYYY-MM')],
            factors: []
          }}
        >
          <Form.Item name="province" label="省份">
            <Input disabled />
          </Form.Item>

          {renderObjectSelector()}

          <Form.Item name="dateRange" label="时间范围">
            <RangePicker
              picker="month"
              style={{ width: '100%' }}
              format="YYYY年MM月"
              monthCellRender={monthCellRender}
              placeholder={['开始月份', '结束月份']}
            />
          </Form.Item>

          <Form.Item name="economicVars" label="目标经济变量">
            <Checkbox.Group style={{ display: 'flex', flexDirection: 'column' }}>
              {getCurrentIndicators().map(ind => (
                <Checkbox key={ind.key} value={ind.key} style={{ marginLeft: 0 }}>
                  {ind.label}
                </Checkbox>
              ))}
            </Checkbox.Group>
          </Form.Item>

          <Form.Item name="factors" label="影响因素">
            <Select mode="multiple" placeholder="选择影响因素" style={{ width: '100%' }}>
              {getCurrentFactors().map(f => (
                <Option key={f.name} value={f.name}>{f.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              计算相关性
            </Button>
          </Form.Item>
        </Form>
      </Sider>
      <Content style={{ padding: '24px', overflowY: 'auto', flex: 1, minWidth: 0 }}>
        <Title level={4}>分析结果</Title>
        {chartData.length > 0 ? (
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Card title="趋势分析 (双轴折线图)">
                <ReactECharts option={getChartOption()} style={{ height: 400, width: '100%' }} />
              </Card>
            </Col>
            <Col span={24}>
              <Card title="相关性矩阵 (Pearson)">
                <Table
                  dataSource={correlationData}
                  columns={correlationColumns}
                  pagination={false}
                  rowKey="indicator"
                  bordered
                  size="small"
                />
              </Card>
            </Col>
            <Col span={24}>
              <Card title="原始数据">
                <Table
                  dataSource={chartData}
                  columns={factorColumns}
                  rowKey="date"
                  scroll={{ x: true }}
                />
              </Card>
            </Col>
          </Row>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
            请在左侧配置参数并点击“计算相关性”
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default M02Analysis;
