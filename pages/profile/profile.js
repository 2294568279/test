Page({
  data: {
    userInfo: {
      name: '',
      phone: '',
      role: 'user'
    },
    isNewUser: false,
    roleOptions: ['user', 'student', 'teacher', 'researcher', 'engineer']
  },

  onLoad(options) {
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({ userInfo });
    }
    
    // 检查是否是新用户
    if (options.isNewUser === 'true') {
      this.setData({ isNewUser: true });
    }
  },

  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`userInfo.${field}`]: e.detail.value
    });
  },

  onRoleChange(e) {
    const { roleOptions } = this.data;
    this.setData({
      'userInfo.role': roleOptions[e.detail.value]
    });
  },

  onSave() {
    const { userInfo, isNewUser } = this.data;

    if (!userInfo.name || !userInfo.phone) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    wx.request({
      url: `http://localhost:3000/api/users/${userInfo.id}`,
      method: 'PUT',
      data: userInfo,
      success: (res) => {
        if (res.data.code === 200) {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          });
          wx.setStorageSync('userInfo', userInfo);
          // 根据用户角色和是否为新用户决定跳转页面
          setTimeout(() => {
            if (userInfo.role === 'admin') {
              wx.navigateTo({
                url: '/pages/admin/admin'
              });
            } else {
              wx.navigateTo({
                url: '/pages/function/function'
              });
            }
          }, 1500);
        } else {
          wx.showToast({
            title: res.data.msg || '保存失败',
            icon: 'none'
          });
        }
      }
    });
  }
});
