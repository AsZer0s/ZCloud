import axios from 'axios';
import { API_ENDPOINTS, API_CONFIG } from '../config/api';

// 创建axios实例
const apiClient = axios.create({
  ...API_CONFIG,
});

// 创建本地API客户端
const localApi = axios.create({
  baseURL: 'http://localhost:3001',
  timeout: 60000, // 增加超时时间到60秒
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 添加认证头
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 本地API请求拦截器
localApi.interceptors.request.use(
  (config) => {
    // 添加认证头
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 添加用户ID头
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        if (userData.id) {
          config.headers['user-id'] = userData.id;
        }
      } catch (e) {
        console.error('解析用户数据失败:', e);
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 添加请求重试拦截器
localApi.interceptors.response.use(null, async (error) => {
  const config = error.config;
  
  // 如果没有设置重试配置，则设置默认值
  if (!config || !config.retry) {
    config.retry = 3; // 最大重试次数
    config.retryDelay = 1000; // 重试延迟（毫秒）
    config.retryCount = 0; // 当前重试次数
  }

  // 如果已经达到最大重试次数，则不再重试
  if (config.retryCount >= config.retry) {
    console.error('API请求失败，已达到最大重试次数:', {
      url: config.url,
      method: config.method,
      error: error.message
    });
    return Promise.reject(error);
  }

  // 增加重试计数
  config.retryCount += 1;

  // 延迟重试
  await new Promise(resolve => setTimeout(resolve, config.retryDelay * config.retryCount));

  console.log(`重试请求 (${config.retryCount}/${config.retry}):`, {
    url: config.url,
    method: config.method
  });

  // 重新发送请求
  return localApi(config);
});

// 添加请求日志拦截器
localApi.interceptors.request.use(
  (config) => {
    console.log('发送API请求:', {
      url: config.url,
      method: config.method,
      headers: {
        'user-id': config.headers['user-id'],
        'authorization': config.headers['authorization'] ? 'Bearer [已隐藏]' : undefined
      }
    });
    return config;
  },
  (error) => {
    console.error('API请求配置错误:', error);
    return Promise.reject(error);
  }
);

// 添加响应日志拦截器
localApi.interceptors.response.use(
  (response) => {
    console.log('收到API响应:', {
      url: response.config.url,
      method: response.config.method,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('API响应错误:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // 清除本地存储的token
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// 本地API响应拦截器
localApi.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // 清除本地存储的token
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// 授权码管理API
export const authKeyAPI = {
  // 生成授权码
  generateAuthKey: async (data) => {
    const response = await apiClient.post(`${API_ENDPOINTS.GEN_AUTH_KEY}?key=12345`, data);
    return response.data;
  },

  // 延期授权码
  delayAuthKey: async (data) => {
    const response = await apiClient.post(`${API_ENDPOINTS.DELAY_AUTH_KEY}?key=12345`, data);
    return response.data;
  },

  // 删除授权码
  deleteAuthKey: async (data) => {
    const response = await apiClient.post(`${API_ENDPOINTS.DELETE_AUTH_KEY}?key=12345`, data);
    return response.data;
  },
};

// 登录相关API
export const loginAPI = {
  // 获取登录二维码
  getLoginQrCode: async (authKey, data = {}) => {
    const response = await apiClient.post(`${API_ENDPOINTS.GET_LOGIN_QR}?key=${authKey}`, data);
    return response.data;
  },

  // 检查登录状态
  checkLoginStatus: async (authKey, data = {}) => {
    const response = await apiClient.get(`${API_ENDPOINTS.CHECK_LOGIN_STATUS}?key=${authKey}`);
    return response.data;
  },
};

// 用户相关API
export const userAPI = {
  // 获取用户资料
  getUserProfile: async (authKey) => {
    const response = await apiClient.get(`${API_ENDPOINTS.GET_USER_PROFILE}?key=${authKey}`);
    return response.data;
  },

  // 修改用户信息
  modifyUserInfo: async (authKey, data) => {
    const response = await apiClient.post(`${API_ENDPOINTS.MODIFY_USER_INFO}?key=${authKey}`, data);
    return response.data;
  },

  // 修改密码
  changePassword: async (authKey, data) => {
    const response = await apiClient.post(`${API_ENDPOINTS.CHANGE_PASSWORD}?key=${authKey}`, data);
    return response.data;
  },

  // 获取我的二维码
  getMyQrCode: async (authKey, data) => {
    const response = await apiClient.post(`${API_ENDPOINTS.GET_MY_QR}?key=${authKey}`, data);
    return response.data;
  },
};

// 消息相关API
export const messageAPI = {
  // 发送文本消息
  sendTextMessage: async (data) => {
    const response = await apiClient.post(API_ENDPOINTS.SEND_TEXT_MSG, data);
    return response.data;
  },

  // 发送图片消息
  sendImageMessage: async (data) => {
    const response = await apiClient.post(API_ENDPOINTS.SEND_IMAGE_MSG, data);
    return response.data;
  },

  // 发送文件消息
  sendFileMessage: async (data) => {
    const response = await apiClient.post(API_ENDPOINTS.SEND_FILE_MSG, data);
    return response.data;
  },
};

// 朋友相关API
export const friendAPI = {
  // 获取好友列表
  getFriendList: async (data) => {
    const response = await apiClient.post(API_ENDPOINTS.GET_FRIEND_LIST, data);
    return response.data;
  },

  // 搜索联系人
  searchContact: async (data) => {
    const response = await apiClient.post(API_ENDPOINTS.SEARCH_CONTACT, data);
    return response.data;
  },
};

// 群管理API
export const groupAPI = {
  // 获取群列表
  getGroupList: async (data) => {
    const response = await apiClient.post(API_ENDPOINTS.GET_GROUP_LIST, data);
    return response.data;
  },

  // 获取群成员
  getGroupMembers: async (data) => {
    const response = await apiClient.post(API_ENDPOINTS.GET_GROUP_MEMBERS, data);
    return response.data;
  },
};

// 设备相关API
export const deviceAPI = {
  // 获取设备列表
  getDeviceList: async () => {
    const response = await apiClient.get(API_ENDPOINTS.GET_DEVICE_LIST);
    return response.data;
  },
};

// 微信账号管理API
export const wechatAccountAPI = {
  // 获取微信账号列表
  getWeChatAccounts: async () => {
    const response = await localApi.get('/api/wechat-accounts');
    return response.data;
  },

  // 创建微信账号
  createWeChatAccount: async (data) => {
    const response = await localApi.post('/api/wechat-accounts', data);
    return response.data;
  },

  // 删除微信账号
  deleteWeChatAccount: async (id) => {
    const response = await localApi.delete(`/api/wechat-accounts/${id}`);
    return response.data;
  },

  // 更新微信账号状态
  updateWeChatAccountStatus: async (id, data) => {
    const response = await localApi.put(`/api/wechat-accounts/${id}/status`, data);
    return response.data;
  },

  // 获取微信账号详情
  getWeChatAccountDetail: async (id) => {
    const response = await localApi.get(`/api/wechat-accounts/${id}`);
    return response.data;
  },

  // 唤醒登录
  wakeupLogin: async (authKey) => {
    const response = await localApi.post('/api/wechat/wakeup-login', { auth_key: authKey });
    return response.data;
  },
};

// 导出 API 客户端
export { apiClient };
export { localApi };
export default apiClient; 