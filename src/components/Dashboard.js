import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Tag, Space, Button, message, Modal, Form, Input } from 'antd';
import { 
  WechatOutlined, 
  EditOutlined, 
  DeleteOutlined,
  PoweroffOutlined,
  QrcodeOutlined
} from '@ant-design/icons';
import { localApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import { QRCodeSVG } from 'qrcode.react';

const Dashboard = () => {
  const { user, authLoading } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [form] = Form.useForm();

  // 使用 useCallback 包装 fetchAccounts 函数
  const fetchAccounts = useCallback(async () => {
    console.log('Dashboard - 开始获取账号列表');
    console.log('Dashboard - 当前用户信息:', user);
    setLoading(true);
    try {
      console.log('Dashboard - 准备发送请求到 /api/wechat-accounts');
      const response = await localApi.get('/api/wechat-accounts');
      console.log('Dashboard - 收到响应:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });
      setAccounts(response.data);
    } catch (error) {
      console.error('Dashboard - 获取账号列表失败:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.config?.headers
      });
      message.error(error.response?.data?.error || '获取账号列表失败');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 添加调试日志
  useEffect(() => {
    console.log('Dashboard - 认证状态:', { user, authLoading });
  }, [user, authLoading]);

  // 检查用户状态
  useEffect(() => {
    console.log('Dashboard - 检查用户状态:', { user, authLoading });
    if (!authLoading && !user) {
      console.log('Dashboard - 用户未登录，准备跳转到登录页面');
      navigate('/login');
    } else if (!authLoading && user) {
      console.log('Dashboard - 用户已登录，准备获取账号列表');
      fetchAccounts();
    }
  }, [user, authLoading, navigate, fetchAccounts]);

  // 唤醒登录
  const handleWakeupLogin = async (account) => {
    try {
      const response = await localApi.post('/api/wechat/wakeup-login', {
        auth_key: account.auth_key
      });
      if (response.data.success) {
        message.success('唤醒登录成功');
        fetchAccounts();
      } else {
        message.error('唤醒登录失败: ' + (response.data.error || response.data.message));
      }
    } catch (error) {
      console.error('唤醒登录失败:', error);
      message.error('唤醒登录失败: ' + error.message);
    }
  };

  // 编辑账号
  const handleEdit = (account) => {
    setSelectedAccount(account);
    form.setFieldsValue({
      nickname: account.nickname,
      username: account.username
    });
    setModalVisible(true);
  };

  // 保存编辑
  const handleSave = async (values) => {
    try {
      await localApi.put(`/api/wechat-accounts/${selectedAccount.id}`, {
        nickname: values.nickname,
        username: values.username
      });
      message.success('更新成功');
      setModalVisible(false);
      fetchAccounts();
    } catch (error) {
      console.error('更新失败:', error);
      message.error('更新失败: ' + error.message);
    }
  };

  // 删除账号
  const handleDelete = async (account) => {
    try {
      await localApi.delete(`/api/wechat-accounts/${account.id}`);
      message.success('删除成功');
      fetchAccounts();
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败: ' + error.message);
    }
  };

  // 查看二维码
  const handleViewQRCode = (account) => {
    setSelectedAccount(account);
    setQrModalVisible(true);
  };

  const columns = [
    {
      title: '头像',
      dataIndex: 'avatar',
      key: 'avatar',
      render: (avatar) => (
        <img 
          src={avatar || 'https://via.placeholder.com/40'} 
          alt="avatar" 
          style={{ width: 40, height: 40, borderRadius: '50%' }} 
        />
      ),
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
    },
    {
      title: '微信号',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'online' ? 'green' : 'red'}>
          {status === 'online' ? '在线' : '离线'}
        </Tag>
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'last_login',
      key: 'last_login',
      render: (text) => text ? moment(text).format('YYYY-MM-DD HH:mm:ss') : '未登录',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button 
            type="primary" 
            icon={<PoweroffOutlined />}
            onClick={() => handleWakeupLogin(record)}
            disabled={record.status === 'online'}
          >
            唤醒登录
          </Button>
          <Button 
            icon={<QrcodeOutlined />}
            onClick={() => handleViewQRCode(record)}
          >
            查看二维码
          </Button>
          <Button 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button 
            danger 
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card 
        title={
          <Space>
            <WechatOutlined />
            <span>我的微信账号</span>
          </Space>
        }
        variant="borderless"
        style={{ borderRadius: 12 }}
      >
        <Table
          columns={columns}
          dataSource={accounts}
          rowKey="id"
          loading={loading}
        />
      </Card>

      {/* 编辑账号弹窗 */}
      <Modal
        title="编辑微信账号"
        open={modalVisible}
        onOk={form.submit}
        onCancel={() => setModalVisible(false)}
      >
        <Form
          form={form}
          onFinish={handleSave}
          layout="vertical"
        >
          <Form.Item
            name="nickname"
            label="昵称"
            rules={[{ required: true, message: '请输入昵称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="username"
            label="微信号"
            rules={[{ required: true, message: '请输入微信号' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* 二维码弹窗 */}
      <Modal
        title="登录二维码"
        open={qrModalVisible}
        onCancel={() => setQrModalVisible(false)}
        footer={null}
      >
        {selectedAccount?.qr_code_url ? (
          <div style={{ textAlign: 'center' }}>
            <QRCodeSVG value={selectedAccount.qr_code_url} size={256} />
            <p style={{ marginTop: 16 }}>
              使用微信扫描二维码登录
            </p>
          </div>
        ) : (
          <p>暂无二维码</p>
        )}
      </Modal>
    </div>
  );
};

export default Dashboard; 