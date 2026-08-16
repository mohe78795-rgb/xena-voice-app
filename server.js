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

// مسار المحاسب: رفع ملف PDF وتفكيكه تلقائياً واستخراج الحركات
app.post('/api/upload-statement', upload.single('pdfFile'), async (req, res) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ success: false, message: 'لم يتم استلام أي ملف للتحليل.' });
        }

        const parseFunc = typeof pdfParse === 'function' ? pdfParse : (pdfParse.default || pdfParse);
        const pdfData = await parseFunc(req.file.buffer);
        const text = pdfData ? pdfData.text : "";

        if (!text || text.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'الملف المرفوع فارغ أو عبارة عن صور غير قابلة للقراءة النصية.'
            });
        }

        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        let extractedTransactions = [];
        let detectedCustomerName = "حساب عام / موظف";

        // البحث التلقائي عن اسم الحساب أو الموظف في الترويسة العليا للملف
        for (let i = 0; i < Math.min(lines.length, 15); i++) {
            let l = lines[i];
            if ((l.includes('محمد') || l.includes('الحساب') || l.includes('الموظف')) && !l.includes('مزارع معجم')) {
                detectedCustomerName = l.replace('رقم الموظف', '').replace('رقم الحساب', '').trim();
                break;
            }
        }

        // الاستخراج التلقائي التام للصفوف (تاريخ + بيان + مبلغ)
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})|(\d{4}-\d{2}-\d{2})/);
            const moneyMatches = line.match(/\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b|\b\d{3,6}(?:\.\d+)?\b/g);

            if (dateMatch && moneyMatches) {
                let dStr = dateMatch[0];
                if (dStr.includes('/')) {
                    const parts = dStr.split('/');
                    if (parts.length === 3) dStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
                let amt = parseFloat(moneyMatches[moneyMatches.length - 1].replace(/,/g, ''));
                let desc = line.replace(dateMatch[0], '').replace(moneyMatches[moneyMatches.length - 1], '').trim();
                desc = desc.replace(/سند صرف نقدي|قيد يومية|الرصيد|الإجمالي/g, '').trim();

                if (amt > 0 && desc.length > 1) {
                    extractedTransactions.push({
                        customerName: detectedCustomerName,
                        date: dStr,
                        statement: desc,
                        credit: amt,
                        debit: 0
                    });
                }
            }
        }

        if (extractedTransactions.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'لم يتمكن النظام من قراءة حركات واضحة من هذا التنسيق. يرجى التأكد من ملف الكشف.'
            });
        }

        await Transaction.insertMany(extractedTransactions);

        res.json({
            success: true,
            message: `تم تفكيك ملف الـ PDF واستخراج ${extractedTransactions.length} حركة بنجاح`,
            count: extractedTransactions.length,
            data: extractedTransactions
        });

    } catch (error) {
        console.error('❌ خطأ في المعالجة التلقائية لـ PDF:', error);
        res.status(500).json({ 
            success: false, 
            message: 'حدث خطأ أثناء تحليل ملف الـ PDF: ' + error.message 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`📡 الخادم يعمل بكفاءة على المنفذ: ${PORT}`);
});
