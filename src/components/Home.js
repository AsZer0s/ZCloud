import React from 'react';
import { Typography, Button, Row, Col, Card, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  CloudOutlined,
  SafetyCertificateOutlined,
  RocketOutlined,
  TeamOutlined,
  LoginOutlined,
  UserAddOutlined
} from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const Home = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <CloudOutlined style={{ fontSize: '48px', color: '#1890ff' }} />,
      title: '云存储服务',
      description: '安全可靠的云存储解决方案，随时随地访问您的文件'
    },
    {
      icon: <SafetyCertificateOutlined style={{ fontSize: '48px', color: '#52c41a' }} />,
      title: '数据安全',
      description: '采用先进的加密技术，确保您的数据安全无忧'
    },
    {
      icon: <RocketOutlined style={{ fontSize: '48px', color: '#722ed1' }} />,
      title: '高性能',
      description: '优化的存储架构，提供快速的数据访问体验'
    },
    {
      icon: <TeamOutlined style={{ fontSize: '48px', color: '#fa8c16' }} />,
      title: '团队协作',
      description: '便捷的团队协作功能，提升工作效率'
    }
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
      {/* 头部区域 */}
      <div style={{ textAlign: 'center', marginBottom: 60 }}>
        <Title level={1} style={{ marginBottom: 24 }}>
          欢迎使用 ZCloud
        </Title>
        <Paragraph style={{ fontSize: 18, color: '#666', maxWidth: 600, margin: '0 auto 32px' }}>
          安全、高效、便捷的云存储解决方案，为您的数据保驾护航
        </Paragraph>
        <div>
          <Button 
            type="primary" 
            size="large" 
            style={{ marginRight: 16 }}
            icon={<UserAddOutlined />}
            onClick={() => navigate('/register')}
          >
            立即注册
          </Button>
          <Button 
            size="large"
            icon={<LoginOutlined />}
            onClick={() => navigate('/login')}
          >
            登录
          </Button>
        </div>
      </div>

      {/* 特性展示 */}
      <Row gutter={[32, 32]} style={{ marginBottom: 60 }}>
        {features.map((feature, index) => (
          <Col xs={24} sm={12} md={6} key={index}>
            <Card 
              hoverable 
              style={{ 
                textAlign: 'center',
                height: '100%',
                borderRadius: '8px'
              }}
            >
              <div style={{ marginBottom: 16 }}>{feature.icon}</div>
              <Title level={4} style={{ marginBottom: 8 }}>{feature.title}</Title>
              <Paragraph style={{ color: '#666' }}>{feature.description}</Paragraph>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 底部区域 */}
      <div style={{ 
        textAlign: 'center', 
        padding: '40px 0',
        background: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <Title level={2} style={{ marginBottom: 24 }}>
          开始使用 ZCloud
        </Title>
        <Paragraph style={{ fontSize: 16, color: '#666', marginBottom: 32 }}>
          加入我们，体验专业的云存储服务
        </Paragraph>
        <Button 
          type="primary" 
          size="large"
          icon={<UserAddOutlined />}
          onClick={() => navigate('/register')}
        >
          免费注册
        </Button>
      </div>
    </div>
  );
};

export default Home; 