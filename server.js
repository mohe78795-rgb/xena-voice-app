const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 1. الاتصال بقاعدة بيانات MongoDB
// ==========================================
const MONGO_URI = "mongodb+srv://mohe78795_db_user:737465252@cluster0.qr9q8iv.mongodb.net/aptomix_card?retryWrites=true&w=majority";

const PROVIDER_CONFIG = {
  apiUrl: "https://alhirabi.yemoney.net/api/yr/",
  userId: "7367",
  username: "735429057",
  password: "moh737465252"
};

// نموذج جدول الباقات في MongoDB
const packageSchema = new mongoose.Schema({}, { strict: false, collection: 'packages' });
const Package = mongoose.model('Package', packageSchema);

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ متصل بقاعدة بيانات MongoDB بنجاح وجاهز لتزويد الواجهة بالباقات"))
  .catch(err => console.error("❌ خطأ في الاتصال بقاعدة البيانات:", err));

// دالة توليد التشفير والتوكن للمزود
const generateToken = (transid, mobile) => {
  const hashPassword = crypto.createHash('md5').update(PROVIDER_CONFIG.password).digest('hex');
  const rawString = hashPassword + transid + PROVIDER_CONFIG.username + mobile;
  return crypto.createHash('md5').update(rawString).digest('hex');
};

// ==========================================
// 2. مسارات جلب الباقات (API Products)
// ==========================================
app.get('/api/products', async (req, res) => {
  try {
    const { company, category } = req.query;
    let filter = {};
    if (company) filter.company = new RegExp(company, 'i');
    if (category) filter.category = category;

    const products = await Package.find(filter);
    res.status(200).json({ success: true, count: products.length, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: "فشل جلب الباقات من قاعدة البيانات", error: error.message });
  }
});

// ==========================================
// 3. مسارات المزود للشركات (API Providers)
// ==========================================

// يمن موبايل
app.get('/api/provider/yemen-mobile', async (req, res) => {
  try {
    const { action, mobile, amount, offerkey, method, solfa } = req.query;
    if (!mobile) return res.status(400).json({ success: false, message: "رقم الهاتف مطلوب" });

    const transid = Date.now().toString();
    const token = generateToken(transid, mobile);
    let requestUrl = "";

    if (action === "query") {
      requestUrl = `${PROVIDER_CONFIG.apiUrl}yem?action=query&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}`;
    } else if (action === "bill") {
      requestUrl = `${PROVIDER_CONFIG.apiUrl}yem?action=bill&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&amount=${amount}`;
    } else if (action === "billoffer") {
      requestUrl = `${PROVIDER_CONFIG.apiUrl}offeryem?action=billoffer&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&offerkey=${offerkey}&method=${method || 'New'}&solfa=${solfa || 'N'}`;
    }

    const response = await axios.get(requestUrl);
    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// يو (YOU / MTN)
app.get('/api/provider/you/bill', async (req, res) => {
  try {
    const { isOffer, mobile, num, type } = req.query;
    const transid = Date.now().toString();
    const token = generateToken(transid, mobile);

    let requestUrl = (isOffer === "true")
      ? `${PROVIDER_CONFIG.apiUrl}mtnoffer?userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${num}`
      : `${PROVIDER_CONFIG.apiUrl}mtn?action=bill&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${num}&type=${type || 'prepaid'}`;

    const response = await axios.get(requestUrl);
    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// سبأفون
app.get('/api/provider/sabaphone', async (req, res) => {
  try {
    const { type, mobile, num } = req.query;
    const transid = Date.now().toString();
    const token = generateToken(transid, mobile);

    let requestUrl = "";
    if (type === "offer") requestUrl = `${PROVIDER_CONFIG.apiUrl}sabaoffer?userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${num}`;
    else requestUrl = `${PROVIDER_CONFIG.apiUrl}sabaphone?action=bill&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${num}`;

    const response = await axios.get(requestUrl);
    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// شركة واي
app.get('/api/provider/why', async (req, res) => {
  try {
    const { mobile, num } = req.query;
    const transid = Date.now().toString();
    const token = generateToken(transid, mobile);

    let requestUrl = `${PROVIDER_CONFIG.apiUrl}why?action=bill&userid=${PROVIDER_CONFIG.userId}&mobile=${mobile}&transid=${transid}&token=${token}&num=${num}`;
    const response = await axios.get(requestUrl);
    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// يمن فورجي
app.get('/api/provider/yem4g', async (req, res) => {
  try {
    const { action, mobile, amount, type } = req.query;
    const transid = Date.now().toString();
    const token = generateToken(transid, mobile);
    let requestUrl = (action === "query")
      ? `${PROVIDER_CONFIG.apiUrl}yem4g?mobile=${mobile}&transid=${transid}&token=${token}&userid=${PROVIDER_CONFIG.userId}&action=query`
      : `${PROVIDER_CONFIG.apiUrl}yem4g?mobile=${mobile}&transid=${transid}&token=${token}&userid=${PROVIDER_CONFIG.userId}&action=bill&amount=${amount}&type=${type}`;

    const response = await axios.get(requestUrl);
    res.status(200).json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// تشغيل الخادم
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 السيرفر يعمل بنجاح على المنفذ ${PORT}`);
});
