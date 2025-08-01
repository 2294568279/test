Page({
  // 微信快捷登录
  getUserProfile() {
    wx.getUserProfile({
      desc: '用于完善用户资料', // 提示信息
      success: (res) => {
        console.log('授权成功:', res);

        wx.showLoading({
          title: '登录中...'
        });

        // 1. 获取微信登录凭证code
        wx.login({
          success: loginRes => {
            if (!loginRes.code) {
              wx.hideLoading();
              wx.showToast({
                title: '登录失败',
                icon: 'error'
              });
              return;
            }

            // 2. 发送code和用户信息到后端
            wx.request({
              url: 'http://localhost:3000/api/wx/login', // 后端登录接口
              method: 'POST',
              data: {
                code: loginRes.code,
                userInfo: res.userInfo // 可选：用户头像、昵称等
              },
              success: res => {
                wx.hideLoading();
                if (res.data.code === 200) {
                  // 3. 存储后端返回的Token和用户信息
                  wx.setStorageSync('token', res.data.data.token);
                  wx.setStorageSync('userInfo', res.data.data.userInfo);

                  // 跳转功能页面
                  wx.navigateTo({
                    url: '/pages/function/function'
                  });
                } else {
                  wx.showToast({
                    title: res.data.msg || '登录失败',
                    icon: 'none'
                  });
                }
              },
              fail: () => {
                wx.hideLoading();
                wx.showToast({
                  title: '网络错误',
                  icon: 'error'
                });
              }
            });
          }
        });
      },
      fail: () => {
        wx.showToast({
          title: '请授权登录',
          icon: 'none'
        });
      }
    });
  },

  openUserAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/user-agreement'
    });
  },

  openPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/agreement/privacy-policy'
    });
  },
});