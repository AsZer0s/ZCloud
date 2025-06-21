import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Tag,
  Space,
  Typography,
  Alert,
  Avatar,
  Descriptions,
  Tooltip
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  ReloadOutlined,
  UserOutlined,
  QrcodeOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { QRCodeSVG } from 'qrcode.react';
import moment from 'moment';
import { wechatAccountAPI, loginAPI } from '../services/api';

const { Title, Text } = Typography;

const WeChatAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchAccounts();
  }, []);

  // 获取微信账号列表
  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const response = await wechatAccountAPI.getWeChatAccounts();
      setAccounts(response);
    } catch (error) {
      console.error('获取微信账号列表失败:', error);
      message.error('获取微信账号列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 生成新的微信账号
  const handleGenerateAccount = async (values) => {
    setLoading(true);
    try {
      // 1. 创建微信账号（后端会自动生成授权码）
      const response = await wechatAccountAPI.createWeChatAccount({
        nickname: values.nickname,
        days: values.days || 30
      });
      
      if (response.account) {
        const newAccount = response.account;
        
        // 2. 获取登录二维码
        const qrResponse = await loginAPI.getLoginQrCode(newAccount.auth_key, {
          Check: false,
          Proxy: ""
        });
        
        if (qrResponse?.Code === 200 && qrResponse?.Data?.QrCodeUrl) {
          // 3. 更新账号的二维码URL
          await wechatAccountAPI.updateWeChatAccountStatus(newAccount.id, {
            qr_code_url: qrResponse.Data.QrCodeUrl
          });
          
          // 4. 刷新列表
          await fetchAccounts();
          
          setModalVisible(false);
          form.resetFields();
          message.success('微信账号创建成功，请扫码登录');
          
          // 显示二维码
          const updatedAccount = {
            ...newAccount,
            qr_code_url: qrResponse.Data.QrCodeUrl
          };
          setSelectedAccount(updatedAccount);
          setQrModalVisible(true);
        } else {
          message.error('获取二维码失败');
        }
      } else {
        message.error('创建微信账号失败');
      }
    } catch (error) {
      console.error('创建微信账号失败:', error);
      message.error('创建微信账号失败: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  // 删除微信账号
  const handleDeleteAccount = async (accountId) => {
    try {
      await wechatAccountAPI.deleteWeChatAccount(accountId);
      message.success('微信账号删除成功');
      fetchAccounts(); // 刷新列表
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除微信账号失败: ' + (error.response?.data?.error || error.message));
    }
  };

  // 查看二维码
  const handleViewQRCode = async (account) => {
    try {
      // 如果账号没有二维码URL，重新获取
      if (!account.qr_code_url) {
        const qrResponse = await loginAPI.getLoginQrCode(account.auth_key, {
          Check: false,
          Proxy: ""
        });
        
        if (qrResponse?.Code === 200 && qrResponse?.Data?.QrCodeUrl) {
          await wechatAccountAPI.updateWeChatAccountStatus(account.id, {
            qr_code_url: qrResponse.Data.QrCodeUrl
          });
          account.qr_code_url = qrResponse.Data.QrCodeUrl;
        }
      }
      
      setSelectedAccount(account);
      setQrModalVisible(true);
    } catch (error) {
      console.error('获取二维码失败:', error);
      message.error('获取二维码失败');
    }
  };

  // 唤醒登录
  const handleWakeupLogin = async (account) => {
    try {
      if (!account.device_auth_key) {
        message.error('该账号未绑定设备，请先扫码登录');
        return;
      }

      const result = await wechatAccountAPI.wakeupLogin(account.auth_key);
      
      if (result.success) {
        message.success('唤醒登录成功');
        fetchAccounts(); // 刷新列表
      } else {
        message.error('唤醒登录失败: ' + (result.error || result.message));
      }
    } catch (error) {
      console.error('唤醒登录失败:', error);
      message.error('唤醒登录失败: ' + error.message);
    }
  };

  // 获取状态文本
  const getStatusText = (status) => {
    const statusMap = {
      'online': '在线',
      'offline': '离线',
      'waiting': '等待扫码',
      'scanning': '正在扫码'
    };
    return statusMap[status] || status;
  };

  // 获取状态颜色
  const getStatusColor = (status) => {
    const colorMap = {
      'online': 'green',
      'offline': 'red',
      'waiting': 'blue',
      'scanning': 'orange'
    };
    return colorMap[status] || 'default';
  };

  const columns = [
    {
      title: '头像',
      dataIndex: 'avatar',
      key: 'avatar',
      width: 60,
      render: (avatar, record) => (
        <Avatar 
          size={40} 
          src={avatar} 
          icon={<UserOutlined />}
        />
      ),
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (text) => text || '未登录',
    },
    {
      title: '授权码',
      dataIndex: 'auth_key',
      key: 'auth_key',
      render: (text) => (
        <Tooltip title={text}>
          <Text code style={{ fontSize: '12px' }}>
            {text.substring(0, 8)}...
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '设备授权码',
      dataIndex: 'device_auth_key',
      key: 'device_auth_key',
      render: (text) => text ? (
        <Tooltip title={text}>
          <Text code style={{ fontSize: '12px' }}>
            {text.substring(0, 8)}...
          </Text>
        </Tooltip>
      ) : '未绑定',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
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
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => moment(text).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<QrcodeOutlined />}
            onClick={() => handleViewQRCode(record)}
          >
            二维码
          </Button>
          {record.device_auth_key && (
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => handleWakeupLogin(record)}
              disabled={record.status === 'online'}
            >
              唤醒登录
            </Button>
          )}
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              // 查看账号详情
              Modal.info({
                title: '账号详情',
                content: (
                  <Descriptions bordered size="small">
                    <Descriptions.Item label="昵称" span={3}>
                      {record.nickname}
                    </Descriptions.Item>
                    <Descriptions.Item label="用户名" span={3}>
                      {record.username || '未登录'}
                    </Descriptions.Item>
                    <Descriptions.Item label="授权码" span={3}>
                      <Text code>{record.auth_key}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="设备授权码" span={3}>
                      {record.device_auth_key ? (
                        <Text code>{record.device_auth_key.substring(0, 8)}...</Text>
                      ) : (
                        '未绑定设备'
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="状态" span={3}>
                      <Tag color={getStatusColor(record.status)}>
                        {getStatusText(record.status)}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="创建时间" span={3}>
                      {moment(record.created_at).format('YYYY-MM-DD HH:mm:ss')}
                    </Descriptions.Item>
                    {record.days && (
                      <Descriptions.Item label="有效期(天)" span={3}>
                        {record.days}
                      </Descriptions.Item>
                    )}
                    {record.expires_at && (
                      <Descriptions.Item label="过期时间" span={3}>
                        {moment(record.expires_at).format('YYYY-MM-DD HH:mm:ss')}
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                ),
                width: 600,
              });
            }}
          >
            详情
          </Button>
          <Popconfirm
            title="确定要删除这个微信账号吗？"
            onConfirm={() => handleDeleteAccount(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" danger size="small" icon={<DeleteOutlined />}>
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
          <Title level={3}>微信账号管理</Title>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchAccounts}
              loading={loading}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalVisible(true)}
            >
              添加微信账号
            </Button>
          </Space>
        </div>

        <Alert
          message="微信账号说明"
          description={
            <div>
              <p><strong>功能:</strong> 管理所有微信账号，支持扫码登录和唤醒登录</p>
              <p><strong>状态:</strong> 在线、离线、等待扫码、正在扫码</p>
              <p><strong>设备授权码:</strong> 扫码登录后自动保存，用于唤醒登录</p>
              <p><strong>操作:</strong> 查看二维码、唤醒登录、查看详情、删除账号</p>
              <p><strong>唤醒登录:</strong> 对于已绑定设备的账号，可以快速重新登录</p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Table
          columns={columns}
          dataSource={accounts}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      {/* 添加微信账号弹窗 */}
      <Modal
        title="添加微信账号"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          onFinish={handleGenerateAccount}
          layout="vertical"
        >
          <Form.Item
            name="nickname"
            label="账号昵称"
            rules={[{ required: true, message: '请输入账号昵称' }]}
          >
            <Input placeholder="请输入账号昵称" />
          </Form.Item>

          <Form.Item
            name="days"
            label="有效期(天)"
            rules={[{ required: true, message: '请输入有效期' }]}
            initialValue={30}
          >
            <Input
              type="number"
              min={1}
              max={365}
              placeholder="请输入有效期天数"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              生成并获取二维码
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 二维码弹窗 */}
      <Modal
        title={`微信登录二维码 - ${selectedAccount?.nickname}`}
        open={qrModalVisible}
        onCancel={() => setQrModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setQrModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={400}
        centered
      >
        <div style={{ textAlign: 'center' }}>
          {selectedAccount?.qr_code_url ? (
            <div>
              <QRCodeSVG 
                value={selectedAccount.qr_code_url} 
                size={200} 
                level="M"
                style={{ marginBottom: 16 }}
              />
              <div>
                <Text type="secondary">
                  请使用微信扫描二维码登录
                </Text>
              </div>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">
                  状态: {getStatusText(selectedAccount.status)}
                </Text>
              </div>
            </div>
          ) : (
            <div>暂无二维码</div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default WeChatAccounts;