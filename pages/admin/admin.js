Page({
  data: {
    devices: [],
    users: [],
    selectedUserId: null,
    userDevices: []
  },

  onLoad() {
    // 新增：权限验证逻辑
    const userInfo = wx.getStorageSync('userInfo');
    
    if (!userInfo || !userInfo.isAdmin) {
      wx.showToast({
        title: '无管理员权限',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack({ delta: 1 });
      }, 1000);
      return;
    }

    // 原有加载逻辑
    this.loadDevices();
    this.loadUsers();
  },

  // 以下为原有方法，保持不变
  loadDevices() {
    wx.request({
      url: 'http://localhost:3000/api/devices',
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          this.setData({ devices: res.data.data });
        }
      }
    });
  },

  loadUsers() {
    wx.request({
      url: 'http://localhost:3000/api/admin/users',
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          this.setData({ users: res.data.data });
        }
      }
    });
  },

  onUserSelect(e) {
    const userId = e.detail.value;
    this.setData({ selectedUserId: userId });
    this.loadUserDevices(userId);
  },

  loadUserDevices(userId) {
    wx.request({
      url: `http://localhost:3000/api/admin/user-devices/${userId}`,
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          this.setData({ userDevices: res.data.data });
        }
      }
    });
  },

  onDeviceToggle(e) {
    const deviceId = e.currentTarget.dataset.deviceId;
    const { selectedUserId, userDevices } = this.data;

    if (!selectedUserId) {
      wx.showToast({
        title: '请先选择用户',
        icon: 'none'
      });
      return;
    }

    const isChecked = userDevices.includes(deviceId);
    const action = isChecked ? 'remove' : 'add';

    wx.request({
      url: `http://localhost:3000/api/admin/user-devices`,
      method: 'POST',
      data: {
        userId: selectedUserId,
        deviceId: deviceId,
        action: action
      },
      success: (res) => {
        if (res.data.code === 200) {
          this.loadUserDevices(selectedUserId);
          wx.showToast({
            title: action === 'add' ? '授权成功' : '取消授权成功',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: res.data.msg || '操作失败',
            icon: 'none'
          });
        }
      }
    });
  },

  navigateToUserManager() {
    wx.navigateTo({ url: '/pages/admin/admin' });
  },

  navigateToDeviceManager() {
    wx.navigateTo({ url: '/pages/admin/deviceManager' });
  },

  navigateToReservationManager() {
    wx.navigateTo({ url: '/pages/admin/reservationManager' });
  }
});
    