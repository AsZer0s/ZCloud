import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { message } from 'antd';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 从localStorage加载用户信息
  const loadUserFromStorage = useCallback(() => {
    console.log('AuthContext - 开始从localStorage加载用户信息');
    const token = localStorage.getItem('token');
    const userInfo = localStorage.getItem('user');
    
    console.log('AuthContext - 从localStorage读取的数据:', { token: !!token, userInfo });
    
    if (token && userInfo) {
      try {
        const parsedUser = JSON.parse(userInfo);
        console.log('AuthContext - 成功解析用户信息:', parsedUser);
        setUser(parsedUser);
        return true;
      } catch (error) {
        console.error('AuthContext - 解析用户信息失败:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        return false;
      }
    }
    console.log('AuthContext - localStorage中没有用户信息');
    return false;
  }, []);

  useEffect(() => {
    console.log('AuthContext - 开始初始化认证状态');
    const success = loadUserFromStorage();
    console.log('AuthContext - 加载用户信息结果:', success);
    setLoading(false);
  }, [loadUserFromStorage]);

  const login = async (username, password) => {
    console.log('AuthContext - 开始登录流程');
    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      console.log('AuthContext - 登录响应:', { status: response.status, data });

      if (response.ok) {
        // 服务器返回的数据格式：{ id, username, email, role, token }
        const userData = {
          id: data.id,
          username: data.username,
          email: data.email,
          role: data.role
        };

        console.log('AuthContext - 保存用户信息到localStorage');
        // 保存token和用户信息到localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // 更新状态
        console.log('AuthContext - 更新用户状态');
        setUser(userData);
        message.success('登录成功');
        return true;
      } else {
        console.log('AuthContext - 登录失败:', data.error);
        message.error(data.error || '用户名或密码错误');
        return false;
      }
    } catch (error) {
      console.error('AuthContext - 登录过程出错:', error);
      message.error('登录失败，请稍后重试');
      return false;
    }
  };

  const logout = useCallback(() => {
    console.log('AuthContext - 开始登出流程');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    message.success('已退出登录');
  }, []);

  // 添加调试日志
  useEffect(() => {
    console.log('AuthContext - 用户状态更新:', { user, loading });
  }, [user, loading]);

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 