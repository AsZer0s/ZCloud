import React from 'react';
import { Card, Descriptions, Avatar, Typography, Space, Button, message } from 'antd';
import { UserOutlined, MailOutlined, TeamOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import moment from 'moment';

const { Title } = Typography;

const Profile = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div>
      <Card>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Avatar size={100} icon={<UserOutlined />} />
            <Title level={2} style={{ marginTop: 16 }}>{user.username}</Title>
          </div>

          <Descriptions bordered>
            <Descriptions.Item label="用户名" span={3}>
              <Space>
                <UserOutlined />
                {user.username}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="邮箱" span={3}>
              <Space>
                <MailOutlined />
                {user.email}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="角色" span={3}>
              <Space>
                <TeamOutlined />
                {user.role === 'admin' ? '管理员' : user.role === 'agent' ? '销售代理' : '普通用户'}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="注册时间" span={3}>
              <Space>
                <ClockCircleOutlined />
                {moment(user.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Space>
            </Descriptions.Item>
          </Descriptions>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Button type="primary" onClick={() => message.info('功能开发中...')}>
              修改个人信息
            </Button>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default Profile; 