let sequence = 0;

function createLocalId(prefix) {
  sequence += 1;
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${sequence}-${random}`;
}

module.exports = {
  createLocalId
};
