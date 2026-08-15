const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// استيراد النماذج من ملف DataModels
const { User, Invoice, Customer, Inventory, Shipment } = require('./models/DataModels');

const app = express();

// إعدادات الـ Middleware
app.use(express.json());
app.use(cors());

// تقديم ملفات الواجهة الأمامية من مجلد public تلقائياً
app.use(express.static(path.join(__dirname, 'public')));

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

// 2. مسار تسجيل الدخول (عبر قاعدة البيانات)
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({
            $or: [{ username: username }, { phone: username }],
            password: password
        });

        if (!user) {
            return res.status(401).json({ success: false, message: 'خطأ في اسم المستخدم أو رقم الهاتف أو كلمة المرور' });
        }
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// مسار تسجيل مستخدم جديد وحفظه في قاعدة البيانات السحابية
app.post('/api/register', async (req, res) => {
    try {
        const { name, phone, password, role } = req.body;

        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'رقم الهاتف مسجل مسبقاً!' });
        }

        const newUser = new User({
            name,
            username: phone,
            phone,
            password,
            role,
            status: 'approved'
        });

        await newUser.save();
        res.json({ success: true, message: 'تم حفظ المستخدم في قاعدة البيانات بنجاح', user: newUser });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. مسارات الزبائن
app.post('/api/customers', async (req, res) => {
    try {
        const newCustomer = new Customer(req.body);
        await newCustomer.save();
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

// 5. مسار حفظ شحنات مسوق المزارع (المحدث لمنع أخطاء تطابق النوع CastError)
app.post('/api/shipments/save', async (req, res) => {
    try {
        const { farm, driver, marketer, date, rows } = req.body;

        if (!farm || !driver || !rows || rows.length === 0) {
            return res.status(400).json({ success: false, message: '⚠️ تعذر الحفظ، بعض البيانات الأساسية ناقصة.' });
        }

        // تنسيق صفوف الجدول وتحويل الأرقام والنصوص بشكل آمن للتوافق مع قاعدة البيانات
        const formattedRows = rows.map(r => ({
            chickenType: r.type || r.chickenType || 'غير محدد',
            boxes: Number(r.boxes) || 0,
            packing: Number(r.packing) || 0,
            total: Number(r.total) || 0,
            price: Number(r.price) || 0
        }));

        const newShipment = new Shipment({ 
            farm, 
            driver, 
            marketer, 
            date, 
            rows: formattedRows 
        });

        await newShipment.save();

        res.status(200).json({
            success: true,
            message: '✅ تمت إضافة الكشف إلى قاعدة البيانات بنجاح وسُجلت باسم السائق: ' + driver
        });
    } catch (error) {
        console.error('خطأ أثناء حفظ الكشف:', error);
        res.status(500).json({ success: false, message: '❌ حدث خطأ داخلي في الخادم أثناء حفظ الكشف: ' + error.message });
    }
});

// ==========================================
// تشغيل السيرفر
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`📡 الخادم يعمل بكفاءة على المنفذ: ${PORT}`);
});
