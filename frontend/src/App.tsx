import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import MainLayout from './layouts/MainLayout';
import M01DataManagement from './pages/M01DataManagement';
import M02Analysis from './pages/M02Analysis';
import M03Prediction from './pages/M03Prediction';
import M04IndicatorSystem from './pages/M04IndicatorSystem';
import Login from './pages/Login';

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
    <ConfigProvider locale={customZhCN}>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/m01" replace />} />
            <Route path="m01" element={<ProtectedRoute element={<M01DataManagement />} />} />
            <Route path="m02" element={<ProtectedRoute element={<M02Analysis />} />} />
            <Route path="m03" element={<ProtectedRoute element={<M03Prediction />} />} />
            <Route path="m04" element={<ProtectedRoute element={<M04IndicatorSystem />} />} />
          </Route>
        </Routes>
      </Router>
    </ConfigProvider>
  );
};

export default App;
