// API配置文件
const BASE_URL = 'http://www.asben.net:1239';
const LOCAL_BASE_URL = 'http://localhost:3001'; // 本地后端服务器

// API端点配置
export const API_ENDPOINTS = {
  // 授权码管理
  GEN_AUTH_KEY: `${BASE_URL}/admin/GenAuthKey1`,
  DELAY_AUTH_KEY: `${BASE_URL}/admin/DelayAuthKey`,
  DELETE_AUTH_KEY: `${BASE_URL}/admin/DeleteAuthKey`,
  
  // 登录相关
  GET_LOGIN_QR: `${BASE_URL}/login/GetLoginQrCodeNew`,
  CHECK_LOGIN_STATUS: `${BASE_URL}/login/CheckLoginStatus`,
  
  // 用户相关
  GET_USER_PROFILE: `${BASE_URL}/user/GetProfile`,
  MODIFY_USER_INFO: `${BASE_URL}/user/ModifyUserInfo`,
  CHANGE_PASSWORD: `${BASE_URL}/user/ChangePwd`,
  GET_MY_QR: `${BASE_URL}/user/GetMyQrCode`,
  
  // 消息相关
  SEND_TEXT_MSG: `${BASE_URL}/msg/SendText`,
  SEND_IMAGE_MSG: `${BASE_URL}/msg/SendImage`,
  SEND_FILE_MSG: `${BASE_URL}/msg/SendFile`,
  
  // 朋友相关
  GET_FRIEND_LIST: `${BASE_URL}/friend/GetFriendList`,
  SEARCH_CONTACT: `${BASE_URL}/friend/SearchContact`,
  
  // 群管理
  GET_GROUP_LIST: `${BASE_URL}/group/GetGroupList`,
  GET_GROUP_MEMBERS: `${BASE_URL}/group/GetGroupMemberList`,
  
  // 设备相关
  GET_DEVICE_LIST: `${BASE_URL}/device/GetDeviceList`,
};

// 本地API端点配置
export const LOCAL_API_ENDPOINTS = {
  // 微信账号管理
  WECHAT_ACCOUNTS: `${LOCAL_BASE_URL}/api/admin/wechat-accounts`,
  WECHAT_ACCOUNT_DETAIL: `${LOCAL_BASE_URL}/api/admin/wechat-accounts`,
  
  // 用户管理
  USERS: `${LOCAL_BASE_URL}/api/admin/users`,
  USER_PROFILE: `${LOCAL_BASE_URL}/api/user/profile`,
  
  // 认证
  LOGIN: `${LOCAL_BASE_URL}/api/login`,
  REGISTER: `${LOCAL_BASE_URL}/api/register`,
};

// 请求配置
export const API_CONFIG = {
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

export default BASE_URL; 