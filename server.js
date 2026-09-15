require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// اتصال ذكي بمونجو: يعيد المحاولة تلقائياً عند عودة النت
mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000 // لا يعلق لأكثر من 5 ثواني إذا انقطع النت
})
.then(() => console.log('✅ متصل بسحابة MongoDB Atlas'))
.catch(err => console.log('⚠️ لا يوجد إنترنت حالياً: السيرفر يعمل محلياً وسيتصل بمونجو تلقائياً فور عودة الشبكة'));

const Invoice = mongoose.model('Invoice', new mongoose.Schema({ _id: String }, { strict: false }));
const Expense = mongoose.model('Expense', new mongoose.Schema({ _id: String }, { strict: false }));
const DailyStock = mongoose.model('DailyStock', new mongoose.Schema({ _id: String }, { strict: false }));

app.post('/api/sync', async (req, res) => {
    // إذا لم يكن هناك اتصال بسحابة مونجو حالياً
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ success: false, message: "لا يوجد اتصال بالإنترنت، البيانات ستبقى محفوظة بالهاتف" });
    }

    try {
        const { invoices, expenses, stock } = req.body;

        if (invoices && invoices.length > 0) {
            const invOps = invoices.map(inv => ({
                updateOne: { filter: { _id: inv.id || inv._id }, update: { $set: { ...inv, _id: inv.id || inv._id } }, upsert: true }
            }));
            await Invoice.bulkWrite(invOps);
        }

        if (expenses && expenses.length > 0) {
            const expOps = expenses.map(exp => ({
                updateOne: { filter: { _id: exp.id || exp._id }, update: { $set: { ...exp, _id: exp.id || exp._id } }, upsert: true }
            }));
            await Expense.bulkWrite(expOps);
        }

        if (stock) {
            await DailyStock.updateOne({ _id: `stock_${stock.date}` }, { $set: stock }, { upsert: true });
        }

        res.json({ success: true, message: "تم الترحيل للسحابة بنجاح" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 النظام يعمل على: http://localhost:${PORT}`));
