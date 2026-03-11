import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Card, Tree, Input, Button, Space, Typography, Tooltip, Modal, message, Row, Col } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SaveOutlined,
  CloseOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

const { Content } = Layout;
const { Title, Text } = Typography;

// ========== Indicator Tree Data ==========

interface IndicatorNode {
  key: string;
  title: string;
  children?: IndicatorNode[];
}

const DEFAULT_INDICATOR_DATA: IndicatorNode[] = [
  {
    key: '1',
    title: '电力看经济指标体系',
    children: [
      {
        key: '1-1',
        title: '区域场景用电量',
        children: [
          { key: '1-1-1', title: '区域用电量' },
          { key: '1-1-2', title: '月内每日最低温度均值' },
          { key: '1-1-3', title: '月内每日最高温度均值' },
          { key: '1-1-4', title: '月内总降雨量' },
          { key: '1-1-5', title: '社会消费品零售总额' },
          { key: '1-1-6', title: '城镇化率' },
          { key: '1-1-7', title: '常住人口' },
          { key: '1-1-8', title: '清洁能源占比' },
          { key: '1-1-9', title: '发电量' },
          { key: '1-1-10', title: '生产总值(GDP)' },
          { key: '1-1-11', title: '固定资产投资' },
          { key: '1-1-12', title: '经济增速' },
          { key: '1-1-13', title: '经济增加值' },
          { key: '1-1-14', title: '生产价格指数(PPI)' },
          { key: '1-1-15', title: '居民消费价格指数(CPI)' },
          { key: '1-1-16', title: '规模以上工业增加值' },
          { key: '1-1-17', title: '进出口总额' },
        ],
      },
      {
        key: '1-2',
        title: '产业场景用电量',
        children: [
          { key: '1-2-1', title: '产业用电量' },
          { key: '1-2-2', title: '月内每日最低温度均值' },
          { key: '1-2-3', title: '月内每日最高温度均值' },
          { key: '1-2-4', title: '月内总降雨量' },
          { key: '1-2-5', title: '劳动生产率' },
          { key: '1-2-6', title: '消费者价格指数(CPI)' },
          { key: '1-2-7', title: '电网负荷率' },
          { key: '1-2-8', title: '农产品价格指数' },
          { key: '1-2-9', title: '相对湿度' },
          { key: '1-2-10', title: '畜牧业产值' },
          { key: '1-2-11', title: '水产品产量' },
          { key: '1-2-12', title: '能源价格指数' },
          { key: '1-2-13', title: '煤炭价格指数' },
          { key: '1-2-14', title: '芯片/集成电路产量' },
          { key: '1-2-15', title: '电动机产量' },
          { key: '1-2-16', title: '化学农药原药' },
          { key: '1-2-17', title: '汽车产量' },
          { key: '1-2-18', title: '火电机组利用小时数' },
          { key: '1-2-19', title: '社会消费品零售总额' },
          { key: '1-2-20', title: '金融业增加值' },
          { key: '1-2-21', title: '物流运输量' },
          { key: '1-2-22', title: '仓储设施总面积' },
          { key: '1-2-23', title: '5G基站数量' },
          { key: '1-2-24', title: '旅游收入' },
          { key: '1-2-25', title: '旅游人次' },
          { key: '1-2-26', title: '清洁能源占比' },
          { key: '1-2-27', title: '产业增加值' },
          { key: '1-2-28', title: '增加值增速' },
          { key: '1-2-29', title: '产业增加值占GDP比重' },
          { key: '1-2-30', title: '进出口总额' },
        ],
      },
      {
        key: '1-3',
        title: '行业场景用电量',
        children: [
          { key: '1-3-1', title: '行业用电量' },
          { key: '1-3-2', title: '月内每日最低温度均值' },
          { key: '1-3-3', title: '月内每日最高温度均值' },
          { key: '1-3-4', title: '月内总降雨量' },
          { key: '1-3-5', title: '有色金属现货均价' },
          { key: '1-3-6', title: '有色金属产量' },
          { key: '1-3-7', title: '产成品存货' },
          { key: '1-3-8', title: '用电价格' },
          { key: '1-3-9', title: '行业绿电消纳占比' },
          { key: '1-3-10', title: '钢材产量' },
          { key: '1-3-11', title: '铁矿石进口均价' },
          { key: '1-3-12', title: '钢材综合价格指数' },
          { key: '1-3-13', title: '负荷峰谷差率' },
          { key: '1-3-14', title: '化工产品价格指数（CCPI）' },
          { key: '1-3-15', title: '原油购进价格' },
          { key: '1-3-16', title: '煤炭购进价格' },
          { key: '1-3-17', title: '行业产能利用率' },
          { key: '1-3-18', title: '供电可靠性' },
          { key: '1-3-19', title: '固定资产投资完成额' },
          { key: '1-3-20', title: '房地产开发投资额' },
          { key: '1-3-21', title: '水泥产量' },
          { key: '1-3-22', title: '玻璃产量' },
          { key: '1-3-23', title: '用电负荷率' },
          { key: '1-3-24', title: '电煤购进价格指数' },
          { key: '1-3-25', title: '电力、热力生产和供应业固定资产投资额' },
          { key: '1-3-26', title: '发电设备平均利用小时数' },
          { key: '1-3-27', title: '布伦特原油现货价格' },
          { key: '1-3-28', title: '石油煤炭加工行业出厂价格指数' },
          { key: '1-3-29', title: '行业固定资产投资额' },
          { key: '1-3-30', title: '可再生能源消纳率' },
          { key: '1-3-31', title: '计算机通信和其他电子设备制造业出厂价格指数' },
          { key: '1-3-32', title: '集成电路进口均价' },
          { key: '1-3-33', title: '出口交货值' },
          { key: '1-3-34', title: '绿电与可再生能源证书（绿证）认购权重' },
          { key: '1-3-35', title: '金属价格' },
          { key: '1-3-36', title: '电气机械和器材制造业出厂价格指数' },
          { key: '1-3-37', title: '月用电最大负荷' },
          { key: '1-3-38', title: '汽车制造业出厂价格指数' },
          { key: '1-3-39', title: '汽车产量' },
          { key: '1-3-40', title: '汽车销量' },
          { key: '1-3-41', title: '汽车制造业固定资产投资额' },
          { key: '1-3-42', title: '通用设备制造业出厂价格指数' },
          { key: '1-3-43', title: '黑色金属购进价格' },
          { key: '1-3-44', title: '通用设备制造业固定资产投资额' },
          { key: '1-3-45', title: '行业研发经费投入' },
          { key: '1-3-46', title: '互联网宽带接入用户数' },
          { key: '1-3-47', title: '从业人员平均工资' },
          { key: '1-3-48', title: '信息技术服务出口额' },
          { key: '1-3-49', title: '备用电源供电保障时长' },
          { key: '1-3-50', title: '酒、饮料和精制茶制造业出厂价格指数' },
          { key: '1-3-51', title: '社会消费品零售总额' },
          { key: '1-3-52', title: '粮食购进价格' },
          { key: '1-3-53', title: '原料购进价格' },
          { key: '1-3-54', title: '农产品购进价格' },
          { key: '1-3-55', title: '旅游及餐饮业营业额' },
          { key: '1-3-56', title: '行业增加值' },
          { key: '1-3-57', title: '行业总产值' },
          { key: '1-3-58', title: '行业利润率' },
          { key: '1-3-59', title: '营业收入' },
          { key: '1-3-60', title: '利润总额' },
          { key: '1-3-61', title: '进出口额' },
        ],
      },
    ],
  },
];

