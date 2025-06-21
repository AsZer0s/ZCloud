const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // 代理到您的微信API后端
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://www.asben.net:1239',
      changeOrigin: true,
      secure: false,
      pathRewrite: {
        '^/api': '', // 移除 /api 前缀
      },
      onProxyReq: function(proxyReq, req, res) {
        console.log('代理请求:', req.method, req.url, '->', proxyReq.path);
      },
      onError: function(err, req, res) {
        console.error('代理错误:', err.message);
        res.writeHead(500, {
          'Content-Type': 'text/plain',
        });
        res.end('代理请求失败: ' + err.message);
      }
    })
  );
  
  // 健康检查代理
  app.use(
    '/health',
    createProxyMiddleware({
      target: 'http://www.asben.net:1239',
      changeOrigin: true,
      secure: false,
    })
  );
}; 