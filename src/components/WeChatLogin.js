import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Button,
  Input,
  message,
  Modal,
  Spin,
  Typography,
  Space,
  Alert,
  Descriptions,
  Avatar
} from 'antd';
import { 
  QrcodeOutlined, 
  UserOutlined, 
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { loginAPI, wechatAccountAPI } from '../services/api';

const { Title, Text } = Typography;

const WeChatLogin = () => {
  const [authKey, setAuthKey] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loginStatus, setLoginStatus] = useState('waiting'); // waiting, scanning, success, failed
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const statusCheckInterval = useRef(null);
  const authKeyRef = useRef(''); // 使用ref来存储最新的authKey

  // 更新authKey时同时更新ref
  const updateAuthKey = (key) => {
    setAuthKey(key);
    authKeyRef.current = key;
  };

  // 一键登录
  const handleOneClickLogin = async () => {
    setLoading(true);
    try {
      // 1. 生成授权码
      const response = await wechatAccountAPI.createWeChatAccount({
        nickname: '新微信账号',
        days: 30
      });
      
      if (!response.account?.auth_key) {
        throw new Error('生成授权码失败');
      }
      
      const newAuthKey = response.account.auth_key;
      updateAuthKey(newAuthKey);
      message.success('授权码生成成功！');
      
      console.log('开始获取二维码，授权码:', newAuthKey);
      
      // 2. 自动获取二维码
      const qrResponse = await loginAPI.getLoginQrCode(newAuthKey, {
        Check: false,
        Proxy: ""
      });
      
      console.log('二维码获取响应:', qrResponse);
      
      if (qrResponse?.Code === 200 && qrResponse?.Data?.QrCodeUrl) {
        setQrCodeUrl(qrResponse.Data.QrCodeUrl);
        setQrModalVisible(true);
        setLoginStatus('waiting');
        startStatusCheck();
        message.success('二维码获取成功，请扫码登录');
      } else {
        console.error('二维码获取失败:', qrResponse);
        message.error(qrResponse?.Text || '获取二维码失败');
      }
    } catch (error) {
      console.error('一键登录失败:', error);
      console.error('错误详情:', error.response?.data);
      message.error('一键登录失败: ' + (error.response?.data?.Text || error.message));
    } finally {
      setLoading(false);
    }
  };

  // 获取登录二维码（用于手动输入授权码）
  const getLoginQrCode = async () => {
    if (!authKey.trim()) {
      message.error('请先输入授权码');
      return;
    }

    setLoading(true);
    try {
      const response = await loginAPI.getLoginQrCode(authKey, {
        Check: false,
        Proxy: ""
      });
      
      if (response?.Code === 200 && response?.Data?.QrCodeUrl) {
        setQrCodeUrl(response.Data.QrCodeUrl);
        setQrModalVisible(true);
        setLoginStatus('waiting');
        startStatusCheck();
        message.success('二维码获取成功，请扫码登录');
      } else {
        message.error(response?.Text || '获取二维码失败');
      }
    } catch (error) {
      console.error('获取二维码失败:', error);
      message.error('获取二维码失败: ' + (error.response?.data?.Text || error.message));
    } finally {
      setLoading(false);
    }
  };

  // 开始检查登录状态
  const startStatusCheck = () => {
    if (statusCheckInterval.current) {
      clearInterval(statusCheckInterval.current);
    }

    statusCheckInterval.current = setInterval(async () => {
      try {
        // 使用ref中的authKey，避免闭包问题
        const currentAuthKey = authKeyRef.current;
        
        // 确保authKey存在
        if (!currentAuthKey) {
          console.error('authKey为空，无法检查登录状态');
          return;
        }
        
        console.log('检查登录状态，authKey:', currentAuthKey);
        const response = await loginAPI.checkLoginStatus(currentAuthKey, {});

        console.log('登录状态响应:', response);

        if (response?.Code === 200 && response?.Data) {
          // 根据API响应格式，使用state字段
          const state = response.Data.state;
          const uuid = response.Data.uuid;
          const effectiveTime = response.Data.effective_time;
          const ret = response.Data.ret;
          
          console.log('当前状态:', state, 'UUID:', uuid, '有效时间:', effectiveTime, '返回值:', ret);
          
          // 根据state值判断登录状态
          switch (state) {
            case 0:
              setLoginStatus('waiting');
              console.log('状态: 等待扫码');
              break;
            case 1:
              setLoginStatus('scanning');
              console.log('状态: 已扫码');
              break;
            case 2:
              setLoginStatus('success');
              console.log('状态: 登录成功');
              clearInterval(statusCheckInterval.current);
              
              // 自动关闭二维码窗口
              setQrModalVisible(false);
              
              // 设置用户资料（从API响应中获取）
              if (response.Data) {
                const userData = {
                  NickName: response.Data.nick_name,
                  UserName: response.Data.wxid,
                  HeadImgUrl: response.Data.head_img_url,
                  device: response.Data.device,
                  uuid: response.Data.uuid
                };
                setUserProfile(userData);
                
                // 保存账号信息到微信账号管理
                saveWeChatAccountToDatabase(userData, currentAuthKey);
              }
              
              message.success('登录成功！');
              break;
            case 3:
              setLoginStatus('failed');
              console.log('状态: 登录失败');
              clearInterval(statusCheckInterval.current);
              message.error('登录失败，请重试');
              break;
            default:
              console.log('未知状态:', state);
              // 如果ret不为0，可能表示有错误
              if (ret !== 0) {
                console.log('API返回错误，ret:', ret);
              }
              break;
          }
          
          // 检查有效时间，如果快过期了给出提示
          if (effectiveTime && effectiveTime < 30) {
            console.log('二维码即将过期，剩余时间:', effectiveTime, '秒');
          }
        } else {
          console.error('状态检查响应异常:', response);
        }
      } catch (error) {
        console.error('检查登录状态失败:', error);
      }
    }, 1000); // 改为每1秒检查一次，提高响应速度
  };

  // 保存微信账号到数据库
  const saveWeChatAccountToDatabase = async (userData, authKey) => {
    try {
      console.log('保存微信账号到数据库:', userData);
      
      const response = await wechatAccountAPI.createWeChatAccount({
        auth_key: authKey,
        device_auth_key: userData.device,
        nickname: userData.NickName,
        username: userData.UserName,
        avatar: userData.HeadImgUrl,
        status: 'online'
      });
      
      if (response.account) {
        console.log('微信账号保存成功:', response);
        message.success('账号信息已保存到管理系统');
      } else {
        console.error('保存微信账号失败:', response);
        message.error('保存账号信息失败: ' + (response.error || '未知错误'));
      }
    } catch (error) {
      console.error('保存微信账号到数据库失败:', error);
      message.error('保存账号信息失败: ' + error.message);
    }
  };

  // 重新获取二维码
  const refreshQrCode = () => {
    setQrCodeUrl('');
    setLoginStatus('waiting');
    handleOneClickLogin();
  };

  // 关闭二维码弹窗
  const handleCloseQrModal = () => {
    setQrModalVisible(false);
    if (statusCheckInterval.current) {
      clearInterval(statusCheckInterval.current);
    }
    setLoginStatus('waiting');
  };

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, []);

  const getStatusText = () => {
    switch (loginStatus) {
      case 'waiting':
        return '等待扫码';
      case 'scanning':
        return '正在扫码';
      case 'success':
        return '登录成功';
      case 'failed':
        return '登录失败';
      default:
        return '未知状态';
    }
  };

  const getStatusColor = () => {
    switch (loginStatus) {
      case 'waiting':
        return 'blue';
      case 'scanning':
        return 'orange';
      case 'success':
        return 'green';
      case 'failed':
        return 'red';
      default:
        return 'default';
    }
  };

  const getStatusIcon = () => {
    switch (loginStatus) {
      case 'waiting':
        return <ClockCircleOutlined />;
      case 'scanning':
        return <ReloadOutlined spin />;
      case 'success':
        return <CheckCircleOutlined />;
      case 'failed':
        return <ExclamationCircleOutlined />;
      default:
        return <ClockCircleOutlined />;
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card title="微信登录" style={{ maxWidth: 800, margin: '0 auto' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          
          {/* 一键登录按钮 */}
          <div style={{ textAlign: 'center' }}>
            <Button
              type="primary"
              size="large"
              icon={<QrcodeOutlined />}
              onClick={handleOneClickLogin}
              loading={loading}
              style={{ height: 50, fontSize: 16 }}
            >
              一键获取登录二维码
            </Button>
          </div>

          {/* 手动输入授权码（可选） */}
          <div>
            <Title level={4}>或手动输入授权码</Title>
            <Space>
              <Input
                placeholder="请输入授权码"
                value={authKey}
                onChange={(e) => updateAuthKey(e.target.value)}
                style={{ width: 300 }}
                onPressEnter={() => {
                  if (authKey.trim()) {
                    getLoginQrCode();
                  }
                }}
              />
              <Button
                icon={<QrcodeOutlined />}
                onClick={() => {
                  if (authKey.trim()) {
                    getLoginQrCode();
                  } else {
                    message.error('请输入授权码');
                  }
                }}
                loading={loading}
              >
                获取二维码
              </Button>
            </Space>
          </div>

          {/* 登录状态显示 */}
          {loginStatus !== 'waiting' && (
            <Alert
              message={`登录状态: ${getStatusText()}`}
              type={getStatusColor()}
              icon={getStatusIcon()}
              showIcon
            />
          )}

          {/* 用户资料显示 */}
          {userProfile && (
            <div>
              <Title level={4}>用户资料</Title>
              <Card>
                <Descriptions bordered>
                  <Descriptions.Item label="头像" span={3}>
                    <Avatar 
                      size={64} 
                      src={userProfile.HeadImgUrl} 
                      icon={<UserOutlined />}
                    />
                  </Descriptions.Item>
                  <Descriptions.Item label="昵称" span={3}>
                    {userProfile.NickName || '未知'}
                  </Descriptions.Item>
                  <Descriptions.Item label="微信号" span={3}>
                    {userProfile.UserName || '未知'}
                  </Descriptions.Item>
                  <Descriptions.Item label="设备类型" span={3}>
                    {userProfile.device || '未知'}
                  </Descriptions.Item>
                  <Descriptions.Item label="UUID" span={3}>
                    <Text code style={{ fontSize: '12px' }}>
                      {userProfile.uuid || '未知'}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="登录时间" span={3}>
                    {new Date().toLocaleString()}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </div>
          )}

          {/* 使用说明 */}
          <Alert
            message="使用说明"
            description={
              <div>
                <p>1. 点击"一键获取登录二维码"按钮</p>
                <p>2. 系统自动生成授权码并获取二维码</p>
                <p>3. 使用微信扫描显示的二维码</p>
                <p>4. 在手机上确认登录</p>
                <p>5. 登录成功后可以查看用户资料</p>
              </div>
            }
            type="info"
            showIcon
          />
        </Space>
      </Card>

      {/* 二维码弹窗 */}
      <Modal
        title="微信登录二维码"
        open={qrModalVisible}
        onCancel={handleCloseQrModal}
        footer={[
          <Button key="refresh" icon={<ReloadOutlined />} onClick={refreshQrCode}>
            刷新二维码
          </Button>,
          <Button key="close" onClick={handleCloseQrModal}>
            关闭
          </Button>
        ]}
        width={400}
        centered
      >
        <div style={{ textAlign: 'center' }}>
          {qrCodeUrl ? (
            <div>
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary">
                  请使用微信扫描二维码登录
                </Text>
              </div>
              
              {/* 显示二维码图片 */}
              <div style={{ marginBottom: 16 }}>
                <img 
                  src={qrCodeUrl} 
                  alt="微信登录二维码"
                  style={{ 
                    maxWidth: '100%', 
                    height: 'auto',
                    border: '1px solid #d9d9d9',
                    borderRadius: '8px'
                  }}
                  onError={(e) => {
                    console.error('二维码图片加载失败:', qrCodeUrl);
                    e.target.style.display = 'none';
                    message.error('二维码图片加载失败');
                  }}
                />
              </div>
              
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">
                  状态: {getStatusText()}
                </Text>
              </div>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  授权码: {authKey}
                </Text>
              </div>
            </div>
          ) : (
            <Spin size="large" />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default WeChatLogin;