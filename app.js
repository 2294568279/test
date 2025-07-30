App({
  onLaunch() {
    // 检查本地是否有Token
    const token = wx.getStorageSync('token');
    if (token) {
      // 验证Token有效性
      wx.request({
        url: 'https://你的后端域名/api/wx/checkToken',
        header: { 'Authorization': `Bearer ${token}` },
        success: res => {
          if (res.data.code !== 200) {
            // Token无效，清除并跳转到登录页
            wx.removeStorageSync('token');
            wx.navigateTo({ url: '/pages/login/login' });
          }
        },
        fail: () => {
          wx.removeStorageSync('token');
        }
      });
    } else {
      // 无Token，跳转到登录页
      wx.navigateTo({ url: '/pages/login/login' });
    }
  },
  globalData: {
    userInfo: null
  }
});
