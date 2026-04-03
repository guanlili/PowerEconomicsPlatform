import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import type { ThemeConfig } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import MainLayout from './layouts/MainLayout';
import M01DataManagement from './pages/M01DataManagement';
import M02Analysis from './pages/M02Analysis';
import M03Prediction from './pages/M03Prediction';
import M04IndicatorSystem from './pages/M04IndicatorSystem';
import Login from './pages/Login';

// 设计规范主题配置
const themeConfig: ThemeConfig = {
  token: {
    // 主色调
    colorPrimary: '#0066E9',
    colorPrimaryHover: '#1D69DB',
    colorPrimaryActive: '#0052B8',
    
    // 文字颜色
    colorText: '#000409',
    colorTextSecondary: '#3B5F8D',
    colorTextTertiary: '#8C9BB0',
    
    // 边框和分割线
    colorBorder: '#D3D9E8',
    colorSplit: '#E2E5F2',
    
    // 背景色
    colorBgContainer: '#FFFFFF',
    colorBgLayout: '#F5F7FA',
    
    // 字体
    fontFamily: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    fontSize: 14,
    
    // 圆角
    borderRadius: 2,
    borderRadiusSM: 2,
    borderRadiusLG: 4,
    
    // 控件高度
    controlHeight: 34,
    controlHeightSM: 28,
    controlHeightLG: 40,
  },
  components: {
    Button: {
      borderRadius: 2,
      paddingInline: 16,
      paddingBlock: 6,
    },
    Card: {
      borderRadius: 4,
      paddingLG: 16,
    },
    Table: {
      borderRadius: 2,
      headerBg: '#F5F7FA',
      headerColor: '#000409',
      rowHoverBg: '#E6F4FF',
    },
    Input: {
      borderRadius: 2,
      paddingInline: 12,
    },
    Select: {
      borderRadius: 2,
    },
    Tag: {
      borderRadius: 2,
    },
    Menu: {
      itemHeight: 40,
    },
  },
};

// Customize Ant Design locale to use Chinese month names in inputs
const customZhCN = {
  ...zhCN,
  DatePicker: {
    ...zhCN.DatePicker,
    lang: {
      ...zhCN.DatePicker?.lang,
      shortMonths: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
      months: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
    }
  }
} as typeof zhCN;

const isAuthed = () => {
  try {
    const raw = localStorage.getItem('auth_user');
    return !!raw;
  } catch {
    return false;
  }
};

const ProtectedRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  return isAuthed() ? element : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  return (
    <ConfigProvider locale={customZhCN} theme={themeConfig}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/m04" replace />} />
            <Route path="m04" element={<ProtectedRoute element={<M04IndicatorSystem />} />} />
            <Route path="m02" element={<ProtectedRoute element={<M02Analysis />} />} />
            <Route path="m03" element={<ProtectedRoute element={<M03Prediction />} />} />
            <Route path="m01" element={<ProtectedRoute element={<M01DataManagement />} />} />
          </Route>
        </Routes>
      </Router>
    </ConfigProvider>
  );
};

export default App;
