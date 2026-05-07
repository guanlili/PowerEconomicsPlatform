import React from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish = (values: { username: string; password: string }) => {
    const { username, password } = values;
    if (username === 'admin' && password === '123456') {
      localStorage.setItem('auth_user', username);
      message.success('登录成功');
      navigate('/m02', { replace: true });
    } else {
      message.error('用户名或密码错误');
    }
  };

  return (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh', 
        background: 'transparent',
      }}
    >
      <Card 
        style={{ 
          width: 400,
          borderRadius: '4px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid #E2E5F2',
        }}
        bodyStyle={{ padding: '32px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title 
            level={3} 
            style={{ 
              color: '#0066E9',
              margin: 0,
              fontSize: '22px',
              fontWeight: 'bold',
              marginBottom: 8,
            }}
          >
            电力看经济平台
          </Title>
          <div style={{ color: '#3B5F8D', fontSize: '14px' }}>请登录以继续</div>
        </div>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ username: 'admin', password: '123456' }}
        >
          <Form.Item 
            name="username" 
            label={<span style={{ color: '#000409', fontWeight: 500 }}>用户名</span>} 
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input 
              placeholder="请输入用户名" 
              autoComplete="username"
              style={{ borderRadius: '2px', height: '40px' }}
            />
          </Form.Item>
          <Form.Item 
            name="password" 
            label={<span style={{ color: '#000409', fontWeight: 500 }}>密码</span>} 
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password 
              placeholder="请输入密码" 
              autoComplete="current-password"
              style={{ borderRadius: '2px', height: '40px' }}
            />
          </Form.Item>
          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              block
              style={{ 
                height: '40px',
                fontSize: '16px',
                fontWeight: 500,
                borderRadius: '2px',
              }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
