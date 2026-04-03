import React from 'react';
import { Layout, Menu, Typography, Button } from 'antd';
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

  const user = localStorage.getItem('auth_user') || '';

  const handleLogout = () => {
    localStorage.removeItem('auth_user');
    navigate('/login', { replace: true });
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#F5F7FA' }}>
      <Header 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          background: '#fff', 
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {user ? (
            <span style={{ color: '#3B5F8D', fontSize: '14px' }}>
              {user}
            </span>
          ) : null}
          <Button 
            size="small" 
            onClick={handleLogout}
            style={{
              borderRadius: '2px',
              borderColor: '#D3D9E8',
              color: '#3B5F8D',
            }}
          >
            退出登录
          </Button>
        </div>
      </Header>
      <Content style={{ padding: '16px', background: '#F5F7FA' }}>
        <Outlet />
      </Content>
    </Layout>
  );
};

export default MainLayout;
