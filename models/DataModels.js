const mongoose = require('mongoose');

// 1. نموذج المستخدمين وتسجيل الدخول
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'employee' },
    createdAt: { type: Date, default: Date.now }
});

// 2. نموذج الفواتير
const invoiceSchema = new mongoose.Schema({
    invoiceNumber: { type: String, required: true },
    buyerName: { type: String, required: true },
    totalAmount: Number,
    items: Array,
    date: { type: Date, default: Date.now }
});

// 3. نموذج الزبائن
const customerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: String,
    location: String,
    createdAt: { type: Date, default: Date.now }
});

// 4. نموذج المخازن والوارد
const inventorySchema = new mongoose.Schema({
    productName: String,
    quantity: Number,
    category: String,
    updatedAt: { type: Date, default: Date.now }
});

// تصدير النماذج لتعمل تلقائياً وفتحة الكولكشنات في قاعدة بيانات magm
module.exports = {
    User: mongoose.model('User', userSchema, 'users'),
    Invoice: mongoose.model('Invoice', invoiceSchema, 'invoices'),
    Customer: mongoose.model('Customer', customerSchema, 'customers'),
    Inventory: mongoose.model('Inventory', inventorySchema, 'inventory')
};
