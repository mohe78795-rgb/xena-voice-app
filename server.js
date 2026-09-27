require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// تقديم الملفات الساكنة (مثل index.html الموضوة داخل مجلد public)
app.use(express.static(path.join(__dirname, 'public')));

// الاتصال بقاعدة البيانات MongoDB
const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error('❌ لم يتم العثور على MONGO_URI في متغيرات البيئة (Environment Variables).');
  process.exit(1);
}

mongoose.connect(mongoURI)
  .then(() => console.log('✅ تم الاتصال بقاعدة البيانات بنجاح.'))
  .catch(err => console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err.message));

// تعريف مخطط كولكشن zoe
const ZoeSchema = new mongoose.Schema({
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
  }
}, { timestamps: true });

const ZoeModel = mongoose.model('Zoe', ZoeSchema, 'zoe');

// ------------------- API Routes -------------------

// 1. API جلب بيانات الزبناء
app.get('/api/zoe', async (req, res) => {
  try {
    const customers = await ZoeModel.find().sort({ createdAt: -1 });
    res.json({ success: true, count: customers.length, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ في جلب البيانات', error: error.message });
  }
});

// 2. API حفظ/تحديث زبون وحركة الصناديق
app.post('/api/zoe', async (req, res) => {
  try {
    const { name, phone, google_maps_url, total_delivered = 0, total_returned = 0 } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'اسم الزبون ورقم الهاتف متطلبان أساسيان.' });
    }

    const deliveredCount = Number(total_delivered) || 0;
    const returnedCount = Number(total_returned) || 0;

    // البحث عن الزبون بالاسم أو رقم الهاتف لمنع التكرار وتحديث الرصيد التراكمي
    let customer = await ZoeModel.findOne({ $or: [{ phone }, { name }] });

    let previousBalance = 0;

    if (customer) {
      // إذا كان الزبون موجوداً، يتم حفظ الدين السابق وتراكم الأعداد
      previousBalance = customer.crates_balance.remaining_debt || 0;
      customer.crates_balance.total_delivered += deliveredCount;
      customer.crates_balance.total_returned += returnedCount;
      customer.crates_balance.remaining_debt = customer.crates_balance.total_delivered - customer.crates_balance.total_returned;

      if (google_maps_url) {
        customer.location.google_maps_url = google_maps_url;
      }

      await customer.save();
    } else {
      // إنشاء زبون جديد في حال عدم وجوده
      customer = new ZoeModel({
        name,
        phone,
        location: { google_maps_url: google_maps_url || '', address: '' },
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
        previousBalance: previousBalance,
        addedDelivered: deliveredCount,
        addedReturned: returnedCount
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'خطأ أثناء الحفظ', error: error.message });
  }
});

// توجيه كل الطلبات غير المعرفة بـ API إلى الصفحة الرئيسية (index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`🚀 السيرفر يعمل بنجاح على البورت: ${PORT}`);
});
