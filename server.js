const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// استيراد النماذج من مجلد models (تأكد من وجودها داخل مجلد models)
const { User, Invoice, Customer, Inventory } = require('./models/DataModels');

const app = express();

// إعدادات الـ Middleware
app.use(express.json());
app.use(cors());

// تقديم ملفات الواجهة الأمامية من مجلد public تلقائياً
app.use(express.static('public'));

// رابط الاتصال بقاعدة البيانات السحابية (MongoDB Atlas - قاعدة بيانات magm)
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://mohe78795_db_user:737465252@cluster0.qr9q8iv.mongodb.net/magm?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ تم الاتصال بقاعدة بيانات magm وترتيب السيرفر بنجاح'))
    .catch(err => console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err));

// ==========================================
// مسارات النظام (API Endpoints)
// ==========================================

// 1. مسار اختبار حالة السيرفر
app.get('/api/status', (req, res) => {
    res.json({ success: true, message: '🚀 السيرفر يعمل وقاعدة البيانات مرتبطة بنجاح!' });
});

// 2. مسار تسجيل الدخول
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, password });
        if (!user) {
            return res.status(401).json({ success: false, message: 'خطأ في اسم المستخدم أو كلمة المرور' });
        }
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. مسارات الزبائن (فتح الكولكشن تلقائياً عند الحفظ)
app.post('/api/customers', async (req, res) => {
    try {
        const newCustomer = new Customer(req.body);
        await newCustomer.save(); // سيتم إنشاء الكولكشن تلقائياً في magm
        res.json({ success: true, message: 'تم حفظ الزبون وفتح الكولكشن بنجاح', data: newCustomer });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/customers', async (req, res) => {
    try {
        const customers = await Customer.find();
        res.json(customers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. مسارات الفواتير
app.post('/api/invoices', async (req, res) => {
    try {
        const newInvoice = new Invoice(req.body);
        await newInvoice.save();
        res.json({ success: true, message: 'تم حفظ الفاتورة بنجاح', data: newInvoice });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/invoices', async (req, res) => {
    try {
        const invoices = await Invoice.find().sort({ date: -1 });
        res.json(invoices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// تشغيل السيرفر
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`📡 الخادم يعمل بكفاءة على المنفذ: ${PORT}`);
});

