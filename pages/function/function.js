Page({
    data: {
      devices: [],
      selectedDevice: null,
      inputPeople: '',
      suggestions: [],
      selectedDate: '',
      timeSlots: ['08:00-10:00', '10:00-12:00', '14:00-16:00', '16:00-18:00'],
      selectedTime: null
    },
  
    onLoad() {
      // 获取设备列表
      wx.request({
        url: 'http://localhost:3000/api/devices', // 假设有设备列表接口
        method: 'GET',
        success: (res) => {
          if (res.data.code === 200) {
            // 提取设备名称列表
            const deviceNames = res.data.data.map(device => device.name);
            this.setData({ devices: deviceNames });
          }
        }
      });
    },
  
    onDeviceChange(e) {
      this.setData({ selectedDevice: e.detail.value });
    },
  
    onPeopleInput(e) {
      const input = e.detail.value;
      this.setData({ inputPeople: input });
  
      // 模拟获取建议
      wx.request({
        url: `http://localhost:3000/api/users?name=${input}`,
        method: 'GET',
        success: (res) => {
          if (res.data.code === 200) {
            this.setData({ suggestions: res.data.data });
          }
        }
      });
    },
  
    onSuggestionTap(e) {
      const name = e.currentTarget.dataset.name;
      this.setData({ inputPeople: name, suggestions: [] });
    },
  
    onDateChange(e) {
      this.setData({ selectedDate: e.detail.value });
    },
  
    onTimeChange(e) {
      this.setData({ selectedTime: e.detail.value });
    },
  
    onSubmit() {
      const { selectedDevice, inputPeople, selectedDate, selectedTime, devices, timeSlots } = this.data;
  
      if (selectedDevice === null || !inputPeople || !selectedDate || selectedTime === null) {
        wx.showToast({
          title: '请填写完整信息',
          icon: 'none'
        });
        return;
      }
  
      // 提交预约信息
      wx.request({
        url: 'http://localhost:3000/api/reservations',
        method: 'POST',
        data: {
          device: devices[selectedDevice],
          name: inputPeople,
          date: selectedDate,
          time: timeSlots[selectedTime]
        },
        success: (res) => {
          if (res.data.code === 200) {
            wx.showToast({
              title: '预约成功',
              icon: 'success'
            });
            this.setData({
              selectedDevice: null,
              inputPeople: '',
              selectedDate: '',
              selectedTime: null
            });
          } else {
            wx.showToast({
              title: res.data.msg || '预约失败',
              icon: 'none'
            });
          }
        }
      });
    }
  });