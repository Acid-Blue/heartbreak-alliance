function getCloudEnvId() {
  try {
    return getApp().globalData.cloudEnvId || "";
  } catch (error) {
    return "";
  }
}

function canUseCloud() {
  return typeof wx !== "undefined"
    && wx
    && wx.cloud
    && typeof wx.cloud.callFunction === "function"
    && Boolean(getCloudEnvId());
}

function callFunction(name, data) {
  if (!canUseCloud()) {
    return Promise.reject(new Error("cloud is not configured"));
  }

  return wx.cloud.callFunction({
    name,
    data
  }).then((response) => response.result);
}

function callData(action, payload) {
  return callFunction("dataStore", {
    action,
    payload: payload || {}
  }).then((result) => {
    if (!result || result.ok === false) {
      throw new Error((result && result.error) || "cloud data request failed");
    }
    return result.data;
  });
}

module.exports = {
  canUseCloud,
  callFunction,
  callData
};
