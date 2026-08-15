const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const { User, Invoice, Customer, Inventory, Shipment } = require('./models/DataModels');

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://mohe78795_db_user:737465252@cluster0.qr9q8iv.mongodb.net/magm?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ تم الاتصال بقاعدة بيانات magm وترتيب السيرفر بنجاح'))
    .catch(err => console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err));

// فحص حالة السيرفر
app.get('/api/status', (req, res) => {
    res.json({ success: true, message: '🚀 السيرفر يعمل وقاعدة البيانات مرتبطة بنجاح!' });
});

// تسجيل الدخول
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

// إنشاء حساب جديد
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

// حفظ زبون
app.post('/api/customers', async (req, res) => {
    try {
        const newCustomer = new Customer(req.body);
        await newCustomer.save();
        res.json({ success: true, message: 'تم حفظ الزبون بنجاح', data: newCustomer });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// جلب الزبائن
app.get('/api/customers', async (req, res) => {
    try {
        const customers = await Customer.find().sort({ createdAt: -1 });
        res.json({ success: true, data: customers });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// حفظ فاتورة
app.post('/api/invoices', async (req, res) => {
    try {
        const newInvoice = new Invoice(req.body);
        await newInvoice.save();
        res.json({ success: true, message: 'تم حفظ الفاتورة بنجاح', data: newInvoice });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// جلب الفواتير
app.get('/api/invoices', async (req, res) => {
    try {
        const invoices = await Invoice.find().sort({ date: -1 });
        res.json({ success: true, data: invoices });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// حفظ شحنة مسوق المزارع
app.post('/api/shipments/save', async (req, res) => {
    try {
        const { farm, driver, marketer, date, rows } = req.body;

        if (!farm || !driver || !rows || rows.length === 0) {
            return res.status(400).json({ success: false, message: '⚠️ تعذر الحفظ، بعض البيانات الأساسية ناقصة.' });
        }

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

// جلب شحنات تاريخ اليوم فقط (ديناميكي لقسم وارد اليوم)
app.get('/api/shipments/today', async (req, res) => {
    try {
        const todayStr = req.query.date || new Date().toISOString().split('T')[0];
        const shipments = await Shipment.find({ date: todayStr }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            date: todayStr,
            count: shipments.length,
            data: shipments
        });
    } catch (err) {
        console.error('خطأ في جلب وارد اليوم:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`📡 الخادم يعمل بكفاءة على المنفذ: ${PORT}`);
});
