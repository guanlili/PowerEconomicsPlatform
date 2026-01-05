import React from 'react';
import { Layout, Menu, Typography } from 'antd';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { LineChartOutlined, BarChartOutlined, DatabaseOutlined } from '@ant-design/icons';

const { Header, Content } = Layout;
const { Title } = Typography;

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/m01',
      icon: <DatabaseOutlined />,
      label: '数据管理 (M01)',
      disabled: true, // As per PRD
    },
    {
      key: '/m02',
      icon: <BarChartOutlined />,
      label: '影响因素分析 (M02)',
    },
    {
      key: '/m03',
      icon: <LineChartOutlined />,
      label: '经济预测 (M03)',
    },
  ];

  const handleMenuClick = (e: { key: string }) => {
    navigate(e.key);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', background: '#001529', padding: '0 24px' }}>
        <div className="logo" style={{ marginRight: '48px', display: 'flex', alignItems: 'center' }}>
          <Title level={4} style={{ color: '#fff', margin: 0 }}>电力看经济平台</Title>
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ flex: 1, minWidth: 0 }}
        />
      </Header>
      <Content style={{ padding: '0 0px', background: '#f0f2f5' }}>
        <Outlet />
      </Content>
    </Layout>
  );
};

export default MainLayout;
