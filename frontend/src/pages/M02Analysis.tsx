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
const M02Analysis: React.FC = () => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('sector');
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [correlationData, setCorrelationData] = useState<any[]>([]);
  const [selectedFactors, setSelectedFactors] = useState<string[]>([]);
  const [selectedEconomicVars, setSelectedEconomicVars] = useState<string[]>([]);

  // --- 数据选择模式相关状态 ---
  const [dataType, setDataType] = useState<string>('产业');
  const [availableColumns, setAvailableColumns] = useState<{target_columns: string[], factor_columns: string[], date_range: string[]}>({target_columns: [], factor_columns: [], date_range: []});

  // 获取列名和日期范围
  const fetchColumns = async (type: string) => {
    try {
      const res = await axios.get('/api/data/columns', { params: { data_type: type } });
      const data = res.data;
      setAvailableColumns({
        target_columns: data.target_columns || [],
        factor_columns: data.factor_columns || [],
        date_range: data.date_range || [],
      });
      // 默认日期范围：2023年全年
      form.setFieldValue('dateRange', [
        dayjs('2023-01', 'YYYY-MM'),
        dayjs('2023-12', 'YYYY-MM'),
      ]);
    } catch (err: any) {
      message.error(err?.response?.data?.detail || '获取列信息失败');
    }
  };

  // 初始加载
  useEffect(() => {
    fetchColumns(dataType);
  }, []);

  // 选中的目标经济变量（直接使用完整列名）
  const [selectedEconomicTargets, setSelectedEconomicTargets] = useState<string[]>([]);

  // Handle form value changes to update current object state
  const handleValuesChange = (_changedValues: any) => {
    // No-op: factors are now selected from API columns directly
  };

  // Reset form fields when tab changes
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    form.resetFields(['object', 'factors']);
    setChartData([]);
    setCorrelationData([]);
    setSelectedEconomicTargets([]);

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
    const { dateRange, factors } = values;

    // 基础验证：使用完整列名
    if (!selectedEconomicTargets || selectedEconomicTargets.length === 0) {
      message.error('请选择至少一个目标经济变量');
      setLoading(false);
      return;
    }
    if (!factors || factors.length === 0) {
      message.error('请选择至少一个影响因素');
      setLoading(false);
      return;
    }

    // factors 已经是完整列名
    const factorLabels = factors as string[];

    try {
      // 对每个选中的经济指标分别发送请求
      const requests = selectedEconomicTargets.map((targetCol) => {
        const formData = new FormData();
        formData.append('data_type', dataType);
        formData.append('target_col', targetCol);
        formData.append('factor_cols', JSON.stringify(factorLabels));
        formData.append('top_n', '20');

        // 传递前端选择的时间范围
        if (dateRange && dateRange.length === 2) {
          formData.append('date_start', dateRange[0].format('YYYY-MM'));
          formData.append('date_end', dateRange[1].format('YYYY-MM'));
        }

        return axios.post('/api/analysis', formData);
      });

      const responses = await Promise.all(requests);

      // 聚合所有响应结果
      const allCorrRows: any[] = [];
      const allFactorSet = new Set<string>();
      let mergedChartData: Record<string, any> = {}; // 按 date 合并
      let totalFeatures = 0;
      let totalDataPoints = 0;
      let hasValidResult = false;

      responses.forEach((res, idx) => {
        const data = res.data;
        const scores: any[] = data.scores || [];
        const targetCol = selectedEconomicTargets[idx];

        if (scores.length === 0) return;
        hasValidResult = true;

        totalFeatures = Math.max(totalFeatures, data.feature_count || 0);
        totalDataPoints = Math.max(totalDataPoints, data.data_points || 0);

        // 相关性矩阵：每个经济指标一行
        allCorrRows.push({
          indicator: targetCol,
          ...Object.fromEntries(scores.map((s: any) => [s.variable, s.avg_score?.toFixed(4) || 'N/A'])),
        });

        // 收集所有出现的因素变量（取前8个）
        scores.slice(0, 8).forEach((s: any) => allFactorSet.add(s.variable));

        // 合并 table_data（按 date 键合并多个目标的数据）
        const tableRows: any[] = data.table_data || [];
        tableRows.forEach((row: any) => {
          const date = row.date;
          if (!mergedChartData[date]) {
            mergedChartData[date] = { date };
          }
          // 将当前行所有字段合并进去
          Object.keys(row).forEach((key) => {
            if (key !== 'date') {
              mergedChartData[date][key] = row[key];
            }
          });
        });
      });

      if (!hasValidResult) {
        message.warning('未计算出相关性得分，请检查选择的列是否有效');
        setLoading(false);
        return;
      }

      // 按日期排序后设置图表数据
      const sortedChartData = Object.values(mergedChartData).sort((a: any, b: any) =>
        a.date.localeCompare(b.date)
      );
      setChartData(sortedChartData);
      setCorrelationData(allCorrRows);
      setSelectedFactors(Array.from(allFactorSet));
      setSelectedEconomicVars([...selectedEconomicTargets]);

      const targetNames = selectedEconomicTargets.join('、');
      message.success(`分析完成，目标: ${targetNames}，分析 ${totalFeatures} 个特征，${totalDataPoints} 条数据`);
    } catch (err: any) {
      message.error(err?.response?.data?.detail || '分析请求失败');
    } finally {
      setLoading(false);
    }
  };

  const getChartOption = () => {
    if (chartData.length === 0) return {};

    const dataKeys = Object.keys(chartData[0]).filter(k => k !== 'date');
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: dataKeys, top: 0 },
      grid: { left: 60, right: 30, top: 40, bottom: 40 },
      xAxis: {
        type: 'category',
        data: chartData.map((item: any) => item.date),
        axisLabel: { rotate: 30 },
      },
      yAxis: { type: 'value', name: '数值' },
      series: dataKeys.map((key, i) => ({
        name: key,
        type: 'line',
        data: chartData.map((item: any) => item[key]),
        smooth: true,
        lineStyle: i === 0 ? { width: 2.5 } : undefined,
      })),
    };
  };

  const factorColumns = [
    { title: '日期', dataIndex: 'date', key: 'date', fixed: 'left' as const, width: 120 },
    ...selectedEconomicVars.map(e => ({
      title: `${e}（目标变量）`,
      dataIndex: e,
      key: e,
      render: (value: number) => <span style={{ color: '#EE6666', fontWeight: 500 }}>{value != null ? value.toFixed(2) : '-'}</span>
    })),
    ...selectedFactors.map(f => {
      return {
        title: f,
        dataIndex: f,
        key: f,
        render: (value: number) => value != null ? value.toFixed(2) : '-'
      };
    }),
  ];

  const correlationColumns = [
    {
      title: '经济指标', dataIndex: 'indicator', key: 'indicator',
      render: (text: string) => text
    },
    ...selectedFactors.map(f => {
      return {
        title: f,
        dataIndex: f,
        key: f,
        render: (value: string) => {
          const val = parseFloat(value);
          if (isNaN(val)) return <span>{value}</span>;
          const color = val > 0 ? '#cf1322' : '#389e0d';
          return <span style={{ color, fontWeight: 500 }}>{value}</span>;
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
    <Layout style={{ height: 'calc(100vh - 64px)', background: '#F5F7FA' }}>
      <Sider
        width={340}
        theme="light"
        style={{ padding: '0', borderRight: '1px solid #E2E5F2', overflowY: 'auto', background: '#fff' }}
        breakpoint="lg"
        collapsedWidth="0"
      >
        <div style={{ padding: '24px 24px 0 24px' }}>
          <Title level={4} style={{ color: '#000409', fontWeight: 'bold' }}>分析配置</Title>

          <div style={{ marginBottom: 16 }}>
            <Tabs
              activeKey={activeTab}
              onChange={handleTabChange}
              items={[
                { key: 'sector', label: '产业' },
                { key: 'region', label: '区域' },
                { key: 'industry', label: '行业' },
              ]}
            />
            {availableColumns.target_columns.length > 0 && (
              <div style={{ fontSize: 12, color: '#999' }}>
                已加载 {availableColumns.target_columns.length} 个目标列，{availableColumns.factor_columns.length} 个因素列
              </div>
            )}
          </div>
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

          <Form.Item label="目标经济变量">
            <Select
              mode="multiple"
              placeholder="选择目标经济变量"
              style={{ width: '100%' }}
              value={selectedEconomicTargets}
              onChange={(vals) => setSelectedEconomicTargets(vals)}
              allowClear
              showSearch
              maxTagCount={3}
              options={availableColumns.target_columns.map(c => ({ label: c, value: c }))}
            />
          </Form.Item>

          <Form.Item name="factors" label="影响因素">
            <Select mode="multiple" placeholder="选择影响因素" style={{ width: '100%' }} showSearch allowClear maxTagCount={3}>
              {availableColumns.factor_columns.map(f => (
                <Option key={f} value={f}>{f}</Option>
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
              <Card title="趋势分析">
                <ReactECharts option={getChartOption()} style={{ height: 400, width: '100%' }} />
              </Card>
            </Col>
            <Col span={24}>
              <Card title="相关性矩阵 (平均得分)">
                <Table
                  dataSource={correlationData}
                  columns={correlationColumns}
                  pagination={false}
                  rowKey="indicator"
                  bordered
                  size="small"
                  scroll={{ x: true }}
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
            请在左侧配置参数并点击"计算相关性"
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default M02Analysis;
