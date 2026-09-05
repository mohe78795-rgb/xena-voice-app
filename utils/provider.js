const crypto = require('crypto');

const PROVIDER_CONFIG = {
  apiUrl: process.env.PROVIDER_API_URL || "https://alhirabi.yemoney.net/api/yr/",
  userId: process.env.PROVIDER_USER_ID || "7367",
  username: process.env.PROVIDER_USERNAME || "735429057",
  password: process.env.PROVIDER_PASSWORD || "moh737465252"
};

const generateToken = (transid, mobile) => {
  const hashPassword = crypto.createHash('md5').update(PROVIDER_CONFIG.password).digest('hex');
  const rawString = hashPassword + transid + PROVIDER_CONFIG.username + mobile;
  return crypto.createHash('md5').update(rawString).digest('hex');
};

module.exports = { PROVIDER_CONFIG, generateToken };
