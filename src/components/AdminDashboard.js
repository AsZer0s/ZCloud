import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Typography, Space, Alert, Result, Button } from 'antd';
import { UserOutlined, LaptopOutlined, StopOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentDevices, setRecentDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 如果不是管理员，直接重定向到仪表板
    if (!user || user.role !== 'admin') {
      navigate('/dashboard', { replace: true });
      return;
    }

    fetchAdminData();
  }, [user, navigate]);

  const fetchAdminData = async () => {
    try {
      // TODO: 这里需要替换为实际的API调用
      // 模拟数据
      const mockUsers = [
        { id: 1, username: 'user1', email: 'user1@example.com', registerTime: '2024-03-20 10:00:00', status: 'active' },
        { id: 2, username: 'user2', email: 'user2@example.com', registerTime: '2024-03-20 09:30:00', status: 'inactive' },
        { id: 3, username: 'user3', email: 'user3@example.com', registerTime: '2024-03-20 09:00:00', status: 'active' },
      ];

      const mockDevices = [
        { id: 1, deviceName: 'Device-001', ip: '192.168.1.100', lastOnline: '2024-03-20 10:15:00', status: 'online' },
        { id: 2, deviceName: 'Device-002', ip: '192.168.1.101', lastOnline: '2024-03-20 10:10:00', status: 'offline' },
        { id: 3, deviceName: 'Device-003', ip: '192.168.1.102', lastOnline: '2024-03-20 10:05:00', status: 'online' },
      ];

      setRecentUsers(mockUsers);
      setRecentDevices(mockDevices);
    } catch (error) {
      console.error('获取管理员数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 如果不是管理员，显示无权限提示
  if (!user || user.role !== 'admin') {
    return (
      <Result
        status="403"
        title="访问受限"
        subTitle="抱歉，您没有权限访问此页面。此页面仅对管理员开放。"
        icon={<StopOutlined style={{ color: '#ff4d4f' }} />}
        extra={
          <Button type="primary" onClick={() => navigate('/dashboard')}>
            返回仪表板
          </Button>
        }
      />
    );
  }

  const userColumns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '注册时间',
      dataIndex: 'registerTime',
      key: 'registerTime',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '活跃' : '未激活'}
        </Tag>
      ),
    },
  ];

  const deviceColumns = [
    {
      title: '设备名称',
      dataIndex: 'deviceName',
      key: 'deviceName',
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip',
    },
    {
      title: '最后在线时间',
      dataIndex: 'lastOnline',
      key: 'lastOnline',
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
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card variant="borderless">
        <Title level={4}>
          <UserOutlined /> 最近注册的用户
        </Title>
        <Table
          columns={userColumns}
          dataSource={recentUsers}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 5 }}
        />
      </Card>

      <Card variant="borderless">
        <Title level={4}>
          <LaptopOutlined /> 最近上线的设备
        </Title>
        <Table
          columns={deviceColumns}
          dataSource={recentDevices}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 5 }}
        />
      </Card>
    </Space>
  );
};

export default AdminDashboard; 