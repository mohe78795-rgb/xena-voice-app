const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

// دعم مكتبات قراءة الـ PDF المتنوعة تلقائياً
let pdfParse;
try {
    pdfParse = require('pdf-parse-fixed');
} catch (e) {
    pdfParse = require('pdf-parse');
}

const { 
    User, 
    Invoice, 
    Customer, 
    Inventory, 
    Shipment, 
    Transaction, 
    WorkerStatement 
} = require('./models/DataModels');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// إعداد رفع الملفات في الذاكرة
const upload = multer({ storage: multer.memoryStorage() });

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://mohe78795_db_user:737465252@cluster0.qr9q8iv.mongodb.net/magm?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('✅ تم الاتصال بقاعدة بيانات magm وتهيئة السيرفر بنجاح');
        try {
            const collections = await mongoose.connection.db.listCollections({ name: 'كشوف عمال' }).toArray();
            if (collections.length === 0) {
                await mongoose.connection.db.createCollection('كشوف عمال');
                console.log('📂 تم تجهيز مجموعة "كشوف عمال"');
            }
        } catch (err) {
            console.error('❌ خطأ أثناء التحقق من المجموعات:', err);
        }
    })
    .catch(err => console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err));

// دالة مساعدة لتحويل صيغة التاريخ
function parseDate(dateStr) {
    if (!dateStr) return new Date();
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
}

// ----------------------------------------------------
// 🟢 1. فحص حالة السيرفر
// ----------------------------------------------------
app.get('/api/status', (req, res) => {
    res.json({ success: true, message: '🚀 السيرفر يعمل وقاعدة البيانات متصلة بنجاح!' });
});

// ----------------------------------------------------
// 🟢 2. مسارات المصادقة والمستخدمين (Auth)
// ----------------------------------------------------
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
            role: role || 'warehouse',
            status: 'approved'
        });

        await newUser.save();
        res.json({ success: true, message: 'تم حفظ المستخدم في قاعدة البيانات بنجاح', user: newUser });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ----------------------------------------------------
// 🟢 3. مسارات الزبائن (Customers)
// ----------------------------------------------------
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

// ----------------------------------------------------
// 🟢 4. مسارات الفواتير (Invoices)
// ----------------------------------------------------
app.post('/api/invoices', async (req, res) => {
    try {
        const newInvoice = new Invoice(req.body);
        await newInvoice.save();
        res.json({ success: true, message: 'تم حفظ الفاتورة بنجاح في قاعدة البيانات', data: newInvoice });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/invoices', async (req, res) => {
    try {
        const invoices = await Invoice.find().sort({ date: -1 });
        res.json({ success: true, data: invoices });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ----------------------------------------------------
// 🟢 5. مسارات شحنات مسوق المزارع ووارد اليوم
// ----------------------------------------------------
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
            total: Number(r.total) || (Number(r.boxes) * Number(r.packing)) || 0,
            price: Number(r.price) || 0
        }));

        const newShipment = new Shipment({
            farm,
            driver,
            marketer,
            date: date || new Date().toISOString().split('T')[0],
            rows: formattedRows
        });

        await newShipment.save();

        res.status(200).json({
            success: true,
            message: `✅ تمت إضافة الكشف بنجاح وسُجل باسم السائق: ${driver}`
        });
    } catch (error) {
        console.error('خطأ أثناء حفظ الكشف:', error);
        res.status(500).json({ success: false, message: '❌ حدث خطأ داخلي أثناء حفظ الكشف: ' + error.message });
    }
});

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

