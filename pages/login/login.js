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
            console.log('微信登录结果:', loginRes);
            if (!loginRes.code) {
              wx.hideLoading();
              wx.showToast({
                title: '登录失败',
                icon: 'error'
              });
              return;
            }

            console.log('准备发送到后端的数据:', {
              code: loginRes.code,
              userInfo: {
                nickName: res.userInfo.nickName,
                avatarUrl: res.userInfo.avatarUrl,
                gender: res.userInfo.gender,
                city: res.userInfo.city,
                province: res.userInfo.province,
                country: res.userInfo.country
              }
            });

            // 2. 发送code和用户信息到后端
            wx.request({
              url: 'http://localhost:3000/api/wx/login', // 后端登录接口
              method: 'POST',
              data: {
                code: loginRes.code,
                userInfo: {
                  nickName: res.userInfo.nickName,
                  avatarUrl: res.userInfo.avatarUrl,
                  gender: res.userInfo.gender,
                  city: res.userInfo.city,
                  province: res.userInfo.province,
                  country: res.userInfo.country
                }
              },
              success: res => {
                wx.hideLoading();
                console.log('后端响应:', res);
                
                if (res.data && res.data.code === 200) {
                  // 3. 存储后端返回的Token和用户信息
                  wx.setStorageSync('token', res.data.data.token);
                  wx.setStorageSync('userInfo', res.data.data.userInfo);

                  wx.showToast({
                    title: '登录成功',
                    icon: 'success',
                    duration: 1000
                  });

                  // 延迟跳转，确保toast显示
                  setTimeout(() => {
                    // 根据用户状态和角色跳转到不同页面
                    if (res.data.data.isNewUser) {
                      // 新用户需要完善信息
                      console.log('新用户，跳转到profile页面');
                      wx.navigateTo({
                        url: '/pages/profile/profile?isNewUser=true',
                        success: () => {
                          console.log('跳转到profile页面成功');
                        },
                        fail: (err) => {
                          console.log('跳转到profile页面失败:', err);
                          // 如果跳转失败，尝试跳转到function页面
                          wx.redirectTo({
                            url: '/pages/function/function'
                          });
                        }
                      });
                    } else if (res.data.data.userInfo.role === 'admin') {
                      // 管理员跳转到管理页面
                      console.log('管理员用户，跳转到admin页面');
                      wx.navigateTo({
                        url: '/pages/admin/admin',
                        success: () => {
                          console.log('跳转到admin页面成功');
                        },
                        fail: (err) => {
                          console.log('跳转到admin页面失败:', err);
                          // 如果跳转失败，尝试跳转到function页面
                          wx.redirectTo({
                            url: '/pages/function/function'
                          });
                        }
                      });
                    } else {
                      // 普通用户跳转到功能页面
                      console.log('普通用户，跳转到function页面');
                      wx.redirectTo({
                        url: '/pages/function/function',
                        success: () => {
                          console.log('跳转到function页面成功');
                        },
                        fail: (err) => {
                          console.log('跳转到function页面失败:', err);
                        }
                      });
                    }
                  }, 1200);
                } else {
                  console.log('登录失败:', res.data);
                  wx.showToast({
                    title: res.data ? (res.data.msg || '登录失败') : '服务器错误',
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