// ========== Mock Electricity Data ==========

const CITY_ELECTRICITY_DATA: Record<string, { consumption: number; unit: string }> = {
  '贵阳市': { consumption: 285.6, unit: '亿千瓦时' },
  '遵义市': { consumption: 198.3, unit: '亿千瓦时' },
  '六盘水市': { consumption: 176.8, unit: '亿千瓦时' },
  '安顺市': { consumption: 89.2, unit: '亿千瓦时' },
  '毕节市': { consumption: 142.5, unit: '亿千瓦时' },
  '铜仁市': { consumption: 96.7, unit: '亿千瓦时' },
  '黔西南布依族苗族自治州': { consumption: 112.4, unit: '亿千瓦时' },
  '黔东南苗族侗族自治州': { consumption: 78.9, unit: '亿千瓦时' },
  '黔南布依族苗族自治州': { consumption: 103.1, unit: '亿千瓦时' },
};

// ========== Helper Functions ==========

let keyCounter = 1000;
const generateKey = () => `node-${++keyCounter}`;

const deepCloneTree = (nodes: IndicatorNode[]): IndicatorNode[] =>
  nodes.map((n) => ({
    ...n,
    children: n.children ? deepCloneTree(n.children) : undefined,
  }));

const updateNodeInTree = (
  nodes: IndicatorNode[],
  key: string,
  updater: (node: IndicatorNode) => IndicatorNode | null
): IndicatorNode[] => {
  const result: IndicatorNode[] = [];
  for (const node of nodes) {
    if (node.key === key) {
      const updated = updater(node);
      if (updated) result.push(updated);
      // null means delete
    } else {
      result.push({
        ...node,
        children: node.children
          ? updateNodeInTree(node.children, key, updater)
          : undefined,
      });
    }
  }
  return result;
};

