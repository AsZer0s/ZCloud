import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Tag,
  Space,
  Typography,
  Avatar,
  Tooltip
} from 'antd';
import { EditOutlined, DeleteOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import moment from 'moment';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;

const API_BASE_URL = 'http://localhost:3001';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();

  // 获取当前用户ID
  const getCurrentUserId = () => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      try {
        return JSON.parse(userInfo).id;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const userId = getCurrentUserId();
      if (!userId) {
        message.error('请先登录');
        return;
      }

      const headers = {
        'user-id': userId
      };

      const [userRes, deviceRes, accountRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/admin/users`, { headers }),
        axios.get(`${API_BASE_URL}/api/admin/devices`, { headers }),
        axios.get(`${API_BASE_URL}/api/admin/wechat-accounts`, { headers })
      ]);
      setUsers(userRes.data);
      setDevices(deviceRes.data);
      setAccounts(accountRes.data);
    } catch (error) {
      console.error('数据加载错误:', error);
      if (error.response?.status === 403) {
        message.error('需要管理员权限');
      } else if (error.response?.status === 401) {
        message.error('请先登录');
      } else {
        message.error('数据加载失败: ' + (error.response?.data?.error || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const getRoleText = (role) => {
    const roleMap = {
      admin: '管理员',
      agent: '销售代理',
      user: '用户'
    };
    return roleMap[role] || role;
  };

  const getRoleColor = (role) => {
    const colorMap = {
      admin: 'red',
      agent: 'blue',
      user: 'green'
    };
    return colorMap[role] || 'default';
  };

  // 子表格：设备
  const DeviceTable = ({ userId }) => {
    const userDevices = devices.filter(d => d.user_id === userId);
    const columns = [
      { title: '设备ID', dataIndex: 'id', key: 'id', width: 80 },
      { title: '设备名称', dataIndex: 'device_name', key: 'device_name' },
      { title: '状态', dataIndex: 'status', key: 'status', render: (status) => <Tag color={status === 'online' ? 'green' : 'red'}>{status === 'online' ? '在线' : '离线'}</Tag> },
      { title: '授权码', dataIndex: 'auth_key', key: 'auth_key', render: (text) => <Tooltip title={text}><Text code>{text?.slice(0,8)}...</Text></Tooltip> },
      { title: '最后登录', dataIndex: 'last_login', key: 'last_login', render: (text) => text ? moment(text).format('YYYY-MM-DD HH:mm:ss') : '未登录' },
      { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (text) => moment(text).format('YYYY-MM-DD HH:mm:ss') },
    ];
    return <Table columns={columns} dataSource={userDevices} rowKey="id" size="small" pagination={false} locale={{emptyText:'暂无设备'}} />;
  };

  // 子表格：微信账号
  const AccountTable = ({ userId }) => {
    const userAccounts = accounts.filter(a => a.user_id === userId);
    const columns = [
      { title: '头像', dataIndex: 'avatar', key: 'avatar', width: 60, render: (avatar) => <Avatar size={32} src={avatar} icon={<EyeOutlined />} /> },
      { title: '昵称', dataIndex: 'nickname', key: 'nickname' },
      { title: '用户名', dataIndex: 'username', key: 'username', render: (text) => text || '未登录' },
      { title: '授权码', dataIndex: 'auth_key', key: 'auth_key', render: (text) => <Tooltip title={text}><Text code>{text?.slice(0,8)}...</Text></Tooltip> },
      { title: '设备授权码', dataIndex: 'device_auth_key', key: 'device_auth_key', render: (text) => text ? <Tooltip title={text}><Text code>{text?.slice(0,8)}...</Text></Tooltip> : '未绑定' },
      { title: '状态', dataIndex: 'status', key: 'status', render: (status) => <Tag color={status==='online'?'green':status==='waiting'?'blue':status==='scanning'?'orange':'red'}>{status==='online'?'在线':status==='waiting'?'等待扫码':status==='scanning'?'正在扫码':'离线'}</Tag> },
      { title: '最后登录', dataIndex: 'last_login', key: 'last_login', render: (text) => text ? moment(text).format('YYYY-MM-DD HH:mm:ss') : '未登录' },
      { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (text) => moment(text).format('YYYY-MM-DD HH:mm:ss') },
    ];
    return <Table columns={columns} dataSource={userAccounts} rowKey="id" size="small" pagination={false} locale={{emptyText:'暂无微信账号'}} />;
  };

  // 嵌套表格渲染
  const expandedRowRender = (record) => (
    <div style={{ background: '#fafbfc', padding: 16, borderRadius: 8 }}>
      <Title level={5} style={{ marginBottom: 8 }}>设备信息</Title>
      <DeviceTable userId={record.id} />
      <Title level={5} style={{ margin: '16px 0 8px' }}>微信账号信息</Title>
      <AccountTable userId={record.id} />
    </div>
  );

  // 打开编辑模态框
  const handleEdit = (record) => {
    setEditingUser(record);
    form.setFieldsValue({
      username: record.username,
      email: record.email,
      role: record.role,
      phone: record.phone
    });
    setModalVisible(true);
  };

  // 处理表单提交
  const handleSubmit = async (values) => {
    try {
      const userId = getCurrentUserId();
      if (!userId) {
        message.error('请先登录');
        return;
      }

      const headers = {
        'user-id': userId
      };

      await axios.put(`${API_BASE_URL}/api/admin/users/${editingUser.id}`, values, { headers });
      message.success('用户信息更新成功');
      setModalVisible(false);
      fetchAllData(); // 刷新数据
    } catch (error) {
      console.error('更新用户信息失败:', error);
      message.error('更新用户信息失败: ' + (error.response?.data?.error || error.message));
    }
  };

  // 处理删除用户
  const handleDelete = async (userId) => {
    try {
      const currentUserId = getCurrentUserId();
      if (!currentUserId) {
        message.error('请先登录');
        return;
      }

      const headers = {
        'user-id': currentUserId
      };

      await axios.delete(`${API_BASE_URL}/api/admin/users/${userId}`, { headers });
      message.success('用户删除成功');
      fetchAllData(); // 刷新数据
    } catch (error) {
      console.error('删除用户失败:', error);
      message.error('删除用户失败: ' + (error.response?.data?.error || error.message));
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    { title: '角色', dataIndex: 'role', key: 'role', render: (role) => <Tag color={getRoleColor(role)}>{getRoleText(role)}</Tag> },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (text) => moment(text).format('YYYY-MM-DD HH:mm:ss') },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个用户吗？"
            description="删除后无法恢复，请谨慎操作！"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              danger 
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card variant="borderless">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={3}>用户管理</Title>
          <Button icon={<ReloadOutlined />} onClick={fetchAllData} loading={loading}>刷新</Button>
        </div>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          expandable={{ expandedRowRender, expandRowByClick: true }}
          pagination={{ pageSize: 10, showSizeChanger: true, showQuickJumper: true, showTotal: (total) => `共 ${total} 条记录` }}
        />
      </Card>

      {/* 编辑用户模态框 */}
      <Modal
        title="编辑用户信息"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select>
              <Option value="admin">管理员</Option>
              <Option value="agent">销售代理</Option>
              <Option value="user">普通用户</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' }
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement; 