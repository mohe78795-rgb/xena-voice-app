const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

module.exports = function(dbConnection) {
  const router = express.Router();

  // ==========================================
  // الإعدادات وقاعدة البيانات للموديول الأول
  // ==========================================
  const PROVIDER_CONFIG = {
    apiUrl: process.env.PROVIDER_API_URL || "https://alhirabi.yemoney.net/api/yr/",
    userId: process.env.PROVIDER_USER_ID || "7367",
    username: process.env.PROVIDER_USERNAME || "735429057",
    password: process.env.PROVIDER_PASSWORD || "moh737465252"
  };

  // تعريف Mongoose Model
  let Package = null;
  if (dbConnection) {
    const packageSchema = new mongoose.Schema({}, { strict: false, collection: 'packages' });
    Package = dbConnection.model('Package', packageSchema);
  }

  // دالة توليد التوكن التشفيري MD5
  const generateToken = (transid, mobile) => {
    const hashPassword = crypto.createHash('md5').update(PROVIDER_CONFIG.password).digest('hex');
    const rawString = hashPassword + transid + PROVIDER_CONFIG.username + mobile;
    return crypto.createHash('md5').update(rawString).digest('hex');
  };

  // تحميل ملف JSON المحلي
  const packagesPath = path.join(__dirname, 'packages.json');
  let localPackages = [];
  try {
    if (fs.existsSync(packagesPath)) {
      const rawData = fs.readFileSync(packagesPath, 'utf8');
      localPackages = JSON.parse(rawData);
    }
  } catch (error) {
    console.error('⚠️ [module_1] خطأ في قراءة ملف JSON المحلي:', error.message);
  }

  // ==========================================
  // 1. مسارات الـ API للخدمات
  // ==========================================

  // جلب الباقات
  router.get('/packages', async (req, res) => {
    try {
      let packagesData = [];
      if (Package) {
        packagesData = await Package.find({});
      }
      if (packagesData.length === 0 && localPackages.length > 0) {
        packagesData = localPackages;
      }
      res.status(200).json({ success: true, count: packagesData.length, data: packagesData });
    } catch (error) {
      res.status(500).json({ success: false, message: "فشل جلب الباقات", error: error.message });
    }
  });

  // جلب رصيد الحساب لدى المزود
  router.get('/provider/agent/balance', async (req, res) => {
    try {
      const mobile = req.query.mobile || PROVIDER_CONFIG.username;
      const transid = Date.now().toString();
      const token = generateToken(transid, mobile);

      const requestUrl = `${PROVIDER_CONFIG.apiUrl}info?userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&action=balance`;
      const response = await axios.get(requestUrl);

      res.status(200).json({ success: true, data: response.data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // خدمات يمن موبايل
  router.get('/provider/yemen-mobile', async (req, res) => {
    try {
      const { action, mobile, amount, offerid, offerkey, method, solfa } = req.query;
      if (!mobile) return res.status(400).json({ success: false, message: "رقم الهاتف مطلوب" });

      const transid = Date.now().toString();
      const token = generateToken(transid, mobile);
      let requestUrl = "";

      if (action === "query") {
        requestUrl = `${PROVIDER_CONFIG.apiUrl}yem?action=query&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}`;
      } else if (action === "solfa") {
        requestUrl = `${PROVIDER_CONFIG.apiUrl}yem?action=solfa&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}`;
      } else if (action === "queryoffer") {
        requestUrl = `${PROVIDER_CONFIG.apiUrl}yem?action=queryoffer&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}`;
      } else if (action === "bill") {
        requestUrl = `${PROVIDER_CONFIG.apiUrl}yem?action=bill&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&amount=${amount}`;
      } else if (action === "billoffer_direct") {
        requestUrl = `${PROVIDER_CONFIG.apiUrl}yem?action=billoffer&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&offerid=${offerid}&method=${method || 'New'}`;
      } else if (action === "billoffer" || action === "offeryem") {
        requestUrl = `${PROVIDER_CONFIG.apiUrl}offeryem?action=billoffer&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&offerkey=${offerkey || offerid}&method=${method || 'New'}&solfa=${solfa || 'N'}`;
      } else {
        return res.status(400).json({ success: false, message: "إجراء غير صالح" });
      }

      const response = await axios.get(requestUrl);
      res.status(200).json({ success: true, data: response.data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // خدمات جملة يمن موبايل
  router.get('/provider/yemen-mobile/gomla', async (req, res) => {
    try {
      const { mobile, amount } = req.query;
      const transid = Date.now().toString();
      const token = generateToken(transid, mobile);
      const requestUrl = `${PROVIDER_CONFIG.apiUrl}yemgomla?userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&amount=${amount}`;
      
      const response = await axios.get(requestUrl);
      res.status(200).json({ success: true, data: response.data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // خدمات شركة يو (YOU)
  router.get('/provider/you/bill', async (req, res) => {
    try {
      const { isOffer, mobile, num, type, israsid } = req.query;
      if (!mobile) return res.status(400).json({ success: false, message: "رقم الهاتف مطلوب" });

      const transid = Date.now().toString();
      const token = generateToken(transid, mobile);
      let requestUrl = "";

      if (isOffer === "true") {
        requestUrl = `${PROVIDER_CONFIG.apiUrl}mtnoffer?userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${num}`;
      } else if (israsid === "1" || israsid === "true") {
        requestUrl = `${PROVIDER_CONFIG.apiUrl}mtn?action=bill&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${num}&type=${type || 'prepaid'}&israsid=1`;
      } else {
        requestUrl = `${PROVIDER_CONFIG.apiUrl}mtn?action=bill&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${num}&type=${type || 'prepaid'}`;
      }

      const response = await axios.get(requestUrl);
      res.status(200).json({ success: true, data: response.data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // خدمات سبأفون
  router.get('/provider/sabaphone', async (req, res) => {
    try {
      const { type, region, mobile, num } = req.query;
      if (!mobile) return res.status(400).json({ success: false, message: "رقم الهاتف مطلوب" });

      const transid = Date.now().toString();
      const token = generateToken(transid, mobile);
      let requestUrl = "";

      if (region === "south" && type === "offer") {
        requestUrl = `${PROVIDER_CONFIG.apiUrl}sbayoffer?userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${num}`;
      } else if (region === "south") {
        requestUrl = `${PROVIDER_CONFIG.apiUrl}sbay?action=bill&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${num}`;
      } else if (type === "offer") {
        requestUrl = `${PROVIDER_CONFIG.apiUrl}sabaoffer?userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${num}`;
      } else if (type === "units") {
        requestUrl = `${PROVIDER_CONFIG.apiUrl}sabaunits?userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${num}`;
      } else {
        requestUrl = `${PROVIDER_CONFIG.apiUrl}sabaphone?action=bill&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${num}`;
      }

      const response = await axios.get(requestUrl);
      res.status(200).json({ success: true, data: response.data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // خدمات شركة واي (WHY)
  router.get('/provider/why', async (req, res) => {
    try {
      const { actionType, mobile, num, packageid } = req.query;
      if (!mobile) return res.status(400).json({ success: false, message: "رقم الهاتف مطلوب" });

      const transid = Date.now().toString();
      const token = generateToken(transid, mobile);
      let requestUrl = "";

      if (actionType === "package") {
        requestUrl = `${PROVIDER_CONFIG.apiUrl}whyoffer?userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&packageid=${packageid}`;
      } else {
        requestUrl = `${PROVIDER_CONFIG.apiUrl}why?action=bill&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${num}`;
      }

      const response = await axios.get(requestUrl);
      res.status(200).json({ success: true, data: response.data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // خدمات يمن فورجي والإنترنت الثابت
  router.get('/provider/yem4g', async (req, res) => {
    try {
      const { action, mobile, amount, type } = req.query;
      if (!mobile) return res.status(400).json({ success: false, message: "رقم الهاتف مطلوب" });

      const transid = Date.now().toString();
      const token = generateToken(transid, mobile);
      let requestUrl = "";

      if (action === "query") {
        requestUrl = `${PROVIDER_CONFIG.apiUrl}yem4g?mobile=${mobile}&transid=${transid}&token=${token}&userid=${PROVIDER_CONFIG.userId}&action=query`;
      } else {
        requestUrl = `${PROVIDER_CONFIG.apiUrl}yem4g?mobile=${mobile}&transid=${transid}&token=${token}&userid=${PROVIDER_CONFIG.userId}&action=bill&amount=${amount}&type=${type || 1}`;
      }

      const response = await axios.get(requestUrl);
      res.status(200).json({ success: true, data: response.data });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};
