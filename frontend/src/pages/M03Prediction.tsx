import React, { useState } from 'react';
import { Layout, Card, Form, Select, DatePicker, Button, Row, Col, Table, Typography, message, Tabs, Input, Cascader, Checkbox } from 'antd';
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
import { generateDates, generatePredictionData, calculateAccuracy } from '../utils/mockData';

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
const M03Prediction: React.FC = () => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('sector');
  const [currentObject, setCurrentObject] = useState<string>('第一产业'); // Default for sector
  const [loading, setLoading] = useState(false);
  const [predictionData, setPredictionData] = useState<any[]>([]);

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
    form.resetFields(['object', 'factors']);
    setPredictionData([]);

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
    const { dateRange, factors } = values;

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

    const start = dateRange[0].format('YYYY-MM');
    const end = dateRange[1].format('YYYY-MM');
    const dates = generateDates(start, end);

    setTimeout(() => {
      const data = generatePredictionData(dates);
      setPredictionData(data);
      setLoading(false);
      message.success('预测完成');
    }, 1000);
  };

  const getMainChartOption = () => {
    if (predictionData.length === 0) return {};

    const indicators = getCurrentIndicators();
    const series = indicators.map(ind => {
      const isPercentage = ind.unit.includes('%');
      return {
        name: ind.label,
        type: 'line',
        data: predictionData.map(item => item[`${ind.key}_pred`]),
        smooth: true,
        yAxisIndex: isPercentage ? 1 : 0
      };
    });

    return {
      title: { text: '经济指标预测趋势' },
      tooltip: { trigger: 'axis' },
      legend: { data: indicators.map(i => i.label), bottom: 0 },
      xAxis: { type: 'category', data: predictionData.map(d => d.date) },
      yAxis: [
        {
          type: 'value',
          axisLine: { show: true },
          splitLine: { show: true }
        },
        {
          type: 'value',
          axisLine: { show: true },
          splitLine: { show: false },
          axisLabel: { formatter: '{value}%' }
        }
      ],
      series
    };
  };

  const getDetailChartOption = (indicatorKey: string) => {
    if (predictionData.length === 0) return {};

    const dates = predictionData.map(d => d.date);

    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['真实值', '预测值', '误差'], bottom: 0 },
      grid: [
        { left: '3%', right: '55%', bottom: '10%', containLabel: true },
        { left: '55%', right: '3%', bottom: '10%', containLabel: true }
      ],
      xAxis: [
        { type: 'category', data: dates, gridIndex: 0 },
        { type: 'category', data: dates, gridIndex: 1 }
      ],
      yAxis: [
        { type: 'value', name: '数值', gridIndex: 0 },
        { type: 'value', name: '误差', gridIndex: 1 }
      ],
      series: [
        {
          name: '真实值',
          type: 'line',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: predictionData.map(d => d[`${indicatorKey}_actual`])
        },
        {
          name: '预测值',
          type: 'line',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: predictionData.map(d => d[`${indicatorKey}_pred`]),
          lineStyle: { type: 'dashed' }
        },
        {
          name: '误差',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: predictionData.map(d => d[`${indicatorKey}_actual`] - d[`${indicatorKey}_pred`]),
          itemStyle: {
            color: (params: any) => params.value > 0 ? '#ff4d4f' : '#1890ff'
          }
        }
      ]
    };
  };

  const getSummaryTableData = () => {
    if (predictionData.length === 0) return [];

    const indicators = getCurrentIndicators();
    // Calculate overall accuracy per row (average of current indicators)
    return predictionData.map(row => {
      const accuracies = indicators.map(ind =>
        calculateAccuracy(row[`${ind.key}_actual`], row[`${ind.key}_pred`])
      );
      const avgAccuracy = accuracies.length > 0 
        ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length
        : 0;

      return {
        ...row,
        accuracy: avgAccuracy.toFixed(2) + '%'
      };
    });
  };

  const summaryColumns: any[] = [
    { title: '日期', dataIndex: 'date', key: 'date', fixed: 'left' as const, width: 120 },
    ...getCurrentIndicators()
      .map(ind => ({
        title: `${ind.label} (${ind.unit})`,
        children: [
          {
            title: '真实值',
            dataIndex: `${ind.key}_actual`,
            key: `${ind.key}_actual`,
            width: 100,
            render: (val: number) => val?.toFixed(1)
          },
          {
            title: '预测值',
            dataIndex: `${ind.key}_pred`,
            key: `${ind.key}_pred`,
            width: 100,
            render: (val: number) => <span style={{ color: '#1890ff', fontWeight: 'bold' }}>{val?.toFixed(1)}</span>
          }
        ]
      })),
    { title: '综合精准度', dataIndex: 'accuracy', key: 'accuracy', fixed: 'right' as const, width: 100 }
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
          <Title level={4}>预测配置</Title>
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
            object: '贵阳市',
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

          <Form.Item name="factors" label="影响因素">
            <Select mode="multiple" placeholder="选择影响因素" style={{ width: '100%' }}>
              {getCurrentFactors().map(f => (
                <Option key={f.name} value={f.name}>{f.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              开始预测
            </Button>
          </Form.Item>
        </Form>
      </Sider>
      <Content style={{ padding: '24px', overflowY: 'auto', flex: 1, minWidth: 0 }}>
        <Title level={4}>预测结果</Title>
        {predictionData.length > 0 ? (
          <Row gutter={[16, 16]}>
            <Col span={24}>
              <Card>
                <ReactECharts option={getMainChartOption()} style={{ height: 400, width: '100%' }} />
              </Card>
            </Col>

            <Col span={24}>
              <Card title="详细对比分析">
                <Tabs items={getCurrentIndicators()
                  .map(ind => ({
                    key: ind.key,
                    label: ind.label,
                    children: <ReactECharts option={getDetailChartOption(ind.key)} style={{ height: 350, width: '100%' }} />
                  }))} />
              </Card>
            </Col>

            <Col span={24}>
              <Card title="预测结果汇总表">
                <Table
                  dataSource={getSummaryTableData()}
                  columns={summaryColumns}
                  rowKey="date"
                  scroll={{ x: true }}
                />
              </Card>
            </Col>
          </Row>
        ) : (
          <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
            请在左侧配置参数并点击“开始预测”
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default M03Prediction;
