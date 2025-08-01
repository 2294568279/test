Page({
  data: {
    devices: [],
    users: [],
    selectedUserId: null,
    userDevices: []
  },

  onLoad() {
    this.loadDevices();
    this.loadUsers();
  },

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
  }
});
