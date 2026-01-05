import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import MainLayout from './layouts/MainLayout';
import M02Analysis from './pages/M02Analysis';
import M03Prediction from './pages/M03Prediction';

// Customize Ant Design locale to use Chinese month names in inputs
const customZhCN: any = {
  ...zhCN,
  DatePicker: {
    ...zhCN.DatePicker,
    lang: {
      ...zhCN.DatePicker?.lang,
      shortMonths: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
      months: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
    }
  }
};

const App: React.FC = () => {
  return (
    <ConfigProvider locale={customZhCN}>
      <Router>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/m02" replace />} />
            <Route path="m02" element={<M02Analysis />} />
            <Route path="m03" element={<M03Prediction />} />
            {/* M01 is disabled for now */}
          </Route>
        </Routes>
      </Router>
    </ConfigProvider>
  );
};

export default App;
