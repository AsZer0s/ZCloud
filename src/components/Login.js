import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Typography,
  Divider
} from 'antd';
import { 
  UserOutlined, 
  LockOutlined, 
  RobotOutlined,
  LoginOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // 添加调试日志
  useEffect(() => {
    console.log('登录组件 - 认证状态:', isAuthenticated);
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      console.log('检测到已认证，准备跳转到仪表板...');
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      console.log('开始登录流程...');
      const success = await login(values.username, values.password);
      console.log('登录结果:', success);
      
      if (success) {
        console.log('登录成功，等待状态更新...');
        // 登录成功后的导航由 useEffect 处理
      }
    } catch (error) {
      console.error('登录过程出错:', error);
      message.error('登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card 
        style={{ 
          width: 400, 
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          border: 'none'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <RobotOutlined style={{ fontSize: '48px', color: '#667eea', marginBottom: '16px' }} />
          <Title level={2} style={{ margin: 0, color: '#333' }}>
            用户登录
          </Title>
          <Text style={{ color: '#666' }}>
            欢迎回来，请登录您的账户
          </Text>
        </div>

        <Form
          form={form}
          onFinish={handleLogin}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="请输入用户名"
              style={{ borderRadius: '8px' }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="请输入密码"
              style={{ borderRadius: '8px' }}
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              block
              style={{ 
                height: '48px', 
                borderRadius: '8px',
                fontSize: '16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none'
              }}
            >
              <LoginOutlined /> 登录
            </Button>
          </Form.Item>
        </Form>

        <Divider>
          <Text style={{ color: '#666' }}>或</Text>
        </Divider>

        <div style={{ textAlign: 'center' }}>
          <Text style={{ color: '#666' }}>还没有账户？</Text>
          <Link to="/register" style={{ marginLeft: '8px', color: '#667eea' }}>
            立即注册
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Login; 