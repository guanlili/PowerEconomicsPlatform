import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Card, Collapse, Tag, Input, Button, Space, Typography, Tooltip, Modal, App, Row, Col } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SaveOutlined,
  CloseOutlined,
  ApartmentOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

const { Content } = Layout;
const { Text } = Typography;

// ========== Data Types ==========

interface IndicatorItem {
  key: string;
  title: string;
}

interface SceneData {
  key: string;
  title: string;
  inputs: IndicatorItem[];
  outputs: IndicatorItem[];
}

// ========== Default Indicator Data (Input / Output separated) ==========

const DEFAULT_SCENES: SceneData[] = [
  {
    key: '1-1',
    title: '区域场景',
    inputs: [
      { key: '1-1-i1', title: '区域用电量' },
      { key: '1-1-i2', title: '月内每日最低温度均值' },
      { key: '1-1-i3', title: '月内每日最高温度均值' },
      { key: '1-1-i4', title: '月内总降雨量' },
      { key: '1-1-i5', title: '社会消费品零售总额' },
      { key: '1-1-i6', title: '城镇化率' },
      { key: '1-1-i7', title: '常住人口' },
      { key: '1-1-i8', title: '清洁能源占比' },
      { key: '1-1-i9', title: '发电量' },
    ],
    outputs: [
      { key: '1-1-o1', title: '生产总值(GDP)' },
      { key: '1-1-o2', title: '固定资产投资' },
      { key: '1-1-o3', title: '居民消费价格指数(CPI)' },
      { key: '1-1-o4', title: '规模以上工业增加值' },
      { key: '1-1-o5', title: '生产价格指数(PPI)' },
      { key: '1-1-o6', title: '经济增加值' },
      { key: '1-1-o7', title: '进出口总额' },
      { key: '1-1-o8', title: '经济增速' },
    ],
  },
  {
    key: '1-2',
    title: '产业场景',
    inputs: [
      { key: '1-2-i1', title: '产业用电量' },
      { key: '1-2-i2', title: '月内每日最低温度均值' },
      { key: '1-2-i3', title: '月内每日最高温度均值' },
      { key: '1-2-i4', title: '月内总降雨量' },
      { key: '1-2-i5', title: '劳动生产率' },
      { key: '1-2-i6', title: '消费者价格指数(CPI)' },
      { key: '1-2-i7', title: '电网负荷率' },
      { key: '1-2-i8', title: '农产品价格指数' },
      { key: '1-2-i9', title: '相对湿度' },
      { key: '1-2-i10', title: '畜牧业产值' },
      { key: '1-2-i11', title: '水产品产量' },
      { key: '1-2-i12', title: '能源价格指数' },
      { key: '1-2-i13', title: '煤炭价格指数' },
      { key: '1-2-i14', title: '芯片/集成电路产量' },
      { key: '1-2-i15', title: '电动机产量' },
      { key: '1-2-i16', title: '化学农药原药' },
      { key: '1-2-i17', title: '汽车产量' },
      { key: '1-2-i18', title: '火电机组利用小时数' },
      { key: '1-2-i19', title: '社会消费品零售总额' },
      { key: '1-2-i20', title: '金融业增加值' },
      { key: '1-2-i21', title: '物流运输量' },
      { key: '1-2-i22', title: '仓储设施总面积' },
      { key: '1-2-i23', title: '5G基站数量' },
      { key: '1-2-i24', title: '旅游收入' },
      { key: '1-2-i25', title: '旅游人次' },
      { key: '1-2-i26', title: '清洁能源占比' },
    ],
    outputs: [
      { key: '1-2-o1', title: '产业增加值' },
      { key: '1-2-o2', title: '产业增加值增速' },
      { key: '1-2-o3', title: '进出口总额' },
      { key: '1-2-o4', title: '全民消费品零售总额' },
      { key: '1-2-o5', title: '居民人均可支配收入' },
      { key: '1-2-o6', title: '产业增加值占GDP比重' },
    ],
  },
  {
    key: '1-3',
    title: '行业场景',
    inputs: [
      { key: '1-3-i1', title: '行业用电量' },
      { key: '1-3-i2', title: '月内每日最低温度均值' },
      { key: '1-3-i3', title: '月内每日最高温度均值' },
      { key: '1-3-i4', title: '月内总降雨量' },
      { key: '1-3-i5', title: '有色金属现货均价' },
      { key: '1-3-i6', title: '有色金属产量' },
      { key: '1-3-i7', title: '产成品存货' },
      { key: '1-3-i8', title: '用电价格' },
      { key: '1-3-i9', title: '行业绿电消纳占比' },
      { key: '1-3-i10', title: '钢材产量' },
      { key: '1-3-i11', title: '铁矿石进口均价' },
      { key: '1-3-i12', title: '钢材综合价格指数' },
      { key: '1-3-i13', title: '负荷峰谷差率' },
      { key: '1-3-i14', title: '化工产品价格指数（CCPI）' },
      { key: '1-3-i15', title: '原油购进价格' },
      { key: '1-3-i16', title: '煤炭购进价格' },
      { key: '1-3-i17', title: '行业产能利用率' },
      { key: '1-3-i18', title: '供电可靠性' },
      { key: '1-3-i19', title: '固定资产投资完成额' },
      { key: '1-3-i20', title: '房地产开发投资额' },
      { key: '1-3-i21', title: '水泥产量' },
      { key: '1-3-i22', title: '玻璃产量' },
      { key: '1-3-i23', title: '用电负荷率' },
      { key: '1-3-i24', title: '电煤购进价格指数' },
      { key: '1-3-i25', title: '电力、热力生产和供应业固定资产投资额' },
      { key: '1-3-i26', title: '发电设备平均利用小时数' },
      { key: '1-3-i27', title: '布伦特原油现货价格' },
      { key: '1-3-i28', title: '石油煤炭加工行业出厂价格指数' },
      { key: '1-3-i29', title: '行业固定资产投资额' },
      { key: '1-3-i30', title: '可再生能源消纳率' },
      { key: '1-3-i31', title: '计算机通信和其他电子设备制造业出厂价格指数' },
      { key: '1-3-i32', title: '集成电路进口均价' },
      { key: '1-3-i33', title: '出口交货值' },
      { key: '1-3-i34', title: '绿电与可再生能源证书（绿证）认购权重' },
      { key: '1-3-i35', title: '金属价格' },
      { key: '1-3-i36', title: '电气机械和器材制造业出厂价格指数' },
      { key: '1-3-i37', title: '月用电最大负荷' },
      { key: '1-3-i38', title: '汽车制造业出厂价格指数' },
      { key: '1-3-i39', title: '汽车产量' },
      { key: '1-3-i40', title: '汽车销量' },
      { key: '1-3-i41', title: '汽车制造业固定资产投资额' },
      { key: '1-3-i42', title: '通用设备制造业出厂价格指数' },
      { key: '1-3-i43', title: '黑色金属购进价格' },
      { key: '1-3-i44', title: '通用设备制造业固定资产投资额' },
      { key: '1-3-i45', title: '行业研发经费投入' },
      { key: '1-3-i46', title: '互联网宽带接入用户数' },
      { key: '1-3-i47', title: '从业人员平均工资' },
      { key: '1-3-i48', title: '信息技术服务出口额' },
      { key: '1-3-i49', title: '备用电源供电保障时长' },
      { key: '1-3-i50', title: '酒、饮料和精制茶制造业出厂价格指数' },
      { key: '1-3-i51', title: '社会消费品零售总额' },
      { key: '1-3-i52', title: '粮食购进价格' },
      { key: '1-3-i53', title: '原料购进价格' },
      { key: '1-3-i54', title: '农产品购进价格' },
      { key: '1-3-i55', title: '旅游及餐饮业营业额' },
    ],
    outputs: [
      { key: '1-3-o1', title: '行业增加值' },
      { key: '1-3-o2', title: '行业总产值' },
      { key: '1-3-o3', title: '行业利润率' },
      { key: '1-3-o4', title: '营业收入' },
      { key: '1-3-o5', title: '利润总额' },
      { key: '1-3-o6', title: '进出口额' },
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

// ========== Helpers ==========

let keyCounter = 2000;
const generateKey = () => `node-${++keyCounter}`;

const deepCloneScenes = (scenes: SceneData[]): SceneData[] =>
  scenes.map((s) => ({
    ...s,
    inputs: s.inputs.map((i) => ({ ...i })),
    outputs: s.outputs.map((o) => ({ ...o })),
  }));

// ========== Sub-Components ==========

/** Flow divider arrow between input and output sections */
const FlowDivider: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0', gap: 8 }}>
    <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, #0066E9, #E2E5F2)' }} />
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 16px',
        background: '#E6F4FF',
        borderRadius: '2px',
        border: '1px solid #0066E9',
        fontSize: '13px',
        color: '#0066E9',
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      <ArrowDownOutlined />
      预测输出
    </div>
    <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, #0066E9, #E2E5F2)' }} />
  </div>
);

/** Section header for input/output groups */
const SectionHeader: React.FC<{
  type: 'input' | 'output';
  count: number;
  onAdd: () => void;
}> = ({ type, count, onAdd }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
    <Space size={8}>
      <Tag 
        style={{ 
          margin: 0,
          background: type === 'input' ? '#E6F4FF' : '#F6FFED',
          color: type === 'input' ? '#0066E9' : '#52C41A',
          border: `1px solid ${type === 'input' ? '#0066E9' : '#52C41A'}`,
          borderRadius: '2px',
          fontSize: '12px',
          fontWeight: 500,
        }}
      >
        {type === 'input' ? '输入指标' : '输出指标'}
      </Tag>
      <Text style={{ fontSize: '13px', color: '#3B5F8D' }}>({count}项)</Text>
    </Space>
    <Tooltip title={`添加${type === 'input' ? '输入' : '输出'}指标`}>
      <Button 
        type="text" 
        size="small" 
        icon={<PlusOutlined />} 
        onClick={onAdd}
        style={{ color: '#0066E9' }}
      />
    </Tooltip>
  </div>
);

/** Single indicator row with hover edit/delete actions */
const IndicatorRow: React.FC<{
  item: IndicatorItem;
  type: 'input' | 'output';
  isEditing: boolean;
  editValue: string;
  onEditValueChange: (val: string) => void;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}> = ({ item, type, isEditing, editValue, onEditValueChange, onStartEdit, onSave, onCancel, onDelete }) => {
  const borderColor = type === 'input' ? '#0066E9' : '#52C41A';

  if (isEditing) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 12px',
          marginBottom: 4,
          borderLeft: `3px solid ${borderColor}`,
          borderRadius: '0 2px 2px 0',
          background: 'rgba(245, 247, 250, 0.55)',
        }}
      >
        <Input
          size="small"
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          onPressEnter={onSave}
          onKeyDown={(e) => e.key === 'Escape' && onCancel()}
          style={{ flex: 1, marginRight: 8, borderRadius: '2px' }}
          autoFocus
        />
        <Button type="link" size="small" icon={<SaveOutlined />} onClick={onSave} style={{ color: '#52C41A', padding: '0 4px' }} />
        <Button type="link" size="small" icon={<CloseOutlined />} onClick={onCancel} style={{ color: '#FF4D4F', padding: '0 4px' }} />
      </div>
    );
  }

  return (
    <div
      className="indicator-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '6px 12px',
        marginBottom: 4,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: '0 2px 2px 0',
        background: 'rgba(245, 247, 250, 0.55)',
        transition: 'background 0.2s',
        cursor: 'default',
      }}
    >
      <Text style={{ flex: 1, fontSize: '14px', color: '#000409' }} ellipsis={{ tooltip: item.title }}>
        {item.title}
      </Text>
      <span className="indicator-actions" style={{ opacity: 0, transition: 'opacity 0.2s', whiteSpace: 'nowrap' }}>
        <Tooltip title="编辑">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={onStartEdit} style={{ padding: '0 4px', color: '#0066E9' }} />
        </Tooltip>
        <Tooltip title="删除">
          <Button type="link" size="small" icon={<DeleteOutlined />} onClick={onDelete} style={{ padding: '0 4px', color: '#FF4D4F' }} />
        </Tooltip>
      </span>
    </div>
  );
};

