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

// تقديم ملفات الواجهة الأمامية من مجلد public تلقائياً[span_0](start_span)[span_0](end_span)
app.use(express.static(path.join(__dirname, 'public')));

// رابط الاتصال بقاعدة البيانات السحابية (MongoDB Atlas - قاعدة بيانات magm)[span_1](start_span)[span_1](end_span)
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://mohe78795_db_user:737465252@cluster0.qr9q8iv.mongodb.net/magm?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ تم الاتصال بقاعدة بيانات magm وترتيب السيرفر بنجاح'))[span_2](start_span)[span_2](end_span)
    .catch(err => console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err));[span_3](start_span)[span_3](end_span)

// ==========================================
// مسارات النظام (API Endpoints)
// ==========================================

// 1. مسار اختبار حالة السيرفر
app.get('/api/status', (req, res) => {
    res.json({ success: true, message: '🚀 السيرفر يعمل وقاعدة البيانات مرتبطة بنجاح!' });[span_4](start_span)[span_4](end_span)
});

// 2. مسار تسجيل الدخول (عبر قاعدة البيانات)
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({
            $or: [{ username: username }, { phone: username }],
            password: password
        });[span_5](start_span)[span_5](end_span)

        if (!user) {
            return res.status(401).json({ success: false, message: 'خطأ في اسم المستخدم أو رقم الهاتف أو كلمة المرور' });[span_6](start_span)[span_6](end_span)
        }
        res.json({ success: true, user });[span_7](start_span)[span_7](end_span)
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });[span_8](start_span)[span_8](end_span)
    }
});

// مسار تسجيل مستخدم جديد وحفظه في قاعدة البيانات السحابية[span_9](start_span)[span_9](end_span)
app.post('/api/register', async (req, res) => {
    try {
        const { name, phone, password, role } = req.body;

        const existingUser = await User.findOne({ phone });[span_10](start_span)[span_10](end_span)
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'رقم الهاتف مسجل مسبقاً!' });[span_11](start_span)[span_11](end_span)
        }

        const newUser = new User({
            name,
            username: phone,[span_12](start_span)[span_12](end_span)
            phone,
            password,
            role,
            status: 'approved[span_13](start_span)'[span_13](end_span)
        });

        await newUser.save();[span_14](start_span)[span_14](end_span)
        res.json({ success: true, message: 'تم حفظ المستخدم في قاعدة البيانات بنجاح', user: newUser });[span_15](start_span)[span_15](end_span)
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });[span_16](start_span)[span_16](end_span)
    }
});

// 3. مسارات الزبائن[span_17](start_span)[span_17](end_span)
app.post('/api/customers', async (req, res) => {
    try {
        const newCustomer = new Customer(req.body);
        await newCustomer.save();[span_18](start_span)[span_18](end_span)
        res.json({ success: true, message: 'تم حفظ الزبون وفتح الكولكشن بنجاح', data: newCustomer });[span_19](start_span)[span_19](end_span)
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });[span_20](start_span)[span_20](end_span)
    }
});

app.get('/api/customers', async (req, res) => {
    try {
        const customers = await Customer.find();[span_21](start_span)[span_21](end_span)
        res.json(customers);[span_22](start_span)[span_22](end_span)
    } catch (err) {
        res.status(500).json({ error: err.message });[span_23](start_span)[span_23](end_span)
    }
});

// 4. مسارات الفواتير[span_24](start_span)[span_24](end_span)
app.post('/api/invoices', async (req, res) => {
    try {
        const newInvoice = new Invoice(req.body);
        await newInvoice.save();[span_25](start_span)[span_25](end_span)
        res.json({ success: true, message: 'تم حفظ الفاتورة بنجاح', data: newInvoice });[span_26](start_span)[span_26](end_span)
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });[span_27](start_span)[span_27](end_span)
    }
});

app.get('/api/invoices', async (req, res) => {
    try {
        const invoices = await Invoice.find().sort({ date: -1 });[span_28](start_span)[span_28](end_span)
        res.json(invoices);[span_29](start_span)[span_29](end_span)
    } catch (err) {
        res.status(500).json({ error: err.message });[span_30](start_span)[span_30](end_span)
    }
});

// 5. مسار حفظ شحنات مسوق المزارع (المحدث لمنع أخطاء تطابق النوع CastError)[span_31](start_span)[span_31](end_span)
app.post('/api/shipments/save', async (req, res) => {
    try {
        const { farm, driver, marketer, date, rows } = req.body;

        if (!farm || !driver || !rows || rows.length === 0) {
            return res.status(400).json({ success: false, message: '⚠️ تعذر الحفظ، بعض البيانات الأساسية ناقصة.' });[span_32](start_span)[span_32](end_span)
        }

        // تنسيق صفوف الجدول وتحويل الأرقام والنصوص بشكل آمن للتوافق مع قاعدة البيانات[span_33](start_span)[span_33](end_span)
        const formattedRows = rows.map(r => ({
            chickenType: r.type || r.chickenType || 'غير محدد',
            boxes: Number(r.boxes) || 0,
            packing: Number(r.packing) || 0,
            total: Number(r.total) || 0,
            price: Number(r.price) || 0
        }));[span_34](start_span)[span_34](end_span)

        const newShipment = new Shipment({
            farm,
            driver,
            marketer,
            date,
            rows: formattedRows
        });

        await newShipment.save();[span_35](start_span)[span_35](end_span)

        res.status(200).json({
            success: true,
            message: '✅ تمت إضافة الكشف إلى قاعدة البيانات بنجاح وسُجلت باسم السائق: ' + driver[span_36](start_span)[span_36](end_span)
        });
    } catch (error) {
        console.error('خطأ أثناء حفظ الكشف:', error);[span_37](start_span)[span_37](end_span)
        res.status(500).json({ success: false, message: '❌ حدث خطأ داخلي في الخادم أثناء حفظ الكشف: ' + error.message });[span_38](start_span)[span_38](end_span)
    }
});

// ==========================================
// تشغيل السيرفر[span_39](start_span)[span_39](end_span)
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`📡 الخادم يعمل بكفاءة على المنفذ: ${PORT}`);[span_40](start_span)[span_40](end_span)
});

