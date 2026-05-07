import React, { useState, useRef } from 'react';
import { Layout, Card, Form, Select, DatePicker, Button, Checkbox, Row, Col, Table, Typography, message, Tabs, Input, Upload, Collapse } from 'antd';
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

  // --- 文件上传模式相关状态 ---
  const [uploadFileList, setUploadFileList] = useState<UploadFile[]>([]);
  const [uploadColumns, setUploadColumns] = useState<string[]>([]);
  const [uploadMode, setUploadMode] = useState(false);
  const uploadedFileRef = useRef<File | null>(null); // 用 ref 可靠存储原始 File 对象

  // 文件上传后获取列名
  const handleFileUpload = async (info: any) => {
    const { fileList: newFileList } = info;

    // 文件被移除
    if (newFileList.length === 0) {
      setUploadFileList([]);
      setUploadColumns([]);
      setUploadMode(false);
      uploadedFileRef.current = null;
      return;
    }

    setUploadFileList(newFileList.slice(-1));

    // 从 antd 的 file 对象中提取原始 File（兼容多种情况）
    const latestFile = newFileList[newFileList.length - 1];
    const rawFile: File | undefined = latestFile?.originFileObj ?? latestFile;
    if (rawFile && rawFile instanceof File && rawFile.size > 0) {
      uploadedFileRef.current = rawFile;
      const formData = new FormData();
      formData.append('file', rawFile);
      try {
        const res = await axios.post('/api/columns', formData);
        setUploadColumns(res.data.columns || []);
        setUploadMode(false);

        // 自动设置日期范围（根据 Excel 中的实际数据）
        if (res.data.date_range && res.data.date_range.length === 2) {
          form.setFieldValue('dateRange', [
            dayjs(res.data.date_range[0], 'YYYY-MM'),
            dayjs(res.data.date_range[1], 'YYYY-MM'),
          ]);
        }

        message.success('文件上传成功，请在下方勾选目标经济变量与影响因素后点击"计算相关性"');
      } catch (err: any) {
        message.error(err?.response?.data?.detail || '获取列名失败');
        setUploadColumns([]);
      }
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

  const onFinish = async (values: any) => {
    setLoading(true);
    const { dateRange, factors, economicVars } = values;

    // 基础验证
    if (!economicVars || economicVars.length === 0) {
      message.error('请选择至少一个目标经济变量');
      setLoading(false);
      return;
    }
    if (!factors || factors.length === 0) {
      message.error('请选择至少一个影响因素');
      setLoading(false);
      return;
    }

    // --- 上传模式：调用真实API ---
    if (uploadedFileRef.current) {
      const indicators = getCurrentIndicators();
      const currentFactorsCfg = getCurrentFactors();

      // 将勾选的 key 映射为标签名（即 Excel 列名）
      const targetLabels = economicVars
        .map((key: string) => indicators.find(ind => ind.key === key)?.label)
        .filter(Boolean) as string[];
      const factorLabels = factors
        .map((key: string) => currentFactorsCfg.find(f => f.name === key)?.label)
        .filter(Boolean) as string[];

      const targetCol = targetLabels[0];
      if (!targetCol) {
        message.error('无法匹配目标经济变量到 Excel 列名，请检查勾选项');
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', uploadedFileRef.current);
      formData.append('target_col', targetCol);
      formData.append('factor_cols', JSON.stringify(factorLabels));
      formData.append('top_n', '20');

      // 传递前端选择的时间范围
      if (dateRange && dateRange.length === 2) {
        formData.append('date_start', dateRange[0].format('YYYY-MM'));
        formData.append('date_end', dateRange[1].format('YYYY-MM'));
      }

      try {
        const res = await axios.post('/api/analysis', formData);
        const data = res.data;
        const scores: any[] = data.scores || [];

        if (scores.length === 0) {
          message.warning('未计算出相关性得分，请检查选择的列是否有效');
          setLoading(false);
          return;
        }

        // table_data 作为折线图+原始数据表格的数据源
        const tableRows: any[] = data.table_data || [];
        setChartData(tableRows);

        // 相关性矩阵（平均得分）
        const corrRows = [
          {
            indicator: targetCol,
            ...Object.fromEntries(scores.map((s: any) => [s.variable, s.avg_score?.toFixed(4) || 'N/A'])),
          },
        ];
        setCorrelationData(corrRows);
        setSelectedFactors(scores.slice(0, 8).map((s: any) => s.variable));
        setSelectedEconomicVars([targetCol]);
        setUploadMode(true);

        message.success(`真实数据分析完成，目标: ${targetCol}，分析 ${data.feature_count} 个特征，${data.data_points} 条数据`);
      } catch (err: any) {
        message.error(err?.response?.data?.detail || '分析请求失败');
      } finally {
        setLoading(false);
      }
      return;
    }

    // --- 原有 Mock 数据模式 ---
    if (!dateRange || dateRange.length !== 2) {
      message.error('请选择时间范围');
      setLoading(false);
      return;
    }

    setUploadMode(false);

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

    // 上传模式：折线图展示 Excel 实际数据
    if (uploadMode) {
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
    }

    // Mock 模式：原有双轴折线图
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
    ...selectedEconomicVars.map(e => {
      const label = uploadMode ? e : (getCurrentIndicators().find(ei => ei.key === e)?.label || e);
      return {
        title: `${label}（目标变量）`,
        dataIndex: e,
        key: e,
        render: (value: number) => <span style={{ color: '#EE6666', fontWeight: 500 }}>{value != null ? value.toFixed(2) : '-'}</span>
      };
    }),
    ...selectedFactors.map(f => {
      const label = uploadMode ? f : (currentFactors.find(rf => rf.name === f)?.label || f);
      return {
        title: label,
        dataIndex: f,
        key: f,
        render: (value: number) => value != null ? value.toFixed(2) : '-'
      };
    }),
  ];

  const correlationColumns = [
    {
      title: '经济指标', dataIndex: 'indicator', key: 'indicator',
      render: (text: string) => uploadMode ? text : (getCurrentIndicators().find(e => e.key === text)?.label || text)
    },
    ...selectedFactors.map(f => {
      const config = uploadMode ? null : currentFactors.find(rf => rf.name === f);
      return {
        title: config?.label || f,
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

          {/* --- 文件上传（可选） --- */}
          <Collapse
            ghost
            size="small"
            items={[{
              key: 'upload',
              label: <span><UploadOutlined style={{ marginRight: 8 }} />上传真实数据文件（可选）</span>,
              children: (
                <div style={{ marginBottom: 8 }}>
                  <Upload
                    accept=".xlsx,.xls"
                    maxCount={1}
                    fileList={uploadFileList}
                    onChange={handleFileUpload}
                    beforeUpload={() => false}
                    showUploadList={{ showRemoveIcon: true }}
                  >
                    <Button icon={<UploadOutlined />} block>选择 Excel 文件</Button>
                  </Upload>
                  {uploadColumns.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ marginBottom: 4, color: '#666', fontSize: 12 }}>
                        文件共 {uploadColumns.length} 列：
                      </div>
                      <div style={{ fontSize: 11, color: '#999', lineHeight: '18px', maxHeight: 80, overflowY: 'auto' }}>
                        {uploadColumns.join('、')}
                      </div>
                      <div style={{ marginTop: 8, fontSize: 12, color: '#1890ff' }}>
                        请在下方勾选目标经济变量与影响因素，列名需与文件中的列名一致
                      </div>
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
              <Card title={uploadMode ? "影响因素得分" : "趋势分析 (双轴折线图)"}>
                <ReactECharts option={getChartOption()} style={{ height: 400, width: '100%' }} />
              </Card>
            </Col>
            <Col span={24}>
              <Card title={uploadMode ? "相关性矩阵 (平均得分)" : "相关性矩阵 (Pearson)"}>
                <Table
                  dataSource={correlationData}
                  columns={correlationColumns}
                  pagination={false}
                  rowKey="indicator"
                  bordered
                  size="small"
                  scroll={uploadMode ? { x: true } : undefined}
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
