import React from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Dropdown, Space, Avatar } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  HomeOutlined,
  WechatOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Home from './components/Home';
import UserManagement from './components/UserManagement';
import Profile from './components/Profile';
import Settings from './components/Settings';
import WeChatLogin from './components/WeChatLogin';
import WeChatAccounts from './components/WeChatAccounts';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

const { Header, Content, Footer } = Layout;

// 需要布局的页面路径
const LAYOUT_PATHS = ['/', '/dashboard', '/users', '/profile', '/settings', '/wechat-login', '/wechat-accounts', '/admin-dashboard'];

// 主布局组件
const MainLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: <Link to="/profile">个人信息</Link>
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: <Link to="/settings">设置</Link>
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: logout
    }
  ];

  // 根据用户角色生成菜单项
  const getMenuItems = () => {
    const items = [
      {
        key: 'home',
        icon: <HomeOutlined />,
        label: <Link to="/">首页</Link>
      }
    ];

    if (user) {
      items.push({
        key: 'dashboard',
        icon: <DashboardOutlined />,
        label: <Link to="/dashboard">控制台</Link>
      });

      // 只有管理员才能看到这些菜单项
      if (user.role === 'admin') {
        items.push(
          {
            key: 'admin-dashboard',
            icon: <BarChartOutlined />,
            label: <Link to="/admin-dashboard">管理员仪表板</Link>
          },
          {
            key: 'users',
            icon: <TeamOutlined />,
            label: <Link to="/users">用户管理</Link>
          },
          {
            key: 'wechat-accounts',
            icon: <WechatOutlined />,
            label: <Link to="/wechat-accounts">微信账号</Link>
          }
        );
      }

      // 所有登录用户都可以看到微信登录
      items.push({
        key: 'wechat-login',
        icon: <WechatOutlined />,
        label: <Link to="/wechat-login">微信登录</Link>
      });
    }

    return items;
  };

  return (
    <Layout className="layout">
      <Header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
        padding: '0 50px'
      }}>
        <div className="logo" style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>
          <Link to="/" style={{ color: '#fff' }}>ZCloud</Link>
        </div>

        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={getMenuItems()}
          style={{ 
            flex: 1, 
            marginLeft: '50px',
            background: 'transparent',
            border: 'none'
          }}
        />

        <div>
          {user ? (
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              arrow
            >
              <Space style={{ cursor: 'pointer', color: '#fff' }}>
                <Avatar icon={<UserOutlined />} />
                <span>{user.username}</span>
              </Space>
            </Dropdown>
          ) : (
            <Space>
              <Button type="primary" ghost>
                <Link to="/login">登录</Link>
              </Button>
              <Button type="primary" ghost>
                <Link to="/register">注册</Link>
              </Button>
            </Space>
          )}
        </div>
      </Header>

      <Content style={{ 
        padding: '0 50px',
        minHeight: 'calc(100vh - 64px - 70px)',
        background: '#f0f2f5'
      }}>
        <div style={{ 
          background: '#fff', 
          padding: '24px', 
          minHeight: 'calc(100vh - 64px - 70px)',
          margin: '16px 0'
        }}>
          {children}
        </div>
      </Content>

      <Footer style={{ 
        textAlign: 'center',
        background: '#fff',
        borderTop: '1px solid #f0f0f0'
      }}>
        ZCloud ©{new Date().getFullYear()} Created by Your Company
      </Footer>
    </Layout>
  );
};

// 受保护的路由组件
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const App = () => {
  const location = useLocation();
  const showLayout = LAYOUT_PATHS.includes(location.pathname);

  return (
    <>
      {showLayout ? (
        <MainLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin-dashboard" element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute requireAdmin>
                <UserManagement />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/wechat-login" element={
              <ProtectedRoute>
                <WeChatLogin />
              </ProtectedRoute>
            } />
            <Route path="/wechat-accounts" element={
              <ProtectedRoute requireAdmin>
                <WeChatAccounts />
              </ProtectedRoute>
            } />
          </Routes>
        </MainLayout>
      ) : (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </>
  );
};

export default App; 