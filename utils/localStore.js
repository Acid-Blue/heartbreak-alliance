const memoryStore = {};

function hasWxStorage() {
  return typeof wx !== "undefined"
    && wx
    && typeof wx.getStorageSync === "function"
    && typeof wx.setStorageSync === "function";
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function read(key, fallback) {
  if (Object.prototype.hasOwnProperty.call(memoryStore, key)) {
    return clone(memoryStore[key]);
  }

  try {
    const value = hasWxStorage() ? wx.getStorageSync(key) : memoryStore[key];
    if (value === "" || value === undefined || value === null) {
      return clone(fallback);
    }
    memoryStore[key] = clone(value);
    return clone(value);
  } catch (error) {
    return clone(fallback);
  }
}

function write(key, value) {
  const nextValue = clone(value);
  memoryStore[key] = nextValue;

  try {
    if (hasWxStorage()) {
      wx.setStorageSync(key, nextValue);
    }
    return true;
  } catch (error) {
    return false;
  }
}

function readArray(key) {
  const value = read(key, []);
  return Array.isArray(value) ? value : [];
}

module.exports = {
  read,
  write,
  readArray
};
