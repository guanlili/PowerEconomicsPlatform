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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Title level={4}>电力看经济平台</Title>
          <div style={{ color: '#999' }}>请登录以继续</div>
        </div>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ username: 'admin', password: '123456' }}
        >
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="admin" autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password placeholder="123456" autoComplete="current-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
