require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const DEFAULT_ACCOUNT_ID = process.env.DEFAULT_ACCOUNT_ID || 'default-account';

if (!MONGO_URI) {
  console.error('❌ لم يتم العثور على MONGO_URI في متغيرات البيئة (Environment Variables).');
  process.exit(1);
}

// Middlewares
app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: '4mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ------------------- Schemas & Models -------------------

const accountField = { type: String, required: true, index: true };

// 1. مخطط اليوميات والمبيعات (Day Sync)
const daySchema = new mongoose.Schema({
  accountId: accountField,
  date: { type: String, required: true, index: true },
  invoices: { type: Array, default: [] },
  returns: { type: Array, default: [] },
  expenses: { type: Array, default: [] },
  incomingCards: { type: Array, default: [] },
  stock: { type: Object, default: {} },
  cardMeta: { type: Object, default: {} },
}, { timestamps: true, minimize: false });
daySchema.index({ accountId: 1, date: 1 }, { unique: true });

// 2. مخطط الإعدادات (Settings)
const settingsSchema = new mongoose.Schema({
  accountId: accountField,
  key: { type: String, required: true },
  value: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true, minimize: false });
settingsSchema.index({ accountId: 1, key: 1 }, { unique: true });

// 3. مخطط العملاء والصناديق (Zoe Customer)
const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  location: {
    google_maps_url: { type: String, default: '' },
    address: { type: String, default: '' }
  },
  crates_balance: {
    total_delivered: { type: Number, default: 0 },
    total_returned: { type: Number, default: 0 },
    remaining_debt: { type: Number, default: 0 }
  },
  accountId: accountField,
}, { timestamps: true, minimize: false });
customerSchema.index({ accountId: 1, phone: 1 }, { unique: true, sparse: true });

const DayModel = mongoose.model('MojamDay', daySchema, 'mojam_days');
const SettingsModel = mongoose.model('MojamSetting', settingsSchema, 'mojam_settings');
const ZoeModel = mongoose.model('Zoe', customerSchema, 'zoe');

// ------------------- Helper Functions -------------------

