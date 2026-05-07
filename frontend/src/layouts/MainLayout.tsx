import React from 'react';
import { Layout, Menu, Typography } from 'antd';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { LineChartOutlined, BarChartOutlined, DatabaseOutlined, ApartmentOutlined } from '@ant-design/icons';

const { Header, Content } = Layout;
const { Title } = Typography;

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/m04',
      icon: <ApartmentOutlined />,
      label: '指标体系 (M1)',
    },
    {
      key: '/m02',
      icon: <BarChartOutlined />,
      label: '影响因素分析 (M2)',
    },
    {
      key: '/m03',
      icon: <LineChartOutlined />,
      label: '经济预测 (M3)',
    },
    {
      key: '/m01',
      icon: <DatabaseOutlined />,
      label: '数据管理 (M4)',
    },
  ];

  const handleMenuClick = (e: { key: string }) => {
    navigate(e.key);
  };

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Header 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          background: 'transparent', 
          padding: '0 24px',
          borderBottom: '1px solid #E2E5F2',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          zIndex: 100,
        }}
      >
        <div className="logo" style={{ marginRight: '48px', display: 'flex', alignItems: 'center' }}>
          <Title 
            level={4} 
            style={{ 
              color: '#0066E9', 
              margin: 0,
              fontSize: '18px',
              fontWeight: 'bold',
            }}
          >
            电力看经济平台
          </Title>
        </div>
        <Menu
          theme="light"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ 
            flex: 1, 
            minWidth: 0,
            background: 'transparent',
            borderBottom: 'none',
          }}
        />
      </Header>
      <Content style={{ padding: '16px', background: 'transparent' }}>
        <Outlet />
      </Content>
    </Layout>
  );
};

export default MainLayout;
