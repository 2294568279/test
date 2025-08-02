Page({
  data: {
    reservations: [],
    devices: [],
    selectedDate: '',
    selectedDeviceIndex: null
  },

  onLoad() {
    this.loadDevices();
    this.loadReservations();
  },

  loadDevices() {
    wx.request({
      url: 'http://localhost:3000/api/devices',
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          const deviceNames = res.data.data.map(device => device.name);
          this.setData({ devices: deviceNames });
        }
      }
    });
  },

  loadReservations() {
    const { selectedDate, devices, selectedDeviceIndex } = this.data;
    let url = 'http://localhost:3000/api/admin/reservations';
    
    // 构建查询参数
    const params = [];
    if (selectedDate) params.push(`date=${selectedDate}`);
    if (selectedDeviceIndex !== null) params.push(`device=${devices[selectedDeviceIndex]}`);
    
    if (params.length > 0) url += `?${params.join('&')}`;

    wx.request({
      url,
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          this.setData({ reservations: res.data.data });
        }
      }
    });
  },

  onDateChange(e) {
    this.setData({ selectedDate: e.detail.value }, () => this.loadReservations());
  },

  onDeviceChange(e) {
    this.setData({ selectedDeviceIndex: e.detail.value }, () => this.loadReservations());
  },

  cancelReservation(e) {
    const reservationId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认取消',
      content: '确定要取消该预约吗？',
      success: (modalRes) => {
        if (modalRes.confirm) {
          wx.request({
            url: `http://localhost:3000/api/admin/reservations/${reservationId}`,
            method: 'DELETE',
            success: (res) => {
              if (res.data.code === 200) {
                wx.showToast({ title: '取消成功', icon: 'success' });
                this.loadReservations();
              }
            }
          });
        }
      }
    });
  }
})