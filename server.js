require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// الاتصال بقاعدة البيانات
const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error('❌ لم يتم العثور على MONGO_URI في ملف .env');
  process.exit(1);
}

mongoose.connect(mongoURI)
  .then(() => console.log('✅ تم الاتصال بقاعدة البيانات بنجاح.'))
  .catch(err => console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err.message));

// تعريف مخطط كولكشن zoe
const ZoeSchema = new mongoose.Schema({
  name: String,
  phone: String,
  location: {
    google_maps_url: String,
    address: String
  },
  crates_balance: {
    total_delivered: Number,
    total_returned: Number,
    remaining_debt: Number
  }
}, { timestamps: true });

const ZoeModel = mongoose.model('Zoe', ZoeSchema, 'zoe');

// API جلب بيانات الزبناء
app.get('/api/zoe', async (req, res) => {
  try {
    const customers = await ZoeModel.find().sort({ createdAt: -1 });
    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// API إضافة زبون جديد
app.post('/api/zoe', async (req, res) => {
  try {
    const { name, phone, google_maps_url, total_delivered, total_returned } = req.body;
    const remaining_debt = Number(total_delivered || 0) - Number(total_returned || 0);

    const newCustomer = new ZoeModel({
      name,
      phone,
      location: { google_maps_url: google_maps_url || '', address: '' },
      crates_balance: {
        total_delivered: Number(total_delivered || 0),
        total_returned: Number(total_returned || 0),
        remaining_debt
      }
    });

    await newCustomer.save();
    res.json({ success: true, message: 'تم حفظ البيانات بنجاح!', data: newCustomer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 السيرفر يعمل على: http://localhost:${PORT}`);
});
