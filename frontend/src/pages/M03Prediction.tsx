import React, { useState, useRef } from 'react';
import { Layout, Card, Form, Select, DatePicker, Button, Row, Col, Table, Typography, message, Tabs, Input, Upload, Collapse } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload';
import ReactECharts from 'echarts-for-react';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import {
  INDUSTRY_LIST,
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
  const [accuracySummary, setAccuracySummary] = useState<any[]>([]);

  // --- 文件上传模式相关状态 ---
  const [historyFileList, setHistoryFileList] = useState<UploadFile[]>([]);
  const [actualFileList, setActualFileList] = useState<UploadFile[]>([]);
  const [uploadColumns, setUploadColumns] = useState<string[]>([]);
  const [uploadTargets, setUploadTargets] = useState<string[]>([]);
  const [uploadMode, setUploadMode] = useState(false);
  const historyFileRef = useRef<File | null>(null);
  const actualFileRef = useRef<File | null>(null);

  // 上传历史数据文件后获取列名
  const handleHistoryUpload = async (info: any) => {
    const { fileList: newFileList } = info;

    if (newFileList.length === 0) {
      setHistoryFileList([]);
      setUploadColumns([]);
      setUploadTargets([]);
      setUploadMode(false);
      historyFileRef.current = null;
      return;
    }

    setHistoryFileList(newFileList.slice(-1));

    const latestFile = newFileList[newFileList.length - 1];
    const rawFile: File | undefined = latestFile?.originFileObj ?? latestFile;
    if (rawFile && rawFile instanceof File && rawFile.size > 0) {
      historyFileRef.current = rawFile;
      const formData = new FormData();
      formData.append('file', rawFile);
      try {
        const res = await axios.post('/api/columns', formData);
        setUploadColumns(res.data.columns || []);
        setUploadTargets([]);
        setUploadMode(false);

        // 自动设置日期范围（根据 Excel 中的实际数据）
        if (res.data.date_range && res.data.date_range.length === 2) {
          form.setFieldValue('dateRange', [
            dayjs(res.data.date_range[0], 'YYYY-MM'),
            dayjs(res.data.date_range[1], 'YYYY-MM'),
          ]);
        }

        message.success('历史数据文件上传成功，请选择预测目标指标');
      } catch (err: any) {
        message.error(err?.response?.data?.detail || '获取列名失败');
      }
    }
  };

  const handleActualUpload = (info: any) => {
    const { fileList: newFileList } = info;
    setActualFileList(newFileList.slice(-1));
    if (newFileList.length > 0) {
      const latestFile = newFileList[newFileList.length - 1];
      const rawFile: File | undefined = latestFile?.originFileObj ?? latestFile;
      if (rawFile && rawFile instanceof File) {
        actualFileRef.current = rawFile;
      }
    } else {
      actualFileRef.current = null;
    }
  };

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

  const onFinish = async (values: any) => {
    setLoading(true);

    // --- 上传模式：调用真实API ---
    if (uploadMode && historyFileRef.current && uploadTargets.length > 0) {
      const { dateRange } = values;
      const formData = new FormData();
      formData.append('history_file', historyFileRef.current);
      if (actualFileRef.current) {
        formData.append('actual_file', actualFileRef.current);
      }
      formData.append('target_columns', JSON.stringify(uploadTargets));
      formData.append('forecast_periods', '12');

      // 传递前端选择的时间范围
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
      return;
    }

    // --- 原有 Mock 数据模式 ---
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

    // 上传模式
    if (uploadMode && uploadTargets.length > 0) {
      const isRate = (col: string) => col.includes('%') || col.includes('增速') || col.includes('率') || col.includes('PPI') || col.includes('CPI');
      const series: any[] = uploadTargets.map(col => ({
        name: col,
        type: 'line',
        data: predictionData.map(item => item[`${col}_pred`]),
        smooth: true,
        yAxisIndex: isRate(col) ? 1 : 0,
      }));
      // 如果有实际值，也加入
      const hasActuals = predictionData.some(d => uploadTargets.some(c => d[`${c}_actual`] != null));
      if (hasActuals) {
        for (const col of uploadTargets) {
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
    }

    // Mock 模式
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
          min: 0,
          max: 120,
          axisLine: { show: true },
          splitLine: { show: false },
          axisLabel: { formatter: '{value}%' }
        }
      ],
      series
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

    // 上传模式
    if (uploadMode && uploadTargets.length > 0) {
      return predictionData.map(row => ({
        ...row,
        accuracy: row.accuracy != null ? row.accuracy.toFixed(2) + '%' : '-',
      }));
    }

    // Mock 模式
    const indicators = getCurrentIndicators();
    // Check if we're dealing with Guiyang 2023 data (exact dates)
    const isGuiyang2023Data = predictionData.length === 12 && 
      predictionData[0]?.date === '2023-01' && 
      predictionData[11]?.date === '2023-12';

    return predictionData.map(row => {
      // Use exact accuracy from data if available (for Guiyang 2023)
      if (isGuiyang2023Data && typeof row.accuracy === 'number') {
        return {
          ...row,
          accuracy: row.accuracy.toFixed(2) + '%'
        };
      }
      
      // Fallback to calculated accuracy for other data
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

  const summaryColumns: any[] = (() => {
    // 上传模式列定义
    if (uploadMode && uploadTargets.length > 0) {
      const isRate = (col: string) => col.includes('%') || col.includes('增速') || col.includes('率') || col.includes('PPI') || col.includes('CPI');
      return [
        { title: '日期', dataIndex: 'date', key: 'date', fixed: 'left' as const, width: 120 },
        ...uploadTargets.map(col => ({
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
    }

    // Mock 模式列定义
    return [
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
    <Layout style={{ height: 'calc(100vh - 64px)', background: 'transparent' }}>
      <Sider
        width={340}
        theme="light"
        style={{ padding: '0', borderRight: '1px solid #E2E5F2', overflowY: 'auto' }}
        breakpoint="lg"
        collapsedWidth="0"
      >
        <div style={{ padding: '24px 24px 0 24px' }}>
          <Title level={4} style={{ color: '#000409', fontWeight: 'bold' }}>预测配置</Title>

          {/* --- 文件上传（可选） --- */}
          <Collapse
            ghost
            size="small"
            items={[{
              key: 'upload',
              label: <span><UploadOutlined style={{ marginRight: 8 }} />上传真实数据文件（可选）</span>,
              children: (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ marginBottom: 8, color: '#666', fontSize: 12 }}>历史经济数据（必填）</div>
                  <Upload
                    accept=".xlsx,.xls"
                    maxCount={1}
                    fileList={historyFileList}
                    onChange={handleHistoryUpload}
                    beforeUpload={() => false}
                    showUploadList={{ showRemoveIcon: true }}
                  >
                    <Button icon={<UploadOutlined />} block>选择历史数据文件</Button>
                  </Upload>
                  <div style={{ marginTop: 12, marginBottom: 8, color: '#666', fontSize: 12 }}>实际值数据（可选，用于精准度对比）</div>
                  <Upload
                    accept=".xlsx,.xls"
                    maxCount={1}
                    fileList={actualFileList}
                    onChange={handleActualUpload}
                    beforeUpload={() => false}
                    showUploadList={{ showRemoveIcon: true }}
                  >
                    <Button icon={<UploadOutlined />} block>选择实际值文件</Button>
                  </Upload>
                  {uploadColumns.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ marginBottom: 4, color: '#666', fontSize: 12 }}>预测目标指标（上传模式）</div>
                      <Select
                        mode="multiple"
                        placeholder="选择要预测的指标列"
                        style={{ width: '100%' }}
                        value={uploadTargets}
                        onChange={(vals) => {
                          setUploadTargets(vals);
                          setUploadMode(vals.length > 0);
                        }}
                        allowClear
                        showSearch
                        maxTagCount={4}
                        options={uploadColumns.map(c => ({ label: c, value: c }))}
                      />
                      {uploadTargets.length > 0 && (
                        <div style={{ marginTop: 4, fontSize: 12, color: '#52c41a' }}>
                          已启用上传模式，将使用文件数据进行预测
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ),
            }]}
          />

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
            {/* 上传模式精准度汇总 */}
            {uploadMode && accuracySummary.length > 0 && (
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
                <Tabs items={(uploadMode ? uploadTargets : getCurrentIndicators().map(ind => ind.key))
                  .map((key: string) => ({
                    key,
                    label: uploadMode ? key : (getCurrentIndicators().find(ind => ind.key === key)?.label || key),
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
            请在左侧配置参数并点击“开始预测”
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default M03Prediction;
