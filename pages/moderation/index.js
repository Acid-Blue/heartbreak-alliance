const reportService = require("../../services/reportService");
const { formatRelativeTime } = require("../../utils/format");

Page({
  data: {
    loading: true,
    error: "",
    reports: []
  },

  onLoad() {
    this.loadReports();
  },

  onShow() {
    if (!this.data.loading) {
      this.loadReports();
    }
  },

  loadReports() {
    this.setData({
      loading: true,
      error: ""
    });

    reportService.getReports().then((reports) => {
      this.setData({
        reports: reports.map((report) => ({
          ...report,
          relativeTime: formatRelativeTime(report.createdAt),
          targetText: report.targetType === "comment" ? "回应" : "帖子",
          statusText: this.formatStatus(report.status)
        })),
        loading: false
      });
    }).catch(() => {
      this.setData({
        error: "举报记录加载失败",
        loading: false
      });
    });
  },

  formatStatus(status) {
    const map = {
      pending: "待处理",
      reviewing: "处理中",
      resolved: "已处理",
      dismissed: "不处理"
    };
    return map[status] || "待处理";
  },

  markReport(event) {
    const { id, status } = event.currentTarget.dataset;

    reportService.updateReportStatus(id, status).then(() => {
      wx.showToast({
        title: "状态已更新",
        icon: "success"
      });
      this.loadReports();
    }).catch(() => {
      wx.showToast({
        title: "更新失败",
        icon: "none"
      });
    });
  }
});
