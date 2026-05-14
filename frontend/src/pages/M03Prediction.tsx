import React, { useState, useEffect } from 'react';
import { Layout, Card, Form, Select, DatePicker, Button, Row, Col, Table, Typography, message, Tabs, Input } from 'antd';
import ReactECharts from 'echarts-for-react';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import {
  INDUSTRY_LIST,
  SECTOR_LIST,
  REGION_LIST,
} from '../types';

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
  const [loading, setLoading] = useState(false);
  const [predictionData, setPredictionData] = useState<any[]>([]);
  const [accuracySummary, setAccuracySummary] = useState<any[]>([]);

  // --- 数据选择模式相关状态 ---
  const [dataType, setDataType] = useState<string>('产业');
  const [availableFactors, setAvailableFactors] = useState<string[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);

  // 获取可选影响因素列
  const fetchColumns = async (type: string) => {
    try {
      const res = await axios.get('/api/data/columns', { params: { data_type: type } });
      const data = res.data;
      setAvailableFactors(data.factor_columns || []);

      // 默认日期范围：2023年全年
      form.setFieldValue('dateRange', [
        dayjs('2023-01', 'YYYY-MM'),
        dayjs('2023-12', 'YYYY-MM'),
      ]);
      form.setFieldValue('factors', []);
    } catch (err: any) {
      message.error(err?.response?.data?.detail || '获取数据列信息失败');
    }
  };

  // 初始化时加载默认数据类型的列
  useEffect(() => {
    fetchColumns(dataType);
  }, []);

  // Handle form value changes (object selection only affects UI state)
  const handleValuesChange = (_changedValues: any) => {
    // No-op
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
    }

    // 联动数据类型
    const typeMap: Record<string, string> = { sector: '产业', region: '区域', industry: '行业' };
    const newType = typeMap[key] || '产业';
    setDataType(newType);
    fetchColumns(newType);
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    const { dateRange } = values;

    const formData = new FormData();
    formData.append('data_type', dataType);
    formData.append('forecast_periods', '12');

    if (dateRange && dateRange.length === 2) {
      formData.append('date_start', dateRange[0].format('YYYY-MM'));
      formData.append('date_end', dateRange[1].format('YYYY-MM'));
    }

    try {
      const res = await axios.post('/api/prediction', formData);
      const data = res.data;
      const comparison = data.comparison || [];
      const forecasts = data.forecasts || [];
      const targets: string[] = data.target_columns || [];
      setSelectedTargets(targets);

      setAccuracySummary(data.accuracy_summary || []);

      if (comparison.length > 0) {
        // 有实际值对比
        const rows = comparison.map((item: any) => {
          const row: any = { date: item.date };
          for (const col of targets) {
            row[`${col}_pred`] = item[`${col}_pred`];
            row[`${col}_actual`] = item[`${col}_actual`];
          }
          const rowAccs = targets
            .map((c: string) => item[`${c}_monthly_accuracy`])
            .filter((v: any) => v != null) as number[];
          row.accuracy = rowAccs.length > 0
            ? rowAccs.reduce((a: number, b: number) => a + b, 0) / rowAccs.length
            : null;
          return row;
        });
        setPredictionData(rows);
      } else {
        // 仅预测值
        const rows = forecasts.map((f: any) => {
          const row: any = { date: f.date };
          for (const col of targets) {
            row[`${col}_pred`] = f[`${col}_pred`];
            row[`${col}_actual`] = null;
          }
          return row;
        });
        setPredictionData(rows);
      }
      message.success(`预测完成，共预测 ${targets.length} 个指标`);
    } catch (err: any) {
      message.error(err?.response?.data?.detail || '预测请求失败');
    } finally {
      setLoading(false);
    }
  };

  const getMainChartOption = () => {
    if (predictionData.length === 0) return {};

    const isRate = (col: string) => col.includes('%') || col.includes('增速') || col.includes('率') || col.includes('PPI') || col.includes('CPI');
    const series: any[] = selectedTargets.map(col => ({
      name: col,
      type: 'line',
      data: predictionData.map(item => item[`${col}_pred`]),
      smooth: true,
      yAxisIndex: isRate(col) ? 1 : 0,
    }));
    // 如果有实际值，也加入
    const hasActuals = predictionData.some(d => selectedTargets.some(c => d[`${c}_actual`] != null));
    if (hasActuals) {
      for (const col of selectedTargets) {
        series.push({
          name: `${col}(实际)`,
          type: 'line',
          data: predictionData.map(item => item[`${col}_actual`]),
          smooth: true,
          lineStyle: { type: 'dashed' },
          yAxisIndex: isRate(col) ? 1 : 0,
        });
      }
    }
    return {
      title: { text: '经济指标预测趋势' },
      tooltip: { trigger: 'axis' },
      legend: { data: series.map((s: any) => s.name), bottom: 0, type: 'scroll' },
      xAxis: { type: 'category', data: predictionData.map(d => d.date) },
      yAxis: [
        { type: 'value', axisLine: { show: true }, splitLine: { show: true } },
        { type: 'value', axisLine: { show: true }, splitLine: { show: false }, axisLabel: { formatter: '{value}%' } },
      ],
      series,
    };
  };

  const getDetailChartOption = (col: string) => {
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
          data: predictionData.map(d => d[`${col}_actual`])
        },
        {
          name: '预测值',
          type: 'line',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: predictionData.map(d => d[`${col}_pred`]),
          lineStyle: { type: 'dashed' }
        },
        {
          name: '误差',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: predictionData.map(d => {
            const act = d[`${col}_actual`];
            const pred = d[`${col}_pred`];
            return act != null && pred != null ? act - pred : null;
          }),
          itemStyle: {
            color: (params: any) => params.value > 0 ? '#ff4d4f' : '#1890ff'
          }
        }
      ]
    };
  };

  const getSummaryTableData = () => {
    if (predictionData.length === 0) return [];

    return predictionData.map(row => ({
      ...row,
      accuracy: row.accuracy != null ? row.accuracy.toFixed(2) + '%' : '-',
    }));
  };

  const summaryColumns: any[] = (() => {
    const isRate = (col: string) => col.includes('%') || col.includes('增速') || col.includes('率') || col.includes('PPI') || col.includes('CPI');
    return [
      { title: '日期', dataIndex: 'date', key: 'date', fixed: 'left' as const, width: 120 },
      ...selectedTargets.map(col => ({
        title: col,
        children: [
          {
            title: '预测值',
            dataIndex: `${col}_pred`,
            key: `${col}_pred`,
            width: 110,
            render: (val: number) => val != null ? (isRate(col) ? val?.toFixed(2) : val?.toFixed(1)) : '-',
          },
          {
            title: '实际值',
            dataIndex: `${col}_actual`,
            key: `${col}_actual`,
            width: 110,
            render: (val: number) => val != null ? (isRate(col) ? val?.toFixed(2) : val?.toFixed(1)) : '-',
          },
        ],
      })),
      { title: '综合精准度', dataIndex: 'accuracy', key: 'accuracy', fixed: 'right' as const, width: 100 },
    ];
  })();

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
    <Layout style={{ height: 'calc(100vh - 64px)', background: '#F5F7FA' }}>
      <Sider
        width={340}
        theme="light"
        style={{ padding: '0', borderRight: '1px solid #E2E5F2', overflowY: 'auto', background: '#fff' }}
        breakpoint="lg"
        collapsedWidth="0"
      >
        <div style={{ padding: '24px 24px 0 24px' }}>
          <Title level={4} style={{ color: '#000409', fontWeight: 'bold' }}>预测配置</Title>

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
            object: '第一产业',
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
            <Select mode="multiple" placeholder="选择影响因素" style={{ width: '100%' }} showSearch allowClear maxTagCount={3}>
              {availableFactors.map(f => (
                <Option key={f} value={f}>{f}</Option>
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
            {/* 精准度汇总 */}
            {accuracySummary.length > 0 && (
              <Col span={24}>
                <Card title="精准度汇总">
                  <Table
                    dataSource={accuracySummary}
                    columns={[
                      { title: '预测指标', dataIndex: 'indicator', key: 'indicator' },
                      { title: '精准度', dataIndex: 'accuracy', key: 'accuracy', render: (v: number | null) => v != null ? v.toFixed(2) + '%' : '-' },
                    ]}
                    rowKey="indicator"
                    bordered
                    size="small"
                    pagination={false}
                  />
                </Card>
              </Col>
            )}
            <Col span={24}>
              <Card>
                <ReactECharts option={getMainChartOption()} style={{ height: 400, width: '100%' }} />
              </Card>
            </Col>

            <Col span={24}>
              <Card title="详细对比分析">
                <Tabs items={selectedTargets.map((key: string) => ({
                  key,
                  label: key,
                  children: <ReactECharts option={getDetailChartOption(key)} style={{ height: 350, width: '100%' }} />
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
            请在左侧配置参数并点击"开始预测"
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default M03Prediction;
