const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const { User, Invoice, Customer, Transaction, Alert, Inventory, Shipment } = require('./models/DataModels');

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://mohe78795_db_user:737465252@cluster0.qr9q8iv.mongodb.net/magm?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ تم الاتصال بقاعدة بيانات magm وترتيب السيرفر بنجاح'))
    .catch(err => console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err));

// روبوت مراقبة الأرصدة والحدود الائتمانية
async function checkCreditLimitRobot(customerDoc, newBalance) {
    if (newBalance >= customerDoc.creditLimit) {
        const warningMsg = `⚠️ تنبيه آلي: العميل (${customerDoc.name}) بلغ أو تجاوز الحد الائتماني المسموح به (${customerDoc.creditLimit.toLocaleString()} ر.ي)! الرصيد الحالي: ${newBalance.toLocaleString()} ر.ي`;
        
        customerDoc.status = 'exceeded';
        await customerDoc.save();

        const newAlert = new Alert({
            customerId: customerDoc._id,
            customerName: customerDoc.name,
            currentBalance: newBalance,
            creditLimit: customerDoc.creditLimit,
            message: warningMsg,
            level: 'danger'
        });
        await newAlert.save();
        return { alertTriggered: true, message: warningMsg };
    } else {
        if (customerDoc.status === 'exceeded') {
            customerDoc.status = 'active';
            await customerDoc.save();
        }
        return { alertTriggered: false };
    }
}

// 1. فحص حالة السيرفر
app.get('/api/status', (req, res) => {
    res.json({ success: true, message: '🚀 السيرفر يعمل وقاعدة البيانات مرتبطة بنجاح!' });
});

// 2. تسجيل الدخول
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

// 3. إنشاء حساب جديد
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

