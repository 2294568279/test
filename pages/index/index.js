Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
    canIUseGetUserProfile: wx.canIUse('getUserProfile')
  },

  getUserProfile() {
    wx.getUserProfile({
      desc: '用于展示用户资料',
      success: (res) => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        });

        // ✅ 跳转功能页面
        wx.navigateTo({
          url: '/pages/function/function'
        });
      }
    });
  }
});