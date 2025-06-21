import React, { useEffect, useCallback } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Switch,
  Select,
  Space,
  Typography,
  Divider
} from 'antd';
import { LockOutlined, BellOutlined, SafetyOutlined, BgColorsOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Title } = Typography;

const Settings = () => {
  const { user } = useAuth();
  const [form] = Form.useForm();

  // 加载设置
  const loadSettings = useCallback(async () => {
    try {
      // 从localStorage获取设置
      const settings = {
        apiUrl: localStorage.getItem('apiUrl') || 'http://localhost:3001',
        checkInterval: parseInt(localStorage.getItem('checkInterval')) || 5,
        autoRefresh: localStorage.getItem('autoRefresh') === 'true',
        theme: localStorage.getItem('theme') || 'light',
        language: localStorage.getItem('language') || 'zh_CN'
      };
      
      form.setFieldsValue(settings);
    } catch (error) {
      console.error('加载设置失败:', error);
      message.error('加载设置失败');
    }
  }, [form]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleUpdatePassword = async (values) => {
    try {
      // 这里需要后端提供修改密码的接口
      message.info('密码修改功能开发中...');
    } catch (error) {
      message.error('修改密码失败');
    }
  };

  const handleUpdateSettings = async (values) => {
    try {
      // 这里需要后端提供更新设置的接口
      message.info('设置更新功能开发中...');
    } catch (error) {
      message.error('更新设置失败');
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div>
      <Card variant="borderless">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 修改密码 */}
          <div>
            <Title level={4}>
              <LockOutlined /> 修改密码
            </Title>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleUpdatePassword}
              style={{ maxWidth: 400 }}
            >
              <Form.Item
                name="oldPassword"
                label="当前密码"
                rules={[{ required: true, message: '请输入当前密码' }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="请输入当前密码" />
              </Form.Item>

              <Form.Item
                name="newPassword"
                label="新密码"
                rules={[
                  { required: true, message: '请输入新密码' },
                  { min: 6, message: '密码至少6个字符' }
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="请输入新密码" />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="确认新密码"
                dependencies={['newPassword']}
                rules={[
                  { required: true, message: '请确认新密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('newPassword') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="请确认新密码" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit">
                  修改密码
                </Button>
              </Form.Item>
            </Form>
          </div>

          <Divider />

          {/* 通知设置 */}
          <div>
            <Title level={4}>
              <BellOutlined /> 通知设置
            </Title>
            <Form
              layout="vertical"
              onFinish={handleUpdateSettings}
              style={{ maxWidth: 400 }}
            >
              <Form.Item
                name="emailNotification"
                label="邮件通知"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>

              <Form.Item
                name="loginNotification"
                label="登录通知"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit">
                  保存设置
                </Button>
              </Form.Item>
            </Form>
          </div>

          <Divider />

          {/* 安全设置 */}
          <div>
            <Title level={4}>
              <SafetyOutlined /> 安全设置
            </Title>
            <Form
              layout="vertical"
              onFinish={handleUpdateSettings}
              style={{ maxWidth: 400 }}
            >
              <Form.Item
                name="twoFactorAuth"
                label="两步验证"
                valuePropName="checked"
                initialValue={false}
              >
                <Switch />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit">
                  保存设置
                </Button>
              </Form.Item>
            </Form>
          </div>

          <Divider />

          {/* 界面设置 */}
          <div>
            <Title level={4}>
              <BgColorsOutlined /> 界面设置
            </Title>
            <Form
              layout="vertical"
              onFinish={handleUpdateSettings}
              style={{ maxWidth: 400 }}
            >
              <Form.Item
                name="theme"
                label="主题"
                initialValue="light"
              >
                <Select>
                  <Select.Option value="light">浅色</Select.Option>
                  <Select.Option value="dark">深色</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="language"
                label="语言"
                initialValue="zh_CN"
              >
                <Select>
                  <Select.Option value="zh_CN">简体中文</Select.Option>
                  <Select.Option value="en_US">English</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit">
                  保存设置
                </Button>
              </Form.Item>
            </Form>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default Settings; 