const addChildToNode = (
  nodes: IndicatorNode[],
  parentKey: string,
  child: IndicatorNode
): IndicatorNode[] =>
  nodes.map((node) => {
    if (node.key === parentKey) {
      return {
        ...node,
        children: [...(node.children || []), child],
      };
    }
    return {
      ...node,
      children: node.children
        ? addChildToNode(node.children, parentKey, child)
        : undefined,
    };
  });

// ========== Component ==========

const M04IndicatorSystem: React.FC = () => {
  const [treeData, setTreeData] = useState<IndicatorNode[]>(
    deepCloneTree(DEFAULT_INDICATOR_DATA)
  );
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(['1', '1-1', '1-2', '1-3']);

  // Load GeoJSON and register map
  useEffect(() => {
    fetch('/guizhou.json')
      .then((res) => res.json())
      .then((geoJson) => {
        echarts.registerMap('guizhou', geoJson);
        setMapReady(true);
      })
      .catch((err) => {
        console.error('Failed to load Guizhou GeoJSON:', err);
        message.error('地图数据加载失败');
      });
  }, []);

  // ---- Tree edit handlers ----

  const handleEdit = useCallback((key: string, currentTitle: string) => {
    setEditingKey(key);
    setEditValue(currentTitle);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingKey || !editValue.trim()) {
      message.warning('指标名称不能为空');
      return;
    }
    setTreeData((prev) =>
      updateNodeInTree(prev, editingKey, (node) => ({
        ...node,
        title: editValue.trim(),
      }))
    );
    setEditingKey(null);
    setEditValue('');
    message.success('修改成功');
  }, [editingKey, editValue]);

  const handleCancelEdit = useCallback(() => {
    setEditingKey(null);
    setEditValue('');
  }, []);

  const handleDelete = useCallback((key: string, title: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除指标"${title}"吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        setTreeData((prev) => updateNodeInTree(prev, key, () => null));
        message.success('删除成功');
      },
    });
  }, []);

  const handleAddChild = useCallback(
    (parentKey: string) => {
      const newKey = generateKey();
      const newNode: IndicatorNode = {
        key: newKey,
        title: '新指标',
      };
      setTreeData((prev) => addChildToNode(prev, parentKey, newNode));
      setExpandedKeys((prev) =>
        prev.includes(parentKey) ? prev : [...prev, parentKey]
      );
      // Start editing the new node immediately
      setEditingKey(newKey);
      setEditValue('新指标');
      message.info('已添加新指标，请编辑名称');
    },
    []
  );

  const handleResetTree = useCallback(() => {
    Modal.confirm({
      title: '重置指标体系',
      content: '确定要恢复默认指标体系吗？所有修改将丢失。',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        setTreeData(deepCloneTree(DEFAULT_INDICATOR_DATA));
        setEditingKey(null);
        setEditValue('');
        setExpandedKeys(['1', '1-1', '1-2', '1-3']);
        message.success('已恢复默认指标体系');
      },
    });
  }, []);

  // ---- Tree node renderer ----

  const renderTreeTitle = (node: IndicatorNode) => {
    const isEditing = editingKey === node.key;
    const isRoot = node.key === '1';

    if (isEditing) {
      return (
        <Space size={4}>
          <Input
            size="small"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onPressEnter={handleSaveEdit}
            onKeyDown={(e) => e.key === 'Escape' && handleCancelEdit()}
            style={{ width: 200 }}
            autoFocus
          />
          <Button
            type="link"
            size="small"
            icon={<SaveOutlined />}
            onClick={handleSaveEdit}
            style={{ color: '#52c41a' }}
          />
          <Button
            type="link"
            size="small"
            icon={<CloseOutlined />}
            onClick={handleCancelEdit}
            style={{ color: '#ff4d4f' }}
          />
        </Space>
      );
    }

    return (
      <span className="tree-node-title">
        <span>{node.title}</span>
        <span className="tree-node-actions" style={{ marginLeft: 8, opacity: 0, transition: 'opacity 0.2s' }}>
          <Tooltip title="编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(node.key, node.title);
              }}
              style={{ padding: '0 4px' }}
            />
          </Tooltip>
          <Tooltip title="添加子指标">
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleAddChild(node.key);
              }}
              style={{ padding: '0 4px' }}
            />
          </Tooltip>
          {!isRoot && (
            <Tooltip title="删除">
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(node.key, node.title);
                }}
                style={{ padding: '0 4px' }}
              />
            </Tooltip>
          )}
        </span>
      </span>
    );
  };

  // Convert IndicatorNode[] to Ant Design Tree data format
  const convertToAntTreeData = (nodes: IndicatorNode[]): any[] =>
    nodes.map((node) => ({
      key: node.key,
      title: renderTreeTitle(node),
      children: node.children ? convertToAntTreeData(node.children) : undefined,
    }));

  // ---- Map chart option ----

  const mapData = Object.entries(CITY_ELECTRICITY_DATA).map(([name, data]) => ({
    name,
    value: data.consumption,
  }));

  const mapOption: echarts.EChartsOption = {
    title: {
      text: '贵州省地市级用电量分布',
      left: 'center',
      top: 16,
      textStyle: { fontSize: 16, fontWeight: 'bold' },
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const cityData = CITY_ELECTRICITY_DATA[params.name];
        if (cityData) {
          return `<div style="font-weight:bold;margin-bottom:4px">${params.name}</div>用电量：${cityData.consumption} ${cityData.unit}`;
        }
        return params.name;
      },
    },
    visualMap: {
      min: 60,
      max: 300,
      left: 16,
      bottom: 16,
      text: ['高', '低'],
      calculable: true,
      inRange: {
        color: ['#e0f3db', '#a8ddb5', '#7bccc4', '#4eb3d3', '#2b8cbe', '#0868ac', '#084081'],
      },
      textStyle: { color: '#333' },
    },
    series: [
      {
        name: '用电量',
        type: 'map',
        map: 'guizhou',
        roam: true,
        label: {
          show: true,
          fontSize: 10,
          formatter: (params: any) => {
            // Shorten long autonomous prefecture names for display
            const name = params.name as string;
            if (name.includes('黔西南')) return '黔西南';
            if (name.includes('黔东南')) return '黔东南';
            if (name.includes('黔南')) return '黔南';
            return name.replace('市', '');
          },
        },
        emphasis: {
          label: { show: true, fontSize: 13, fontWeight: 'bold' },
          itemStyle: { areaColor: '#ffd666', shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' },
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 1.5,
        },
        data: mapData,
      },
    ],
  };

  // ---- Render ----

  return (
    <Layout style={{ padding: 16, background: '#f0f2f5', minHeight: 'calc(100vh - 64px)' }}>
      <Content>
        <Row gutter={16} style={{ height: '100%' }}>
          {/* Left: Map */}
          <Col xs={24} lg={14}>
            <Card
              title={
                <Space>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>贵州省地市级用电量地图</span>
                </Space>
              }
              style={{ height: '100%' }}
              styles={{ body: { padding: 0, height: 'calc(100% - 57px)' } }}
            >
              {mapReady ? (
                <ReactECharts
                  option={mapOption}
                  style={{ height: '100%', minHeight: 520 }}
                  opts={{ renderer: 'canvas' }}
                />
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 520, color: '#999' }}>
                  地图加载中...
                </div>
              )}
            </Card>
          </Col>

          {/* Right: Indicator Tree */}
          <Col xs={24} lg={10}>
            <Card
              title={
                <Space>
                  <ApartmentOutlined />
                  <span style={{ fontSize: 16, fontWeight: 600 }}>指标体系</span>
                </Space>
              }
              extra={
                <Button size="small" onClick={handleResetTree}>
                  恢复默认
                </Button>
              }
              style={{ height: '100%' }}
              styles={{ body: { overflow: 'auto', maxHeight: 'calc(100vh - 170px)' } }}
            >
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary">
                  鼠标悬停指标可进行编辑、添加子指标或删除操作
                </Text>
              </div>
              <style>{`
                .indicator-tree .tree-node-title:hover .tree-node-actions {
                  opacity: 1 !important;
                }
              `}</style>
              <Tree
                className="indicator-tree"
                treeData={convertToAntTreeData(treeData)}
                defaultExpandAll={false}
                expandedKeys={expandedKeys}
                onExpand={(keys) => setExpandedKeys(keys)}
                blockNode
                showLine={{ showLeafIcon: false }}
              />
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default M04IndicatorSystem;
