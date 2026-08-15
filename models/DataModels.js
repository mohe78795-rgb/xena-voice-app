const mongoose = require('mongoose');

// 1. نموذج المستخدمين وتسجيل الدخول
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, required: true, default: 'warehouse' },
    status: { type: String, default: 'approved' },
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

// 3. نموذج الزبائن والحسابات مع الحد الائتماني
const customerSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    phone: { type: String, default: '770000000' },
    location: { type: String, default: 'محافظة البيضاء' },
    creditLimit: { type: Number, default: 500000 }, // الحد الأقصى للمديونية
    balance: { type: Number, default: 0 }, // الرصيد الصافي المحدث
    status: { type: String, default: 'active' }, // active | warning | exceeded
    createdAt: { type: Date, default: Date.now }
});

// 4. نموذج الحركات التاريخية لكشف الحساب (يمن سوفت / القيود المستقلة)
const transactionSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    description: { type: String, default: 'قيد حركة حساب' },
    docType: { type: String, default: 'قيد يومية' },
    docNo: { type: String, default: '---' },
    debit: { type: Number, default: 0 }, // مدين (عليه)
    credit: { type: Number, default: 0 }, // دائن (له)
    balanceAfter: { type: Number, default: 0 }, // الرصيد بعد الحركة
    source: { type: String, default: 'pdf_statement' },
    createdAt: { type: Date, default: Date.now }
});

// 5. نموذج روبوت التنبيهات والتحذيرات
const alertSchema = new mongoose.Schema({
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String, required: true },
    currentBalance: { type: Number, required: true },
    creditLimit: { type: Number, required: true },
    message: { type: String, required: true },
    level: { type: String, default: 'warning' }, // warning | danger | info
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// 6. نموذج المخازن والوارد
const inventorySchema = new mongoose.Schema({
    productName: String,
    quantity: Number,
    category: String,
    updatedAt: { type: Date, default: Date.now }
});

// 7. نموذج شحنات مسوق المزارع
const shipmentSchema = new mongoose.Schema({
    farm: { type: String, required: true },
    driver: { type: String, required: true },
    marketer: { type: String, required: true },
    date: { type: String, required: true },
    rows: [
        {
            chickenType: { type: String, required: true },
            boxes: { type: Number, required: true },
            packing: { type: Number, required: true },
            total: { type: Number, required: true },
            price: { type: Number, required: true }
        }
    ],
    createdAt: { type: Date, default: Date.now }
});

module.exports = {
    User: mongoose.model('User', userSchema, 'users'),
    Invoice: mongoose.model('Invoice', invoiceSchema, 'invoices'),
    Customer: mongoose.model('Customer', customerSchema, 'customers'),
    Transaction: mongoose.model('Transaction', transactionSchema, 'transactions'),
    Alert: mongoose.model('Alert', alertSchema, 'alerts'),
    Inventory: mongoose.model('Inventory', inventorySchema, 'inventory'),
    Shipment: mongoose.model('Shipment', shipmentSchema, 'shipments')
};