// 4. API رفع ومعالجة كشوفات حساب المحاسب (PDF / Statements)
app.post('/api/accountant/upload-statement', async (req, res) => {
    try {
        const { customerName, phone, location, creditLimit, transactions, statementSource } = req.body;

        if (!customerName || !transactions || !Array.isArray(transactions) || transactions.length === 0) {
            return res.status(400).json({ success: false, message: '⚠️ بيانات الكشف أو اسم صاحب الحساب غير مكتملة.' });
        }

        const cleanName = customerName.trim();

        // 1. استخراج الاسم والتحقق لمنع التكرار
        let customer = await Customer.findOne({ name: cleanName });
        if (!customer) {
            customer = new Customer({
                name: cleanName,
                phone: phone || '770000000',
                location: location || 'محافظة البيضاء',
                creditLimit: Number(creditLimit) || 500000,
                balance: 0,
                status: 'active'
            });
            await customer.save();
        }

        // 2. حفظ الحركات التاريخية المستقلة
        let runningBalance = customer.balance || 0;
        const savedTransactions = [];

        for (const tr of transactions) {
            const debit = Number(tr.debit) || 0;
            const credit = Number(tr.credit) || 0;
            runningBalance += (debit - credit);

            const newTr = new Transaction({
                customerId: customer._id,
                customerName: cleanName,
                date: tr.date || new Date().toISOString().split('T')[0],
                description: tr.description || 'حركة كشف حساب',
                docType: tr.docType || 'سند / فاتورة',
                docNo: tr.docNo || '---',
                debit: debit,
                credit: credit,
                balanceAfter: runningBalance,
                source: statementSource || 'yemen_soft_pdf'
            });

            await newTr.save();
            savedTransactions.push(newTr);
        }

        // 3. تحديث الرصيد الصافي للعميل دون مساس بالسجلات القديمة
        customer.balance = runningBalance;
        await customer.save();

        // 4. تشغيل روبوت التنبيهات والأرصدة
        const robotResult = await checkCreditLimitRobot(customer, runningBalance);

        res.json({
            success: true,
            message: `✅ تم استيراد وحفظ (${savedTransactions.length}) حركة للحساب (${cleanName}) بنجاح.`,
            customer: customer,
            currentBalance: runningBalance,
            robotAlert: robotResult
        });

    } catch (err) {
        console.error('خطأ في معالجة كشف الحساب:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 5. API ملخص الأرصدة اللحظي لجميع العملاء (مرآة لقاعدة البيانات)
app.get('/api/accounts/summary', async (req, res) => {
    try {
        const customers = await Customer.find().sort({ name: 1 });
        
        // حساب إجمالي العمليات والأرصدة المحسوبة بدقة
        const summaryData = await Promise.all(customers.map(async (cust) => {
            const trs = await Transaction.find({ customerId: cust._id });
            let totalDebit = 0;
            let totalCredit = 0;
            trs.forEach(t => {
                totalDebit += (t.debit || 0);
                totalCredit += (t.credit || 0);
            });
            const computedBalance = totalDebit - totalCredit;

            return {
                _id: cust._id,
                name: cust.name,
                phone: cust.phone,
                location: cust.location,
                creditLimit: cust.creditLimit,
                totalDebit: totalDebit,
                totalCredit: totalCredit,
                balance: computedBalance,
                status: computedBalance >= cust.creditLimit ? 'exceeded' : 'active',
                movementsCount: trs.length
            };
        }));

        res.json({ success: true, data: summaryData });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 6. كشف حركة الحساب التفصيلي لعميل
app.get('/api/customers/:id/transactions', async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) return res.status(404).json({ success: false, message: 'العميل غير موجود' });

        const transactions = await Transaction.find({ customerId: customer._id }).sort({ date: 1, createdAt: 1 });
        res.json({ success: true, customer, data: transactions });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 7. تسجيل سند قبض من المحصل النقدي
app.post('/api/collector/collect', async (req, res) => {
    try {
        const { customerId, amount, date, docNo, notes } = req.body;
        const numAmount = Number(amount);

        if (!customerId || !numAmount || numAmount <= 0) {
            return res.status(400).json({ success: false, message: 'يرجى تحديد العميل ومبلغ التحصيل بشكل صحيح.' });
        }

        const customer = await Customer.findById(customerId);
        if (!customer) {
            return res.status(404).json({ success: false, message: 'العميل غير موجود في قاعدة البيانات.' });
        }

        const newBalance = customer.balance - numAmount;

        const newTr = new Transaction({
            customerId: customer._id,
            customerName: customer.name,
            date: date || new Date().toISOString().split('T')[0],
            description: notes || 'سند قبض وتحصيل نقدي',
            docType: 'سند قبض',
            docNo: docNo || 'REC-' + Date.now().toString().slice(-4),
            debit: 0,
            credit: numAmount,
            balanceAfter: newBalance,
            source: 'debt_collector'
        });
        await newTr.save();

        customer.balance = newBalance;
        if (newBalance < customer.creditLimit) {
            customer.status = 'active';
        }
        await customer.save();

        res.json({
            success: true,
            message: `✅ تم تحصيل (${numAmount.toLocaleString()} ر.ي) بنجاح وقيد السند في حساب (${customer.name}).`,
            newBalance
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 8. جلب تنبيهات روبوت الرقابة
app.get('/api/alerts', async (req, res) => {
    try {
        const alerts = await Alert.find().sort({ createdAt: -1 }).limit(20);
        res.json({ success: true, data: alerts });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 9. مسارات الشحنات والفواتير
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

        const newShipment = new Shipment({ farm, driver, marketer, date, rows: formattedRows });
        await newShipment.save();

        res.status(200).json({ success: true, message: '✅ تمت إضافة الكشف إلى قاعدة البيانات بنجاح: ' + driver });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/shipments/today', async (req, res) => {
    try {
        const todayStr = req.query.date || new Date().toISOString().split('T')[0];
        const shipments = await Shipment.find({ date: todayStr }).sort({ createdAt: -1 });
        res.json({ success: true, date: todayStr, count: shipments.length, data: shipments });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`📡 الخادم يعمل بكفاءة على المنفذ: ${PORT}`);
});