function accountOf(req) {
  return String(req.get('x-account-id') || req.query.accountId || req.body?.accountId || DEFAULT_ACCOUNT_ID).trim();
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function cleanDay(body) {
  return {
    invoices: Array.isArray(body.invoices) ? body.invoices : [],
    returns: Array.isArray(body.returns) ? body.returns : [],
    expenses: Array.isArray(body.expenses) ? body.expenses : [],
    incomingCards: Array.isArray(body.incomingCards) ? body.incomingCards : [],
    stock: body.stock && typeof body.stock === 'object' ? body.stock : {},
    cardMeta: body.cardMeta && typeof body.cardMeta === 'object' ? body.cardMeta : {},
  };
}

// ------------------- API Routes -------------------

// فحص حالة الخادم والقاعدة
app.get('/api/health', (req, res) => {
  res.json({ success: true, service: 'mojam-backend', database: mongoose.connection.readyState === 1 });
});

// --- APIs المزامنة اليومية (Day Sync) ---

app.get('/api/sync/day', async (req, res) => {
  try {
    const date = String(req.query.date || '');
    if (!validDate(date)) return res.status(400).json({ success: false, message: 'صيغة التاريخ يجب أن تكون YYYY-MM-DD' });

    const row = await DayModel.findOne({ accountId: accountOf(req), date }).lean();
    res.json({
      success: true,
      date,
      data: row || { date, invoices: [], returns: [], expenses: [], incomingCards: [], stock: {}, cardMeta: {} }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل جلب بيانات اليومية', error: error.message });
  }
});

app.put('/api/sync/day', async (req, res) => {
  try {
    const date = String(req.body.date || '');
    if (!validDate(date)) return res.status(400).json({ success: false, message: 'صيغة التاريخ يجب أن تكون YYYY-MM-DD' });

    const accountId = accountOf(req);
    const data = cleanDay(req.body);

    const row = await DayModel.findOneAndUpdate(
      { accountId, date },
      { $set: { accountId, date, ...data } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    res.json({ success: true, date, data: row });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل حفظ بيانات اليومية', error: error.message });
  }
});

// --- APIs الإعدادات (Settings) ---

app.get('/api/sync/settings', async (req, res) => {
  try {
    const rows = await SettingsModel.find({ accountId: accountOf(req) }).lean();
    res.json({ success: true, data: Object.fromEntries(rows.map(x => [x.key, x.value])) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل جلب الإعدادات', error: error.message });
  }
});

app.put('/api/sync/settings', async (req, res) => {
  try {
    const accountId = accountOf(req);
    const settings = req.body.settings || {};
    await Promise.all(Object.entries(settings).map(([key, value]) =>
      SettingsModel.findOneAndUpdate({ accountId, key }, { $set: { accountId, key, value } }, { upsert: true })
    ));
    res.json({ success: true, message: 'تم تحديث الإعدادات بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل حفظ الإعدادات', error: error.message });
  }
});

// --- APIs العملاء والحسابات (Zoe Customers) ---

app.get('/api/zoe', async (req, res) => {
  try {
    const accountId = accountOf(req);
    const customers = await ZoeModel.find({
      $or: [{ accountId }, { accountId: {$exists: false } }]
    }).sort({ createdAt: -1 }).lean();

    res.json({ success: true, count: customers.length, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في جلب بيانات العملاء', error: error.message });
  }
});

app.get('/api/zoe/search', async (req, res) => {
  try {
    const phone = String(req.query.phone || '').trim();
    const accountId = accountOf(req);

    const customer = await ZoeModel.findOne({
      phone,
      $or: [{ accountId }, { accountId: {$exists: false } }]
    }).lean();

    res.json({ success: true, data: customer || null });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ أثناء البحث عن الزبون', error: error.message });
  }
});

app.post('/api/zoe', async (req, res) => {
  try {
    const { name, phone, google_maps_url = '', total_delivered = 0, total_returned = 0 } = req.body;

    const cleanName = String(name || '').trim();
    const cleanPhone = String(phone || '').trim();

    if (!cleanName || !cleanPhone) {
      return res.status(400).json({ success: false, message: 'اسم الزبون ورقم الهاتف متطلبان أساسيان.' });
    }

    const accountId = accountOf(req);
    const deliveredCount = Number(total_delivered) || 0;
    const returnedCount = Number(total_returned) || 0;

    let customer = await ZoeModel.findOne({
      $or: [
        { accountId, phone: cleanPhone },
        { accountId, name: cleanName },
        { accountId: { $exists: false }, phone: cleanPhone },
        { accountId: { $exists: false }, name: cleanName }
      ]
    });

    let previousBalance = 0;

    if (customer) {
      previousBalance = customer.crates_balance?.remaining_debt || 0;
      customer.accountId = accountId;
      customer.name = cleanName;
      customer.phone = cleanPhone;
      customer.location.google_maps_url = google_maps_url || customer.location?.google_maps_url || '';
      customer.crates_balance.total_delivered = (customer.crates_balance.total_delivered || 0) + deliveredCount;
      customer.crates_balance.total_returned = (customer.crates_balance.total_returned || 0) + returnedCount;
      customer.crates_balance.remaining_debt = customer.crates_balance.total_delivered - customer.crates_balance.total_returned;

      await customer.save();
    } else {
      customer = new ZoeModel({
        accountId,
        name: cleanName,
        phone: cleanPhone,
        location: { google_maps_url, address: '' },
        crates_balance: {
          total_delivered: deliveredCount,
          total_returned: returnedCount,
          remaining_debt: deliveredCount - returnedCount
        }
      });
      await customer.save();
    }

    res.json({
      success: true,
      message: 'تم حفظ البيانات بنجاح!',
      data: customer,
      meta: {
        previousBalance,
        addedDelivered: deliveredCount,
        addedReturned: returnedCount
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ أثناء حفظ الزبون', error: error.message });
  }
});

// SPA Fallback Route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ------------------- Server Initialization -------------------

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح.');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 السيرفر يعمل بنجاح على البورت: ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err.message);
    process.exit(1);
  });

