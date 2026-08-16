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
    sellerName: { type: String, default: 'عمران الدوحي' },
    totalAmount: { type: Number, default: 0 },
    items: { type: Array, default: [] },
    date: { type: Date, default: Date.now }
});

// 3. نموذج الزبائن
const customerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String },
    location: { type: String },
    province: { type: String, default: 'الجمهورية اليمنية - محافظة البيضاء' },
    createdAt: { type: Date, default: Date.now }
});

// 4. نموذج المخازن والجرد
const inventorySchema = new mongoose.Schema({
    productName: { type: String, required: true },
    previousStock: { type: Number, default: 0 },
    incomingToday: { type: Number, default: 0 },
    soldToday: { type: Number, default: 0 },
    remainingStock: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now }
});

// 5. نموذج شحنات مسوق المزارع
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

// 6. نموذج الحركات المالية العامة (Transactions)
const transactionSchema = new mongoose.Schema({
    customerName: { type: String, required: true },
    accountNumber: { type: String },
    date: { type: String },
    statement: { type: String },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    currency: { type: String, default: 'ريال يمني' },
    uploadedAt: { type: Date, default: Date.now }
});

// 7. الهيكل التحليلي لكشوفات العمال (Worker Statements)
const workerStatementSchema = new mongoose.Schema({
    workerName: { type: String, required: true },
    employeeNumber: { type: String },
    accountNumber: { type: String },
    accountType: { type: String },
    docType: { type: String, default: 'سند صرف / قيد' },
    docNumber: { type: String },
    referenceNumber: { type: String },
    date: { type: Date, required: true },
    statement: { type: String },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    displayDebit: { type: String, default: '0' },
    displayCredit: { type: String, default: '0' },
    runningBalance: { type: Number, default: 0 },
    currency: { type: String, default: 'ريال يمني' },
    statementPeriodFrom: { type: String },
    statementPeriodTo: { type: String },
    generationDate: { type: String },
    totalDebitSum: { type: Number, default: 0 },
    totalCreditSum: { type: Number, default: 0 },
    netBalance: { type: Number, default: 0 },
    balanceInWords: { type: String },
    printedBy: { type: String },
    createdAt: { type: Date, default: Date.now }
});

module.exports = {
    User: mongoose.model('User', userSchema, 'users'),
    Invoice: mongoose.model('Invoice', invoiceSchema, 'invoices'),
    Customer: mongoose.model('Customer', customerSchema, 'customers'),
    Inventory: mongoose.model('Inventory', inventorySchema, 'inventory'),
    Shipment: mongoose.model('Shipment', shipmentSchema, 'shipments'),
    Transaction: mongoose.model('Transaction', transactionSchema, 'transactions'),
    WorkerStatement: mongoose.model('WorkerStatement', workerStatementSchema, 'كشوف عمال')
};
