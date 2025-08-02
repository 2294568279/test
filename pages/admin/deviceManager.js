Page({
  data: {
    devices: [],
    newDeviceName: ''
  },

  onLoad() {
    this.loadDevices();
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

  onDeviceNameInput(e) {
    this.setData({ newDeviceName: e.detail.value });
  },

  addDevice() {
    if (!this.data.newDeviceName.trim()) {
      wx.showToast({ title: '请输入设备名称', icon: 'none' });
      return;
    }

    wx.request({
      url: 'http://localhost:3000/api/admin/devices',
      method: 'POST',
      data: { name: this.data.newDeviceName },
      success: (res) => {
        if (res.data.code === 200) {
          wx.showToast({ title: '添加成功', icon: 'success' });
          this.setData({ newDeviceName: '' });
          this.loadDevices();
        }
      }
    });
  },

  deleteDevice(e) {
    const deviceId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该设备吗？',
      success: (modalRes) => {
        if (modalRes.confirm) {
          wx.request({
            url: `http://localhost:3000/api/admin/devices/${deviceId}`,
            method: 'DELETE',
            success: (res) => {
              if (res.data.code === 200) {
                wx.showToast({ title: '删除成功', icon: 'success' });
                this.loadDevices();
              }
            }
          });
        }
      }
    });
  },

  editDevice(e) {
    const deviceId = e.currentTarget.dataset.id;
    const deviceName = e.currentTarget.dataset.name;
    
    wx.showModal({
      title: '编辑设备',
      inputValue: deviceName,
      editable: true,
      success: (modalRes) => {
        if (modalRes.confirm && modalRes.content.trim()) {
          wx.request({
            url: `http://localhost:3000/api/admin/devices/${deviceId}`,
            method: 'PUT',
            data: { name: modalRes.content },
            success: (res) => {
              if (res.data.code === 200) {
                wx.showToast({ title: '修改成功', icon: 'success' });
                this.loadDevices();
              }
            }
          });
        }
      }
    });
  }
})