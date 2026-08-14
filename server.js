const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// استيراد النماذج
const { User, Invoice, Customer, Inventory, MarketShipment } = require('./models/DataModels');

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://mohe78795_db_user:737465252@cluster0.qr9q8iv.mongodb.net/magm?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ تم الاتصال بقاعدة بيانات magm وترتيب السيرفر بنجاح'))
    .catch(err => console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err));

// ================= مسارات النظام =================

app.get('/api/status', (req, res) => {
    res.json({ success: true, message: '🚀 السيرفر يعمل وقاعدة البيانات مرتبطة بنجاح!' });
});

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
        res.json({ success: true, message: 'تم حفظ المستخدم بنجاح', user: newUser });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- مسارات كولكشن "مسؤول مزارع" (MarketShipment) ---

// جلب بيانات الشحنة الحالية
app.get('/api/market-shipment', async (req, res) => {
    try {
        let shipment = await MarketShipment.findOne();
        if (!shipment) {
            shipment = new MarketShipment();
            await shipment.save();
        }
        res.json({ success: true, data: shipment });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// تحديث حقل رئيسي منفرد (المزرعة، الشحنة، المسوق، التاريخ)
app.post('/api/update-field', async (req, res) => {
    try {
        const { fieldName, fieldValue } = req.body;
        let shipment = await MarketShipment.findOne();
        if (!shipment) {
            shipment = new MarketShipment();
        }
        shipment[fieldName] = fieldValue;
        shipment.updatedAt = Date.now();
        await shipment.save();
        res.json({ success: true, message: 'تم تحديث الحقل بنجاح' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// تحديث حقل جدول منفرد لكل نوع دجاج (boxes, packing, price)
app.post('/api/update-row-field', async (req, res) => {
    try {
        const { chickenType, subField, fieldValue } = req.body;
        let shipment = await MarketShipment.findOne();
        if (!shipment) {
            shipment = new MarketShipment();
        }
        
        let rowData = shipment.rows.get(chickenType) || { boxes: 0, packing: 0, price: 0 };
        rowData[subField] = parseFloat(fieldValue) || 0;
        shipment.rows.set(chickenType, rowData);
        shipment.updatedAt = Date.now();
        
        await shipment.save();
        res.json({ success: true, message: 'تم تحديث صف الجدول بنجاح' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`📡 الخادم يعمل على المنفذ: ${PORT}`);
});
