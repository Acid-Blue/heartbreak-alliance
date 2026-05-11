// 填入微信云开发环境 ID 后，服务层会优先使用云函数和云数据库。
const CLOUD_ENV_ID = "";

App({
  onLaunch() {
    if (wx.cloud && CLOUD_ENV_ID) {
      wx.cloud.init({
        env: CLOUD_ENV_ID,
        traceUser: true
      });
    }
  },

  globalData: {
    appName: "失恋阵线联盟",
    cloudEnvId: CLOUD_ENV_ID,
    serviceBoundary: "失恋阵线联盟提供同伴互助和情绪支持，不替代医疗、心理咨询或紧急救助。"
  }
});
