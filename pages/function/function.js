Page({
    data: {
      devices: ['显微镜', '高温炉', '电镜', '3D打印机'],
      selectedDevice: 0,
  
      peopleList: ['张三', '李四', '王五', '赵六','adfs','axewd','basdf','wefaSDc'],
    inputPeople: '',
    suggestions: [], // 初始为空 → 不显示
  
      selectedPeople: '',
      selectedDate: '',
      timeSlots: ['上午（8:00-12:00）', '下午（13:00-17:00）', '晚上（18:00-21:00）'],
      selectedTime: 0,

      materials: ['PLA', 'ABS', 'PETG', '光敏树脂', '尼龙'],
      selectedMaterial: 0,
      qualityLevels: ['低 (0.3mm层厚)', '中 (0.2mm层厚)', '高 (0.1mm层厚)'],
      selectedQuality: 1,
      modelFile: {}
    },
  
    onDeviceChange(e) {
      this.setData({ selectedDevice: e.detail.value });
    },
  
    onPeopleInput(e) {
        const input = e.detail.value.trim();
        const filtered = this.data.peopleList.filter(name =>
          name.includes(input)
        );
        this.setData({
          inputPeople: input,
          suggestions: input ? filtered : []  // 只有输入时才显示建议
        });
      },
  
    onSuggestionTap(e) {
      const name = e.currentTarget.dataset.name;
      this.setData({ inputPeople: name, selectedPeople: name, suggestions: [] });
    },
  
    onDateChange(e) {
      this.setData({ selectedDate: e.detail.value });
    },
  
    onTimeChange(e) {
      this.setData({ selectedTime: e.detail.value });
    },
  
    onSubmit() {
      const { devices, selectedDevice, selectedPeople, selectedDate, timeSlots, selectedTime } = this.data;
  
      if (!selectedPeople || !selectedDate) {
        wx.showToast({ title: '请填写完整信息', icon: 'none' });
        return;
      }
  
      wx.cloud.callFunction({
        name: 'submitForm',
        data: {
          device: devices[selectedDevice],
          people: selectedPeople,
          date: selectedDate,
          time: timeSlots[selectedTime]
        },
        success: () => {
          wx.showToast({ title: '提交成功', icon: 'success' });
        },
        fail: () => {
          wx.showToast({ title: '提交失败', icon: 'error' });
        }
      });
    }
  });