// ----------------------------------------------------
// 🟢 6. مسار تحليل وتفكيك كشوفات PDF المحاسبية
// ----------------------------------------------------
app.post('/api/upload-statement', upload.single('pdfFile'), async (req, res) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ success: false, message: 'لم يتم استلام أي ملف للتحليل.' });
        }

        const pdfData = await pdfParse(req.file.buffer);
        const text = pdfData && pdfData.text ? pdfData.text : "";
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        let workerName = "";
        let employeeNumber = "31";
        let accountNumber = "1131010001";
        let accountType = "سلفه العاملين من الراتب الشهري";
        let statementPeriodFrom = "01/06/2026";
        let statementPeriodTo = "06/08/2026";
        let generationDate = "";

        // فحص الترويسة
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.includes('من تاريخ') || line.includes('إلى تاريخ')) {
                const datesInLine = line.match(/\b\d{2}\/\d{2}\/\d{4}\b/g);
                if (datesInLine && datesInLine.length >= 2) {
                    statementPeriodFrom = datesInLine[0];
                    statementPeriodTo = datesInLine[1];
                }
            }

            if (line.includes('رقم الموظف')) {
                const parts = line.split(/\s+/);
                if (parts[parts.length - 1] && /^\d+$/.test(parts[parts.length - 1])) {
                    employeeNumber = parts[parts.length - 1];
                }
            }

            if (line.includes('رقم الحساب')) {
                const parts = line.split(/\s+/);
                if (parts[parts.length - 1] && /^\d+$/.test(parts[parts.length - 1])) {
                    accountNumber = parts[parts.length - 1];
                }
                
                for (let j = Math.max(0, i - 4); j <= Math.min(lines.length - 1, i + 4); j++) {
                    let candidate = lines[j];
                    if (
                        candidate.includes('محمد موسى') || 
                        (candidate.includes('محمد') && candidate.includes('معجم'))
                    ) {
                        workerName = candidate;
                        break;
                    }
                }
            }
        }

        if (!workerName) {
            for (let i = 0; i < Math.min(lines.length, 20); i++) {
                let l = lines[i];
                if (l.includes('محمد موسى معجم') || l.includes('محمد موسى')) {
                    workerName = l;
                    break;
                }
            }
        }

        if (!workerName) {
            workerName = "محمد موسى معجم";
        }

        let extractedTransactions = [];
        let totalDebitSum = 0;
        let totalCreditSum = 0;

        const dateRegex = /\b(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/20[2-9][0-9]\b/;
        const amountRegex = /\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b/g;

        let lastValidDate = new Date();
        let runningBalance = 0;

        lines.forEach((line, index) => {
            if (
                line.includes('إجمالي العمليات') || 
                line.includes('الرصيد عليكم') || 
                line.includes('الصفحة') || 
                line.includes('يعتبر هذا الكشف') ||
                line.includes('كشف حساب') ||
                line.includes('رقم الموظف') ||
                line.includes('رقم الحساب') ||
                line.includes('طبع بواسطة') ||
                line.includes('معجم لتجارة') ||
                line.includes('المحاسب') ||
                line.includes('المدير')
            ) {
                return;
            }

            const dateMatch = line.match(dateRegex);
            if (dateMatch) {
                lastValidDate = new Date(parseDate(dateMatch[0]));
            }

            const amounts = line.match(amountRegex);
            if (amounts && amounts.length > 0) {
                const numericAmounts = amounts.map(amt => parseFloat(amt.replace(/,/g, '')));
                let amountVal = numericAmounts[numericAmounts.length - 1];
                
                if (isNaN(amountVal) || amountVal <= 0) return;

                let docNumber = numericAmounts.length > 1 && amounts.length > 1 ? amounts[0] : "";
                let statementText = line.replace(dateRegex, '').replace(amountRegex, '').trim();

                if (statementText.length < 3 && index > 0) {
                    statementText = lines[index - 1];
                }

                let debit = 0;
                let credit = 0;

                if (numericAmounts.length >= 2) {
                    debit = numericAmounts[numericAmounts.length - 2];
                    credit = numericAmounts[numericAmounts.length - 1];
                } else {
                    credit = amountVal;
                }

                runningBalance += (credit - debit);

                extractedTransactions.push({
                    workerName,
                    customerName: workerName,
                    employeeNumber,
                    accountNumber,
                    accountType,
                    docType: "سند صرف / قيد",
                    docNumber,
                    date: lastValidDate,
                    statement: statementText || 'حركة حساب',
                    debit,
                    credit,
                    displayDebit: debit > 0 ? debit.toLocaleString() : '0',
                    displayCredit: credit > 0 ? credit.toLocaleString() : '0',
                    runningBalance,
                    statementPeriodFrom,
                    statementPeriodTo,
                    generationDate
                });

                totalDebitSum += debit;
                totalCreditSum += credit;
            }
        });

        if (extractedTransactions.length > 0) {
            await WorkerStatement.deleteMany({ accountNumber: accountNumber });
            await WorkerStatement.insertMany(extractedTransactions);
        } else {
            return res.status(400).json({ success: false, message: 'لم يتم العثور على حركات صالحة للاستخراج في الملف.' });
        }

        res.json({
            success: true,
            message: `✅ تم تفكيك الكشف وحفظه باسم (${workerName}) برقم حساب (${accountNumber}) بنجاح!`,
            count: extractedTransactions.length,
            totalAmount: totalCreditSum,
            period: { from: statementPeriodFrom, to: statementPeriodTo },
            worker: workerName,
            accountNumber: accountNumber,
            data: extractedTransactions
        });

    } catch (error) {
        console.error('❌ خطأ في المعالجة:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء معالجة ملف الـ PDF: ' + error.message });
    }
});

// ----------------------------------------------------
// 🟢 7. مسارات البحث واستدعاء كشوفات العمال
// ----------------------------------------------------
app.get('/api/search-workers', async (req, res) => {
    try {
        const query = req.query.q || "";
        const workers = await WorkerStatement.distinct('workerName', { 
            workerName: { $regex: query, $options: 'i' } 
        });
        res.json(workers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/get-last-statement/:workerName', async (req, res) => {
    try {
        const workerName = req.params.workerName;
        const data = await WorkerStatement.find({ workerName: workerName }).sort({ date: -1 });
        
        if (data.length === 0) {
            return res.status(404).json({ success: false, message: 'لا يوجد كشف لهذا العامل' });
        }
        
        res.json({ success: true, data: data, worker: workerName });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ----------------------------------------------------
// 🟢 8. تشغيل الخادم
// ----------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`📡 الخادم يعمل بكفاءة على المنفذ: ${PORT}`);
});