// ========== Main Component ==========

const M04IndicatorSystem: React.FC = () => {
  const [scenes, setScenes] = useState<SceneData[]>(deepCloneScenes(DEFAULT_SCENES));
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const { message } = App.useApp();

  // Load GeoJSON and register map
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}guizhou.json`)
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

  // ---- Edit handlers ----

  const handleStartEdit = useCallback((key: string, title: string) => {
    setEditingKey(key);
    setEditValue(title);
  }, []);

  const handleSaveEdit = useCallback(
    (sceneKey: string, type: 'input' | 'output') => {
      if (!editingKey || !editValue.trim()) {
        message.warning('指标名称不能为空');
        return;
      }
      const field = type === 'input' ? 'inputs' : 'outputs';
      setScenes((prev) =>
        prev.map((s) =>
          s.key !== sceneKey
            ? s
            : {
                ...s,
                [field]: s[field].map((item) =>
                  item.key === editingKey ? { ...item, title: editValue.trim() } : item
                ),
              }
        )
      );
      setEditingKey(null);
      setEditValue('');
      message.success('修改成功');
    },
    [editingKey, editValue]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingKey(null);
    setEditValue('');
  }, []);

  const handleDelete = useCallback((sceneKey: string, type: 'input' | 'output', itemKey: string, title: string) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除指标"${title}"吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        const field = type === 'input' ? 'inputs' : 'outputs';
        setScenes((prev) =>
          prev.map((s) =>
            s.key !== sceneKey ? s : { ...s, [field]: s[field].filter((item) => item.key !== itemKey) }
          )
        );
        message.success('删除成功');
      },
    });
  }, []);

  const handleAdd = useCallback((sceneKey: string, type: 'input' | 'output') => {
    const newKey = generateKey();
    const field = type === 'input' ? 'inputs' : 'outputs';
    setScenes((prev) =>
      prev.map((s) =>
        s.key !== sceneKey ? s : { ...s, [field]: [...s[field], { key: newKey, title: '新指标' }] }
      )
    );
    setEditingKey(newKey);
    setEditValue('新指标');
  }, []);

  const handleReset = useCallback(() => {
    Modal.confirm({
      title: '重置指标体系',
      content: '确定要恢复默认指标体系吗？所有修改将丢失。',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        setScenes(deepCloneScenes(DEFAULT_SCENES));
        setEditingKey(null);
        setEditValue('');
        message.success('已恢复默认指标体系');
      },
    });
  }, []);

  // ---- Build Collapse items ----

  const collapseItems = scenes.map((scene) => ({
    key: scene.key,
    label: (
      <Space>
        <span style={{ fontWeight: 600, fontSize: '14px', color: '#000409' }}>{scene.title}</span>
        <Tag
          style={{
            margin: 0,
            background: '#E6F4FF',
            color: '#0066E9',
            border: '1px solid #0066E9',
            fontSize: '12px',
            lineHeight: '20px',
            borderRadius: '2px',
            fontWeight: 500,
          }}
        >
          输入 {scene.inputs.length} + 输出 {scene.outputs.length}
        </Tag>
      </Space>
    ),
    children: (
      <div>
        {/* Input section */}
        <SectionHeader type="input" count={scene.inputs.length} onAdd={() => handleAdd(scene.key, 'input')} />
        {scene.inputs.map((item) => (
          <IndicatorRow
            key={item.key}
            item={item}
            type="input"
            isEditing={editingKey === item.key}
            editValue={editValue}
            onEditValueChange={setEditValue}
            onStartEdit={() => handleStartEdit(item.key, item.title)}
            onSave={() => handleSaveEdit(scene.key, 'input')}
            onCancel={handleCancelEdit}
            onDelete={() => handleDelete(scene.key, 'input', item.key, item.title)}
          />
        ))}

        {/* Flow arrow divider */}
        <FlowDivider />

        {/* Output section */}
        <SectionHeader type="output" count={scene.outputs.length} onAdd={() => handleAdd(scene.key, 'output')} />
        {scene.outputs.map((item) => (
          <IndicatorRow
            key={item.key}
            item={item}
            type="output"
            isEditing={editingKey === item.key}
            editValue={editValue}
            onEditValueChange={setEditValue}
            onStartEdit={() => handleStartEdit(item.key, item.title)}
            onSave={() => handleSaveEdit(scene.key, 'output')}
            onCancel={handleCancelEdit}
            onDelete={() => handleDelete(scene.key, 'output', item.key, item.title)}
          />
        ))}
      </div>
    ),
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
    <Layout style={{ padding: 0, background: 'transparent', minHeight: 'calc(100vh - 64px)' }}>
      <Content>
        <style>{`
          .indicator-row:hover {
            background: rgba(230, 244, 255, 0.7) !important;
          }
          .indicator-row:hover .indicator-actions {
            opacity: 1 !important;
          }
          /* 设计规范 - 折叠面板样式 */
          .ant-collapse {
            background: transparent;
            border: none;
          }
          .ant-collapse-item {
            border: 1px solid #E2E5F2;
            border-radius: 4px;
            margin-bottom: 8px;
          }
          .ant-collapse-header {
            border-radius: 4px 4px 0 0 !important;
            font-weight: 600;
          }
          .ant-collapse-content {
            border-top: 1px solid #E2E5F2;
          }
        `}</style>
        <Row gutter={16} style={{ height: '100%' }}>
          {/* Left: Map */}
          <Col xs={24} lg={14}>
            <Card
              title={
                <Space>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#000409' }}>
                    贵州省地市级用电量地图
                  </span>
                </Space>
              }
              style={{ 
                height: '100%',
                borderRadius: '4px',
                border: '1px solid #E2E5F2',
              }}
              styles={{
                header: {
                  borderBottom: '1px solid #E2E5F2',
                  padding: '16px 20px',
                },
                body: { padding: 0, height: 'calc(100% - 57px)' },
              }}
            >
              {mapReady ? (
                <ReactECharts
                  option={mapOption}
                  style={{ height: '100%', minHeight: 520 }}
                  opts={{ renderer: 'canvas' }}
                />
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 520, color: '#3B5F8D' }}>
                  地图加载中...
                </div>
              )}
            </Card>
          </Col>

          {/* Right: Indicator System */}
          <Col xs={24} lg={10}>
            <Card
              title={
                <Space>
                  <ApartmentOutlined style={{ color: '#0066E9' }} />
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#000409' }}>
                    电力看经济指标体系
                  </span>
                </Space>
              }
              extra={
                <Button 
                  size="small" 
                  onClick={handleReset}
                  style={{
                    borderRadius: '2px',
                    borderColor: '#D3D9E8',
                    color: '#3B5F8D',
                  }}
                >
                  恢复默认
                </Button>
              }
              style={{ 
                height: '100%',
                borderRadius: '4px',
                border: '1px solid #E2E5F2',
              }}
              styles={{
                header: {
                  borderBottom: '1px solid #E2E5F2',
                  padding: '16px 20px',
                },
                body: { overflow: 'auto', maxHeight: 'calc(100vh - 170px)', padding: '16px 20px' },
              }}
            >
              <div style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: '13px', color: '#3B5F8D' }}>
                  每个场景包含输入指标和输出指标，鼠标悬停指标可编辑或删除
                </Text>
              </div>
              <Collapse
                accordion
                defaultActiveKey={['1-1']}
                items={collapseItems}
              />
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default M04IndicatorSystem;
