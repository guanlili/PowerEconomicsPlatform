import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Layout,
  Card,
  Table,
  Tabs,
  Spin,
  Typography,
  Row,
  Col,
  Statistic,
  Tag,
  Button,
  Modal,
  Select,
  Radio,
  Upload,
  message,
} from 'antd';
import {
  DatabaseOutlined,
  ThunderboltOutlined,
  FundOutlined,
  AimOutlined,
  TableOutlined,
  NumberOutlined,
  ImportOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload';

const { Content } = Layout;
const { Title, Text } = Typography;

// ============================================================
// Types
// ============================================================

interface DataTypeInfo {
  name: string;
  columns: string[];
  row_count: number;
}

interface SheetInfo {
  name: string;
  data_types: DataTypeInfo[];
}

interface SheetsResponse {
  sheets: SheetInfo[];
}

interface DataListResponse {
  total: number;
  columns: string[];
  data: Record<string, unknown>[];
  data_type: string;
  sheet: string;
  page: number;
  page_size: number;
}

// ============================================================
// Constants
// ============================================================

const SHEET_ICONS: Record<string, React.ReactNode> = {
  '用电量': <ThunderboltOutlined />,
  '影响因素': <FundOutlined />,
  '目标经济变量': <AimOutlined />,
};

const DATA_TYPE_COLORS: Record<string, string> = {
  '区域': '#1677ff',
  '行业': '#722ed1',
  '产业': '#13c2c2',
};

// ============================================================
// Main Component
// ============================================================

const SHEET_OPTIONS = ['用电量', '影响因素', '目标经济变量'];
const DATA_TYPE_OPTIONS = ['区域', '行业', '产业'];

const M01DataManagement: React.FC = () => {
  // Schema state
  const [sheets, setSheets] = useState<SheetInfo[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(true);

  // Selection state
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [activeDataType, setActiveDataType] = useState<string>('');

  // Import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importSheetName, setImportSheetName] = useState<string>('用电量');
  const [importDataType, setImportDataType] = useState<string>('区域');
  const [importMode, setImportMode] = useState<string>('append');
  const [importFileList, setImportFileList] = useState<UploadFile[]>([]);
  const [importing, setImporting] = useState(false);

  // Data state
  const [tableData, setTableData] = useState<Record<string, unknown>[]>([]);
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [dataLoading, setDataLoading] = useState(false);

  // Virtual scroll 需要 scroll.y 为具体数值，跟随窗口尺寸变化
  const [tableScrollY, setTableScrollY] = useState<number>(() =>
    typeof window !== 'undefined' ? Math.max(window.innerHeight - 520, 300) : 480
  );
  useEffect(() => {
    const onResize = () => setTableScrollY(Math.max(window.innerHeight - 520, 300));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ---- Fetch schema on mount ----
  useEffect(() => {
    setSchemaLoading(true);
    fetch('/api/data/sheets')
      .then((res) => res.json())
      .then((data: SheetsResponse) => {
        setSheets(data.sheets);
        if (data.sheets.length > 0) {
          const firstSheet = data.sheets[0];
          setActiveSheet(firstSheet.name);
          if (firstSheet.data_types.length > 0) {
            setActiveDataType(firstSheet.data_types[0].name);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to fetch sheets:', err);
      })
      .finally(() => {
        setSchemaLoading(false);
      });
  }, []);

  // ---- Fetch data when selection or page changes ----
  const fetchData = useCallback(() => {
    if (!activeSheet || !activeDataType) return;
    setDataLoading(true);
    const params = new URLSearchParams({
      sheet: activeSheet,
      data_type: activeDataType,
      page: String(page),
      page_size: String(pageSize),
    });
    fetch(`/api/data/list?${params.toString()}`)
      .then((res) => res.json())
      .then((data: DataListResponse) => {
        setTableData(data.data);
        setTableColumns(data.columns);
        setTotal(data.total);
      })
      .catch((err) => {
        console.error('Failed to fetch data:', err);
      })
      .finally(() => {
        setDataLoading(false);
      });
  }, [activeSheet, activeDataType, page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- Current schema info ----
  const currentSheet = useMemo(() => {
    return sheets.find((s) => s.name === activeSheet);
  }, [sheets, activeSheet]);

  const currentDataTypeInfo = useMemo(() => {
    return currentSheet?.data_types.find((dt) => dt.name === activeDataType);
  }, [currentSheet, activeDataType]);

  // ---- Generate Ant Table columns dynamically ----
  const antColumns: ColumnsType<Record<string, unknown>> = useMemo(() => {
    if (tableColumns.length === 0) return [];

    return tableColumns.map((col, index) => {
      const isFirstCol = index === 0;
      // Determine if it's a "P" column (用电量 P1-P96)
      const isPCol = /^P\d+$/.test(col);
      // Determine if it's a numeric column (not the first column, and not obviously a text/date column)
      const isNumericCol = !isFirstCol && (isPCol || index >= 2);

      const colDef: ColumnsType<Record<string, unknown>>[number] = {
        title: col,
        dataIndex: col,
        key: col,
        width: isFirstCol ? 120 : isPCol ? 80 : 150,
        fixed: isFirstCol ? 'left' : undefined,
        ellipsis: true,
        align: isNumericCol ? 'right' : 'left',
        render: (value: unknown) => {
          if (value === null || value === undefined) return '-';
          if (typeof value === 'number') {
            // Display numbers with appropriate precision
            return Number.isInteger(value) ? value.toLocaleString('zh-CN') : value.toFixed(2);
          }
          return String(value);
        },
      };
      return colDef;
    });
  }, [tableColumns]);

  // ---- Handlers ----
  const handleSheetChange = (key: string) => {
    setActiveSheet(key);
    setPage(1);
    // Reset data type to first of the new sheet
    const sheet = sheets.find((s) => s.name === key);
    if (sheet && sheet.data_types.length > 0) {
      setActiveDataType(sheet.data_types[0].name);
    }
  };

  const handleDataTypeChange = (key: string) => {
    setActiveDataType(key);
    setPage(1);
  };

  const handlePageChange = (newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  };

  // ---- Import handlers ----
  const handleOpenImportModal = () => {
    setImportSheetName('用电量');
    setImportDataType('区域');
    setImportMode('append');
    setImportFileList([]);
    setImportModalOpen(true);
  };

  const handleImportConfirm = async () => {
    if (importFileList.length === 0) {
      message.warning('请选择要导入的 Excel 文件');
      return;
    }

    const file = importFileList[0]?.originFileObj;
    if (!file) {
      message.warning('文件读取失败，请重新选择');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('sheet_name', importSheetName);
    formData.append('data_type', importDataType);
    formData.append('mode', importMode);

    setImporting(true);
    try {
      const res = await fetch('/api/data/import', {
        method: 'POST',
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) {
        message.error(result.detail || '导入失败');
        return;
      }
      message.success(`导入成功！共导入 ${result.imported_rows} 行数据，表中总计 ${result.total_rows} 行`);
      setImportModalOpen(false);
      // 刷新数据
      fetchData();
    } catch (err) {
      message.error('网络请求失败，请检查后端服务');
      console.error('Import failed:', err);
    } finally {
      setImporting(false);
    }
  };

  // ============================================================
  // Render
  // ============================================================

  if (schemaLoading) {
    return (
      <Layout style={{ padding: 16, background: 'transparent', minHeight: 'calc(100vh - 64px)' }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <Spin size="large" tip="加载数据结构中..." />
        </Content>
      </Layout>
    );
  }

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
                数据管理
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>
                浏览和查看平台核心数据资产
              </Text>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button
              type="primary"
              icon={<ImportOutlined />}
              onClick={handleOpenImportModal}
              style={{ borderRadius: 6 }}
            >
              导入数据
            </Button>
            <Tag
              color="blue"
              style={{ fontSize: 13, padding: '4px 12px', borderRadius: 6, margin: 0 }}
            >
              {sheets.length} 个数据集
            </Tag>
          </div>
        </div>

        {/* ---- Sheet Tabs (Level 1) ---- */}
        <Card
          style={{ borderRadius: 10, marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          styles={{ body: { padding: '4px 16px 0' } }}
        >
          <Tabs
            activeKey={activeSheet}
            onChange={handleSheetChange}
            items={sheets.map((sheet) => ({
              key: sheet.name,
              label: (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {SHEET_ICONS[sheet.name] || <TableOutlined />}
                  {sheet.name}
                </span>
              ),
            }))}
            size="large"
          />
        </Card>

        {/* ---- Data Type Tabs (Level 2) + Stats ---- */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={24}>
            <Card
              style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
              styles={{ body: { padding: '12px 20px' } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                {/* Data type switcher */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {currentSheet?.data_types.map((dt) => {
                    const isActive = dt.name === activeDataType;
                    const color = DATA_TYPE_COLORS[dt.name] || '#1677ff';
                    return (
                      <button
                        key={dt.name}
                        onClick={() => handleDataTypeChange(dt.name)}
                        style={{
                          padding: '6px 20px',
                          border: isActive ? `2px solid ${color}` : '2px solid #d9d9d9',
                          borderRadius: 8,
                          background: isActive ? `${color}11` : '#fafafa',
                          color: isActive ? color : '#595959',
                          cursor: 'pointer',
                          fontWeight: isActive ? 700 : 400,
                          fontSize: 14,
                          transition: 'all 0.2s',
                        }}
                      >
                        {dt.name}
                      </button>
                    );
                  })}
                </div>

                {/* Stats inline */}
                <div style={{ display: 'flex', gap: 24 }}>
                  <Statistic
                    title={<span style={{ fontSize: 12, color: '#8c8c8c' }}>总记录数</span>}
                    value={currentDataTypeInfo?.row_count ?? 0}
                    suffix="条"
                    valueStyle={{ fontSize: 18, fontWeight: 700, color: '#1677ff' }}
                  />
                  <Statistic
                    title={<span style={{ fontSize: 12, color: '#8c8c8c' }}>指标/列数</span>}
                    value={currentDataTypeInfo ? currentDataTypeInfo.columns.length : 0}
                    suffix="项"
                    valueStyle={{ fontSize: 18, fontWeight: 700, color: '#52c41a' }}
                    prefix={<NumberOutlined style={{ fontSize: 14 }} />}
                  />
                </div>
              </div>
            </Card>
          </Col>
        </Row>

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
                title={<span style={{ color: '#1677ff', fontWeight: 600 }}>当前数据总量</span>}
                value={total}
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
                title={<span style={{ color: '#52c41a', fontWeight: 600 }}>数据列数</span>}
                value={tableColumns.length}
                suffix="列"
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
                title={<span style={{ color: '#fa8c16', fontWeight: 600 }}>当前页数据</span>}
                value={tableData.length}
                suffix="条"
                valueStyle={{ color: '#fa8c16', fontWeight: 700 }}
              />
            </Card>
          </Col>
        </Row>

        {/* ---- Data Table ---- */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {SHEET_ICONS[activeSheet] || <TableOutlined />}
              <span style={{ fontWeight: 600 }}>{activeSheet}</span>
              <Tag color={DATA_TYPE_COLORS[activeDataType] || 'blue'}>{activeDataType}</Tag>
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                共 {total} 条记录
              </Text>
            </div>
          }
          style={{ borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          styles={{ body: { padding: 0 } }}
        >
          <Spin spinning={dataLoading}>
            <Table
              virtual
              rowKey={(_, index) => `row-${page}-${pageSize}-${index}`}
              columns={antColumns}
              dataSource={tableData}
              size="small"
              scroll={{ x: 'max-content', y: tableScrollY }}
              pagination={{
                current: page,
                pageSize: pageSize,
                total: total,
                showSizeChanger: true,
                pageSizeOptions: ['20', '50', '100', '200'],
                showTotal: (t) => `共 ${t} 条`,
                size: 'small',
                onChange: handlePageChange,
                onShowSizeChange: handlePageChange,
              }}
              style={{ borderRadius: 10, overflow: 'hidden' }}
            />
          </Spin>
        </Card>

        {/* ---- Import Modal ---- */}
        <Modal
          title="导入数据"
          open={importModalOpen}
          onCancel={() => setImportModalOpen(false)}
          onOk={handleImportConfirm}
          confirmLoading={importing}
          okText="确认导入"
          cancelText="取消"
          destroyOnClose
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '12px 0' }}>
            <div>
              <div style={{ marginBottom: 6, fontWeight: 500 }}>目标 Sheet</div>
              <Select
                value={importSheetName}
                onChange={(val) => setImportSheetName(val)}
                style={{ width: '100%' }}
                options={SHEET_OPTIONS.map((s) => ({ label: s, value: s }))}
              />
            </div>
            <div>
              <div style={{ marginBottom: 6, fontWeight: 500 }}>数据类型</div>
              <Select
                value={importDataType}
                onChange={(val) => setImportDataType(val)}
                style={{ width: '100%' }}
                options={DATA_TYPE_OPTIONS.map((d) => ({ label: d, value: d }))}
              />
            </div>
            <div>
              <div style={{ marginBottom: 6, fontWeight: 500 }}>导入模式</div>
              <Radio.Group value={importMode} onChange={(e) => setImportMode(e.target.value)}>
                <Radio value="append">追加（保留已有数据）</Radio>
                <Radio value="replace">替换（清空后导入）</Radio>
              </Radio.Group>
            </div>
            <div>
              <div style={{ marginBottom: 6, fontWeight: 500 }}>上传文件</div>
              <Upload
                accept=".xlsx,.xls"
                maxCount={1}
                fileList={importFileList}
                beforeUpload={() => false}
                onChange={({ fileList }) => setImportFileList(fileList)}
              >
                <Button icon={<UploadOutlined />}>选择 Excel 文件</Button>
              </Upload>
            </div>
          </div>
        </Modal>
      </Content>
    </Layout>
  );
};

export default M01DataManagement;
