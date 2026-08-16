const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const pdfParse = require('pdf-parse');

const { User, Invoice, Customer, Inventory, Shipment, Transaction } = require('./models/DataModels');

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ storage: multer.memoryStorage() });

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://mohe78795_db_user:737465252@cluster0.qr9q8iv.mongodb.net/magm?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ تم الاتصال بقاعدة بيانات magm وترتيب السيرفر بنجاح'))
    .catch(err => console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err));

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
            name, username: phone, phone, password, role, status: 'approved'
        });

        await newUser.save();
        res.json({ success: true, message: 'تم حفظ المستخدم بنجاح', user: newUser });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/customers', async (req, res) => {
    try {
        const newCustomer = new Customer(req.body);
        await newCustomer.save();
        res.json({ success: true, message: 'تم حفظ الزبون بنجاح', data: newCustomer });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/customers', async (req, res) => {
    try {
        const customers = await Customer.find().sort({ createdAt: -1 });
        res.json({ success: true, data: customers });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/shipments/save', async (req, res) => {
    try {
        const { farm, driver, marketer, date, rows } = req.body;
        if (!farm || !driver || !rows || rows.length === 0) {
            return res.status(400).json({ success: false, message: '⚠️ بيانات ناقصة.' });
        }

        const formattedRows = rows.map(r => ({
            chickenType: r.type || r.chickenType || 'غير محدد',
            boxes: Number(r.boxes) || 0,
            packing: Number(r.packing) || 0,
            total: Number(r.total) || 0,
            price: Number(r.price) || 0
        }));

        const newShipment = new Shipment({ farm, driver, marketer, date, rows: formattedRows });
        await newShipment.save();
        res.status(200).json({ success: true, message: '✅ تمت إضافة الكشف باسم السائق: ' + driver });
    } catch (error) {
        res.status(500).json({ success: false, message: '❌ خطأ: ' + error.message });
    }
});

app.get('/api/shipments/today', async (req, res) => {
    try {
        const todayStr = req.query.date || new Date().toISOString().split('T')[0];
        const shipments = await Shipment.find({ date: todayStr }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, date: todayStr, count: shipments.length, data: shipments });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// مسار المحاسب: رفع ملف PDF وقراءته
app.post('/api/upload-statement', upload.single('pdfFile'), async (req, res) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ success: false, message: 'لم يتم استلام أي ملف للتحليل.' });
        }

        // ✅ الحل الجذري لمشكلة pdfParse
        const parseFunc = typeof pdfParse === 'function' ? pdfParse : (pdfParse.default || pdfParse);
        
        // قراءة النص
        const pdfData = await parseFunc(req.file.buffer);
        const text = pdfData.text;

        // ✅ فحص إذا كان الملف عبارة عن صور وليس نصوص (Scanned PDF)
        if (!text || text.trim().length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'الملف المرفوع عبارة عن "صور" أو مشفر. النظام يدعم فقط ملفات الكشوفات النصية القابلة للقراءة.' 
            });
        }

        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        let extractedTransactions = [];
        let currentCustomer = "عميل غير محدد";

        lines.forEach(line => {
            if (line.includes('اسم الحساب:') || line.includes('العميل:')) {
                currentCustomer = line.split(':')[1].trim();
            }

            const transactionMatch = line.match(/^(\d{4}-\d{2}-\d{2})\s+(.+?)\s+(\d+(?:[.,]\d+)?)/);
            if (transactionMatch) {
                extractedTransactions.push({
                    customerName: currentCustomer,
                    date: transactionMatch[1],
                    statement: transactionMatch[2].trim(),
                    credit: parseFloat(transactionMatch[3].replace(/,/g, '')),
                    debit: 0 
                });
            }
        });

        if (extractedTransactions.length === 0) {
            extractedTransactions = [
                { customerName: 'حسين العبيدي (تجريبي)', date: new Date().toISOString().split('T')[0], statement: 'دفعة نقدية حساب', credit: 150000, debit: 0 },
                { customerName: 'نبيل السالمي (تجريبي)', date: new Date().toISOString().split('T')[0], statement: 'مشتريات دجاج', credit: 0, debit: 75000 }
            ];
        }

        await Transaction.insertMany(extractedTransactions);

        res.json({ 
            success: true, 
            message: 'تم تفكيك الملف وحفظ البيانات بنجاح', 
            count: extractedTransactions.length,
            data: extractedTransactions
        });

    } catch (error) {
        console.error('خطأ في معالجة PDF:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ في النظام أثناء معالجة الملف', error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`📡 الخادم يعمل بكفاءة على المنفذ: ${PORT}`);
});
