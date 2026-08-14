const mongoose = require('mongoose');

// 1. نموذج المستخدمين
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

// 5. [كولكشن جديد] نموذج قسم مسؤول مزارع (وارد المزارع والتحديث الفردي للحقول)
const marketShipmentSchema = new mongoose.Schema({
    farmName: { type: String, default: 'مزرعة كيدان' },
    shipmentDetails: { type: String, default: 'حمول دينة الفيضي' },
    marketerName: { type: String, default: 'صالح بصير' },
    shipmentDate: { type: String, default: '14-08-2026' },
    // تفاصيل الجدول لكل نوع دجاج
    rows: {
        type: Map,
        of: {
            boxes: Number,
            packing: Number,
            price: Number
        },
        default: {
            "كبير": { boxes: 15, packing: 10, price: 1800 },
            "مخورج": { boxes: 20, packing: 12, price: 1650 },
            "متوسط": { boxes: 10, packing: 10, price: 1500 },
            "مطاعم": { boxes: 25, packing: 8, price: 1400 },
            "صغير": { boxes: 8, packing: 15, price: 1200 },
            "جفش": { boxes: 5, packing: 10, price: 900 }
        }
    },
    updatedAt: { type: Date, default: Date.now }
});

// تصدير النماذج وتفعيل الكولكشنات في قاعدة بيانات magm
module.exports = {
    User: mongoose.model('User', userSchema, 'users'),
    Invoice: mongoose.model('Invoice', invoiceSchema, 'invoices'),
    Customer: mongoose.model('Customer', customerSchema, 'customers'),
    Inventory: mongoose.model('Inventory', inventorySchema, 'inventory'),
    MarketShipment: mongoose.model('MarketShipment', marketShipmentSchema, 'market_shipments')
};
