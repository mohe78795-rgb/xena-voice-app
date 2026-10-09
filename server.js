'use strict';

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = Number(process.env.PORT || 8080);
const MONGO_URI = process.env.MONGO_URI;
const DEFAULT_ACCOUNT_ID = String(process.env.DEFAULT_ACCOUNT_ID || 'mojam-main').trim();
const API_TOKEN = process.env.API_TOKEN || '';
const AI_PROVIDER = String(process.env.AI_PROVIDER || 'local').toLowerCase();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

if (!MONGO_URI) {
  console.error('لم يتم ضبط MONGO_URI. أوقف التشغيل.');
  process.exit(1);
}

app.disable('x-powered-by');
app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

// حماية اختيارية: إذا ضُبط API_TOKEN، يجب أن يرسله تطبيق أندرويد في x-api-key.
app.use('/api', (req, res, next) => {
  if (!API_TOKEN) return next();
  if (req.get('x-api-key') !== API_TOKEN) {
    return res.status(401).json({ success: false, message: 'مفتاح API غير صحيح أو غير موجود.' });
  }
  next();
});

const Mixed = mongoose.Schema.Types.Mixed;
const accountField = { type: String, required: true, index: true, trim: true };

const daySchema = new mongoose.Schema({
  accountId: accountField,
  date: { type: String, required: true, index: true },
  invoices: { type: [Mixed], default: [] },
  returns: { type: [Mixed], default: [] },
  expenses: { type: [Mixed], default: [] },
  incomingCards: { type: [Mixed], default: [] },
  stock: { type: Mixed, default: {} },
  cardMeta: { type: Mixed, default: {} }
}, { timestamps: true, minimize: false });
daySchema.index({ accountId: 1, date: 1 }, { unique: true });

const settingSchema = new mongoose.Schema({
  accountId: accountField,
  key: { type: String, required: true, trim: true },
  value: { type: Mixed, default: null }
}, { timestamps: true, minimize: false });
settingSchema.index({ accountId: 1, key: 1 }, { unique: true });

const customerSchema = new mongoose.Schema({
  accountId: accountField,
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  location: {
    google_maps_url: { type: String, default: '' },
    address: { type: String, default: '' }
  },
  crates_balance: {
    total_delivered: { type: Number, default: 0 },
    total_returned: { type: Number, default: 0 },
    remaining_debt: { type: Number, default: 0 }
  }
}, { timestamps: true, minimize: false });
customerSchema.index({ accountId: 1, phone: 1 }, { unique: true });

const orderSchema = new mongoose.Schema({
  accountId: accountField,
  phone: { type: String, required: true, index: true },
  customerName: { type: String, default: '' },
  message: { type: String, required: true },
  itemType: { type: String, default: 'دجاج' },
  quantity: { type: Number, default: null },
  unit: { type: String, enum: ['صندوق', 'حبة', 'غير محدد'], default: 'غير محدد' },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'MojamInvoice', default: null },
  channel: { type: String, default: 'android' }
}, { timestamps: true, minimize: false });
orderSchema.index({ accountId: 1, phone: 1, createdAt: -1 });

const invoiceSchema = new mongoose.Schema({
  accountId: accountField,
  invoiceNumber: { type: String, required: true },
  phone: { type: String, default: '' },
  customerName: { type: String, default: '' },
  date: { type: String, required: true },
  items: { type: [Mixed], default: [] },
  subtotal: { type: Number, default: null },
  total: { type: Number, default: null },
  paidAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'issued', 'paid', 'cancelled'], default: 'draft' },
  note: { type: String, default: '' },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'MojamOrder', default: null }
}, { timestamps: true, minimize: false });
invoiceSchema.index({ accountId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ accountId: 1, phone: 1, date: -1 });

const messageSchema = new mongoose.Schema({
  accountId: accountField,
  phone: { type: String, required: true, index: true },
  customerName: { type: String, default: '' },
  direction: { type: String, enum: ['inbound', 'outbound'], required: true },
  text: { type: String, required: true },
  status: { type: String, enum: ['received', 'prepared', 'sent', 'failed'], default: 'received' },
  channel: { type: String, default: 'android' },
  relatedInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'MojamInvoice', default: null },
  meta: { type: Mixed, default: {} }
}, { timestamps: true, minimize: false });
messageSchema.index({ accountId: 1, phone: 1, createdAt: -1 });

const trainingSchema = new mongoose.Schema({
  accountId: accountField,
  question: { type: String, required: true, trim: true },
  answer: { type: String, required: true, trim: true },
  tags: { type: [String], default: [] },
  active: { type: Boolean, default: true }
}, { timestamps: true, minimize: false });
trainingSchema.index({ accountId: 1, active: 1 });

const DayModel = mongoose.model('MojamDay', daySchema, 'mojam_days');
const SettingModel = mongoose.model('MojamSetting', settingSchema, 'mojam_settings');
const CustomerModel = mongoose.model('Zoe', customerSchema, 'zoe');
const OrderModel = mongoose.model('MojamOrder', orderSchema, 'orders');
const InvoiceModel = mongoose.model('MojamInvoice', invoiceSchema, 'invoices');
const MessageModel = mongoose.model('MojamMessage', messageSchema, 'messages');
const TrainingModel = mongoose.model('MojamTraining', trainingSchema, 'training_examples');

function accountOf(req) {
  const id = req.get('x-account-id') || req.query.accountId || req.body?.accountId || DEFAULT_ACCOUNT_ID;
  return String(id).trim().slice(0, 120) || DEFAULT_ACCOUNT_ID;
}
function todayInAden() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Aden', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
function normalizePhone(value) {
  let phone = String(value || '').replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '');
  if (phone.startsWith('967') && phone.length > 9) phone = phone.slice(3);
  return phone;
}
function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[\u064B-\u065F\u0670ـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').trim();
}
function toArabicDigits(value) {
  return String(value).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}
function dayPayload(body = {}) {
  return {
    invoices: Array.isArray(body.invoices) ? body.invoices : [],
    returns: Array.isArray(body.returns) ? body.returns : [],
    expenses: Array.isArray(body.expenses) ? body.expenses : [],
    incomingCards: Array.isArray(body.incomingCards) ? body.incomingCards : [],
    stock: body.stock && typeof body.stock === 'object' ? body.stock : {},
    cardMeta: body.cardMeta && typeof body.cardMeta === 'object' ? body.cardMeta : {}
  };
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function invoiceDue(invoice) {
  const total = Number(invoice.total);
  const paid = Number(invoice.paidAmount ?? invoice.paid_amount ?? 0);
  return Number.isFinite(total) ? Math.max(0, total - (Number.isFinite(paid) ? paid : 0)) : 0;
}
function sumInvoicePayments(inv) {
  if (Number.isFinite(Number(inv.paidAmount))) return Number(inv.paidAmount);
  if (Number.isFinite(Number(inv.paid_amount))) return Number(inv.paid_amount);
  return Array.isArray(inv.payments) ? inv.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) : 0;
}
function invoicePhone(inv) {
  return normalizePhone(inv.phone || inv.customerPhone || inv.customer_phone);
}

async function getCustomer(accountId, phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  // تطابق كامل فقط، لتجنب إظهار حساب عميل آخر بسبب أرقام متشابهة.
  const candidates = await CustomerModel.find({ accountId }).lean();
  return candidates.find(c => normalizePhone(c.phone) === normalized) || null;
}
async function collectCustomerInvoices(accountId, customer) {
  const phone = normalizePhone(customer?.phone);
  const name = normalizeText(customer?.name || '');
  const dedicated = await InvoiceModel.find({ accountId, status: { $ne: 'cancelled' } }).sort({ date: -1 }).limit(1000).lean();
  const matches = dedicated.filter(inv => (phone && normalizePhone(inv.phone) === phone) ||
    (name && normalizeText(inv.customerName) === name));
  // قراءة الفواتير القديمة المخزنة داخل mojam_days للتوافق مع نسخة التطبيق السابقة.
  const days = await DayModel.find({ accountId }).sort({ date: -1 }).limit(730).lean();
  for (const day of days) {
    for (const inv of (day.invoices || [])) {
      const number = String(inv.num || inv.invoiceNumber || inv.invoice_number || '');
      if (matches.some(x => String(x.invoiceNumber) === number && number)) continue;
      if ((phone && invoicePhone(inv) === phone) || (name && normalizeText(inv.customer || inv.customerName) === name)) {
        matches.push({ ...inv, invoiceNumber: number, date: inv.date || day.date, paidAmount: sumInvoicePayments(inv) });
      }
    }
  }
  return matches;
}
async function customerContext(accountId, phone) {
  const customer = await getCustomer(accountId, phone);
  if (!customer) return { customer: null, crates: null, account: null };
  const invoices = await collectCustomerInvoices(accountId, customer);
  const unpaid = invoices.filter(inv => invoiceDue(inv) > 0);
  return {
    customer: { name: customer.name, phone: customer.phone, location: customer.location || {} },
    crates: {
      delivered: Number(customer.crates_balance?.total_delivered) || 0,
      returned: Number(customer.crates_balance?.total_returned) || 0,
      remaining: Number(customer.crates_balance?.remaining_debt) || 0
    },
    account: {
      financialDue: unpaid.reduce((sum, inv) => sum + invoiceDue(inv), 0),
      unpaidInvoices: unpaid.length,
      unpaid: unpaid.slice(0, 20).map(inv => ({
        date: inv.date, number: inv.invoiceNumber || inv.num || '', total: Number(inv.total) || 0,
        due: invoiceDue(inv), status: inv.status || 'legacy'
      }))
    }
  };
}
async function inventorySummary(accountId, date = todayInAden()) {
  const day = await DayModel.findOne({ accountId, date }).lean();
  if (!day) return { date, categories: {}, note: 'لا توجد بيانات مخزون مسجلة لهذا اليوم.' };
  const incoming = {}, sold = {};
  for (const card of day.incomingCards || []) for (const line of (card.lines || [])) {
    const category = String(line.cat || 'أخرى');
    const qty = (Number(line.boxes) || 0) * (Number(line.cap) || 0) + (Number(line.plus) || 0);
    incoming[category] = (incoming[category] || 0) + qty;
  }
  for (const invoice of day.invoices || []) for (const item of (invoice.items || [])) {
    const category = String(item.name || 'أخرى');
    const qty = Number(item.qty ?? item.quantity);
    if (Number.isFinite(qty)) sold[category] = (sold[category] || 0) + qty;
  }
  const categories = {};
  for (const category of new Set([...Object.keys(incoming), ...Object.keys(sold)])) {
    categories[category] = { incoming: incoming[category] || 0, sold: sold[category] || 0,
      remaining: (incoming[category] || 0) - (sold[category] || 0) };
  }
  return { date, categories };
}
function classifyIntent(message) {
  const text = normalizeText(toArabicDigits(message));
  if (/(الغاء|الغِ|الغي|كنسل|الغ الطلب|إلغاء)/.test(text)) return { type: 'cancel' };
  if (/(رصيد|شبوك|صناديق فارغه|اقفاص|الصندوق|الصناديق)/.test(text)) return { type: 'crates' };
  if (/(حسابي|حساب|علي|عليكم|مديون|مديونيه|رصيد مالي|فاتوره غير|كم المطلوب|المبلغ المستحق|الدين)/.test(text)) return { type: 'account' };
  if (/(اطبع|طباعه|الفاتوره|فاتورتي|ارسل الفاتوره)/.test(text)) return { type: 'invoice' };
  const asksInventory = /(متوفر|المتوفر|موجود|المخزون|كم باقي|كم عندكم|الاسعار|سعر|بكم)/.test(text);
  const asksOrder = /(اطلب|طلب|ابغى|ابي|اريد|بغيت|جيب|جهز|حجز|احجز|زودني|رسل لي)/.test(text);
  const hasChicken = /(دجاج|دواجن|طيور|فراخ)/.test(text);
  if (asksInventory && hasChicken) return { type: 'inventory' };
  if (asksOrder && hasChicken) {
    const qtyMatch = text.match(/(?:^|\s)(\d+(?:\.\d+)?)(?=\s|$)/);
    const quantity = qtyMatch ? Number(qtyMatch[1]) : null;
    let unit = 'غير محدد';
    if (/(حبه|حبات|طير|طيور|بالواحد)/.test(text)) unit = 'حبة';
    else if (/(صندوق|صناديق|كرتون|كراتين|شبك|شبوك)/.test(text)) unit = 'صندوق';
    return { type: 'order', quantity, unit };
  }
  if (hasChicken && asksInventory) return { type: 'inventory' };
  if (hasChicken && /(تريد|اطلب|طلب|ابغى|ابي|اريد|جيب|جهز)/.test(text)) return { type: 'order', quantity: null, unit: 'غير محدد' };
  if (/(دجاج|دواجن|طيور|فراخ)/.test(text)) return { type: 'chicken' };
  return { type: 'general' };
}
async function retrieveTraining(accountId, message, limit = 4) {
  const examples = await TrainingModel.find({ accountId, active: true }).lean();
  const queryTerms = new Set(normalizeText(message).split(/\s+/).filter(w => w.length > 1));
  return examples.map(item => {
    const content = normalizeText(`${item.question} ${(item.tags || []).join(' ')}`);
    const score = [...queryTerms].reduce((sum, term) => sum + (content.includes(term) ? 1 : 0), 0);
    return { item, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(x => x.item);
}
async function getSetting(accountId, key, fallback = null) {
  const row = await SettingModel.findOne({ accountId, key }).lean();
  return row ? row.value : fallback;
}
function fallbackReply(message, context, intent, trainingMatches) {
  const name = context?.customer?.name || 'أخي الكريم';
  if (intent.type === 'crates') {
    if (!context?.customer) return 'لم أتمكن من مطابقة رقمك مع حساب عميل. يرجى إرسال رقم الحساب أو التواصل مع خدمة العملاء.';
    return `رصيد الصناديق المسجل باسم ${name}: المتبقي ${context.crates.remaining} صندوق (المسلّم ${context.crates.delivered}، والراجع ${context.crates.returned}).`;
  }
  if (intent.type === 'account') {
    if (!context?.customer) return 'لم أتمكن من العثور على حساب مرتبط بهذا الرقم. يرجى التواصل مع خدمة العملاء للتحقق.';
    return context.account.financialDue > 0
      ? `يا ${name}، المبلغ المستحق المسجل عليكم ${context.account.financialDue.toLocaleString('en-US')} ريال، على ${context.account.unpaidInvoices} فاتورة غير مسددة.`
      : `حسابكم صافي حسب الفواتير المسجلة لدينا يا ${name}.`;
  }
  if (intent.type === 'inventory') return 'سأتحقق من المخزون المسجل حالياً. إذا لم تظهر الكمية في النظام، يرجى تأكيدها من خدمة العملاء قبل اعتماد الطلب.';
  if (intent.type === 'order') {
    const quantityText = intent.quantity == null ? 'الكمية غير محددة' : `${intent.quantity} ${intent.unit === 'غير محدد' ? '' : intent.unit}`.trim();
    return `تم استلام طلب الدجاج من ${name} (${quantityText}) كمسودة بانتظار تأكيد الكمية والسعر من خدمة العملاء. لم يتم اعتماد الطلب أو احتساب فاتورة نهائية بعد.`;
  }
  if (intent.type === 'cancel') return 'تم استلام طلب الإلغاء. لا يوجد طلب مفتوح حديث مرتبط بهذه الرسالة لإلغائه؛ يرجى ذكر رقم الطلب أو الفاتورة.';
  if (intent.type === 'invoice') return 'أرسل رقم الفاتورة أو اطلبها من واجهة التطبيق لعرض نسخة قابلة للطباعة.';
  const best = trainingMatches?.[0];
  if (best?.answer) return best.answer.replaceAll('{{name}}', name);
  return `حياك الله ${name}. وصلت رسالتك، وسيتم خدمتك من خلال التطبيق.`;
}
async function aiReply(message, context, intent, trainingMatches, accountId) {
  let result = fallbackReply(message, context, intent, trainingMatches);
  if (intent.type === 'general' && !trainingMatches.length) {
    const defaultReply = await getSetting(accountId, 'defaultReply', '');
    if (defaultReply) result = String(defaultReply).replaceAll('{{name}}', context?.customer?.name || 'أخي الكريم');
  }
  if (AI_PROVIDER !== 'gemini' || !GEMINI_API_KEY || intent.type !== 'general') return result;
  const instructions = await getSetting(accountId, 'assistantInstructions', '');
  const trainingContext = trainingMatches.map(x => `سؤال: ${x.question}\nجواب معتمد: ${x.answer}`).join('\n\n');
  const prompt = [
    'أنت مساعد خدمة عملاء عربي. أجب بالعربية وباختصار. لا تخترع أسعاراً أو أرصدة أو مخزوناً. استخدم بيانات العميل وأمثلة التدريب فقط، وإذا لم توجد معلومة فقل إنها غير متوفرة.',
    `تعليمات الحساب: ${String(instructions || '').slice(0, 5000)}`,
    `أمثلة مسترجعة من قاعدة البيانات:\n${trainingContext || 'لا توجد أمثلة مناسبة.'}`,
    `بيانات مؤكدة من قاعدة البيانات: ${JSON.stringify(context || {})}`,
    `رسالة العميل: ${String(message).slice(0, 2000)}`
  ].join('\n\n');
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 400 } }),
      signal: AbortSignal.timeout(12000)
    });
    const data = await response.json();
    const generated = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
    if (response.ok && generated) result = generated;
  } catch (error) {
    console.warn('تعذر الاتصال بالنموذج؛ استُخدم الرد المحلي:', error.message);
  }
  return result;
}
async function createDraftOrder(accountId, phone, name, message, intent, channel) {
  const invoiceNumber = `D-${Date.now().toString(36).toUpperCase()}`;
  const order = await OrderModel.create({ accountId, phone, customerName: name || '', message,
    itemType: 'دجاج', quantity: intent.quantity, unit: intent.unit, status: 'pending', channel });
  const items = [{ name: 'دجاج', qty: intent.quantity, unit: intent.unit, price: null, amount: null }];
  const invoice = await InvoiceModel.create({ accountId, invoiceNumber, phone, customerName: name || '',
    date: todayInAden(), items, subtotal: null, total: null, paidAmount: 0, status: 'draft',
    note: 'مسودة آلية؛ يلزم اعتماد الكمية والسعر قبل إصدار الفاتورة.', orderId: order._id });
  order.invoiceId = invoice._id;
  await order.save();
  await DayModel.findOneAndUpdate({ accountId, date: invoice.date }, {
    $setOnInsert: { accountId, date: invoice.date, stock: {}, invoices: [], returns: [], expenses: [], incomingCards: [], cardMeta: {} },
    $push: { invoices: { num: invoiceNumber, invoiceNumber, customer: name || '', customerName: name || '', phone,
      items, total: null, status: 'draft', createdAt: new Date() } }
  }, { upsert: true, new: true, setDefaultsOnInsert: true });
  return { order, invoice };
}
async function handleCancellation(accountId, phone, message) {
  const normalized = normalizeText(message);
  const numberMatch = normalized.match(/(?:d-|inv-|فاتوره|طلب)\s*([a-z0-9-]+)/i);
  let order = null;
  if (numberMatch) {
    const key = numberMatch[1];
    const invoice = await InvoiceModel.findOne({ accountId, invoiceNumber: new RegExp(`${key}$`, 'i') });
    if (invoice?.orderId) order = await OrderModel.findOne({ _id: invoice.orderId, accountId, phone });
  }
  if (!order) order = await OrderModel.findOne({ accountId, phone, status: 'pending' }).sort({ createdAt: -1 });
  if (!order) return null;
  order.status = 'cancelled';
  await order.save();
  if (order.invoiceId) await InvoiceModel.updateOne({ _id: order.invoiceId, accountId }, { $set: { status: 'cancelled' } });
  return order;
}
async function processClientMessage({ accountId, phone, name, message, channel }) {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone) throw Object.assign(new Error('رقم الهاتف مطلوب بصيغة صحيحة.'), { status: 400 });
  const customer = await getCustomer(accountId, cleanPhone);
  const customerName = customer?.name || String(name || '').trim();
  const inbound = await MessageModel.create({ accountId, phone: cleanPhone, customerName, direction: 'inbound',
    text: String(message).slice(0, 4000), status: 'received', channel });
  const context = await customerContext(accountId, cleanPhone);
  const intent = classifyIntent(message);
  let order = null, invoice = null, cancelledOrder = null;
  if (intent.type === 'order') {
    const created = await createDraftOrder(accountId, cleanPhone, customerName, String(message), intent, channel);
    order = created.order; invoice = created.invoice;
  } else if (intent.type === 'cancel') {
    cancelledOrder = await handleCancellation(accountId, cleanPhone, String(message));
  }
  const trainingMatches = await retrieveTraining(accountId, message);
  let reply;
  if (intent.type === 'inventory') {
    const stock = await inventorySummary(accountId);
    const entries = Object.entries(stock.categories || {}).filter(([, v]) => v.remaining > 0);
    reply = entries.length
      ? `المخزون المسجل اليوم (${stock.date}): ${entries.map(([k, v]) => `${k}: ${v.remaining}`).join('، ')}. يرجى تأكيد التوفر قبل اعتماد الطلب.`
      : 'لا توجد كميات متبقية مسجلة في قاعدة البيانات لهذا اليوم. يرجى تأكيد المخزون من خدمة العملاء.';
  } else if (intent.type === 'cancel') {
    reply = cancelledOrder
      ? `تم إلغاء الطلب ${cancelledOrder._id} بنجاح، وأُلغيت مسودة فاتورته.`
      : 'لم أجد طلباً معلقاً لإلغائه. أرسل رقم الطلب أو تواصل مع خدمة العملاء.';
  } else if (intent.type === 'invoice') {
    reply = fallbackReply(message, context, intent, trainingMatches);
  } else {
    reply = await aiReply(message, context, intent, trainingMatches, accountId);
  }
  const outbound = await MessageModel.create({ accountId, phone: cleanPhone, customerName, direction: 'outbound',
    text: reply, status: 'prepared', channel, relatedInvoice: invoice?._id || null,
    meta: { replyTo: inbound._id, intent: intent.type } });
  return { reply, customerName, context, intent: intent.type, order, invoice, cancelledOrder, inbound, outbound };
}

function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// فحص الخدمة والاتصال بقاعدة البيانات.
app.get('/api/health', (req, res) => res.json({ success: true, service: 'mojam-android-api', database: mongoose.connection.readyState === 1 }));

// مزامنة اليومية مع التطبيق القديم، مع حفظها كوثيقة MongoDB لا كملف على الخادم.
app.get('/api/sync/day', asyncRoute(async (req, res) => {
  const date = String(req.query.date || '');
  if (!validDate(date)) return res.status(400).json({ success: false, message: 'صيغة التاريخ يجب أن تكون YYYY-MM-DD.' });
  const accountId = accountOf(req);
  const data = await DayModel.findOne({ accountId, date }).lean();
  res.json({ success: true, date, data: data || { accountId, date, invoices: [], returns: [], expenses: [], incomingCards: [], stock: {}, cardMeta: {} } });
}));
app.put('/api/sync/day', asyncRoute(async (req, res) => {
  const date = String(req.body.date || '');
  if (!validDate(date)) return res.status(400).json({ success: false, message: 'صيغة التاريخ يجب أن تكون YYYY-MM-DD.' });
  const accountId = accountOf(req);
  const data = await DayModel.findOneAndUpdate({ accountId, date }, { $set: { accountId, date, ...dayPayload(req.body) } },
    { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
  res.json({ success: true, date, data });
}));

// إعدادات محفوظة ضمن مجموعة mojam_settings.
app.get('/api/sync/settings', asyncRoute(async (req, res) => {
  const rows = await SettingModel.find({ accountId: accountOf(req) }).lean();
  res.json({ success: true, data: Object.fromEntries(rows.map(row => [row.key, row.value])) });
}));
app.put('/api/sync/settings', asyncRoute(async (req, res) => {
  const accountId = accountOf(req), settings = req.body.settings;
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return res.status(400).json({ success: false, message: 'settings يجب أن تكون كائناً.' });
  await Promise.all(Object.entries(settings).map(([key, value]) => SettingModel.findOneAndUpdate({ accountId, key },
    { $set: { accountId, key, value } }, { upsert: true, new: true })));
  res.json({ success: true, message: 'تم حفظ الإعدادات في قاعدة البيانات.' });
}));
app.get('/api/settings/:key', asyncRoute(async (req, res) => {
  const row = await SettingModel.findOne({ accountId: accountOf(req), key: req.params.key }).lean();
  res.json({ success: true, data: row?.value ?? null });
}));
app.put('/api/settings/:key', asyncRoute(async (req, res) => {
  const accountId = accountOf(req);
  const row = await SettingModel.findOneAndUpdate({ accountId, key: req.params.key },
    { $set: { accountId, key: req.params.key, value: req.body.value } }, { upsert: true, new: true }).lean();
  res.json({ success: true, data: row });
}));

// العملاء وحساب الصناديق.
app.get('/api/zoe', asyncRoute(async (req, res) => {
  const customers = await CustomerModel.find({ accountId: accountOf(req) }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, count: customers.length, data: customers });
}));
app.get('/api/zoe/search', asyncRoute(async (req, res) => {
  const customer = await getCustomer(accountOf(req), req.query.phone);
  res.json({ success: true, data: customer });
}));
app.post('/api/zoe', asyncRoute(async (req, res) => {
  const accountId = accountOf(req), name = String(req.body.name || '').trim(), phone = normalizePhone(req.body.phone);
  if (!name || !phone) return res.status(400).json({ success: false, message: 'اسم العميل ورقم الهاتف مطلوبان.' });
  const delivered = Number(req.body.total_delivered) || 0, returned = Number(req.body.total_returned) || 0;
  const customer = await CustomerModel.findOneAndUpdate({ accountId, phone }, {
    $set: { accountId, name, phone, 'location.google_maps_url': String(req.body.google_maps_url || ''),
      'location.address': String(req.body.address || '') },
    $inc: { 'crates_balance.total_delivered': delivered, 'crates_balance.total_returned': returned }
  }, { upsert: true, new: true, setDefaultsOnInsert: true });
  customer.crates_balance.remaining_debt = Math.max(0, (Number(customer.crates_balance.total_delivered) || 0) - (Number(customer.crates_balance.total_returned) || 0));
  await customer.save();
  res.json({ success: true, data: customer });
}));
app.get('/api/customers/:phone/account', asyncRoute(async (req, res) => {
  const context = await customerContext(accountOf(req), req.params.phone);
  res.json({ success: true, data: context });
}));

// التدريب المقصود هنا أمثلة وتعليمات محفوظة واسترجاع مشابه، وليس إعادة تدريب أوزان النموذج.
app.get('/api/training', asyncRoute(async (req, res) => {
  const accountId = accountOf(req);
  const [examples, instructions, defaultReply] = await Promise.all([
    TrainingModel.find({ accountId }).sort({ updatedAt: -1 }).lean(),
    getSetting(accountId, 'assistantInstructions', ''), getSetting(accountId, 'defaultReply', '')
  ]);
  res.json({ success: true, training: { instructions, defaultReply, examples } });
}));
app.put('/api/training', asyncRoute(async (req, res) => {
  const accountId = accountOf(req), body = req.body || {};
  const instructions = String(body.instructions || '').slice(0, 10000);
  const defaultReply = String(body.defaultReply || '').slice(0, 1500);
  await Promise.all([
    SettingModel.findOneAndUpdate({ accountId, key: 'assistantInstructions' }, { $set: { accountId, key: 'assistantInstructions', value: instructions } }, { upsert: true }),
    SettingModel.findOneAndUpdate({ accountId, key: 'defaultReply' }, { $set: { accountId, key: 'defaultReply', value: defaultReply } }, { upsert: true })
  ]);
  let examples = [];
  if (Array.isArray(body.examples)) {
    for (const entry of body.examples.slice(0, 300)) {
      const question = String(entry.question || '').trim().slice(0, 800);
      const answer = String(entry.answer || '').trim().slice(0, 1500);
      if (!question || !answer) continue;
      examples.push(await TrainingModel.create({ accountId, question, answer,
        tags: Array.isArray(entry.tags) ? entry.tags.map(x => String(x).slice(0, 50)).slice(0, 20) : [], active: entry.active !== false }));
    }
  }
  res.json({ success: true, message: 'تم حفظ تعليمات وأمثلة التدريب في قاعدة البيانات.', added: examples.length });
}));
app.post('/api/training/examples', asyncRoute(async (req, res) => {
  const question = String(req.body.question || '').trim(), answer = String(req.body.answer || '').trim();
  if (!question || !answer) return res.status(400).json({ success: false, message: 'السؤال والجواب مطلوبان.' });
  const row = await TrainingModel.create({ accountId: accountOf(req), question: question.slice(0, 800), answer: answer.slice(0, 1500),
    tags: Array.isArray(req.body.tags) ? req.body.tags.map(x => String(x).slice(0, 50)).slice(0, 20) : [] });
  res.status(201).json({ success: true, data: row });
}));
app.delete('/api/training/examples/:id', asyncRoute(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'معرف المثال غير صالح.' });
  const result = await TrainingModel.deleteOne({ _id: req.params.id, accountId: accountOf(req) });
  res.json({ success: true, deleted: result.deletedCount });
}));

// رسائل أندرويد: يستقبل الخادم النص ويعيد الرد؛ تطبيق أندرويد هو الذي يرسل SMS بصلاحيات الجهاز.
const inboundHandler = asyncRoute(async (req, res) => {
  const message = String(req.body.message ?? req.body.text ?? '').trim();
  const phone = req.body.phone ?? req.body.phoneNumber ?? req.body.from;
  if (!message) return res.status(400).json({ success: false, message: 'نص الرسالة مطلوب.' });
  const result = await processClientMessage({ accountId: accountOf(req), phone, name: req.body.name, message, channel: String(req.body.channel || 'android') });
  res.json({ success: true, reply: result.reply, customerName: result.customerName, intent: result.intent,
    context: result.context, order: result.order ? { id: result.order._id, status: result.order.status, quantity: result.order.quantity, unit: result.order.unit } : null,
    invoice: result.invoice ? { id: result.invoice._id, invoiceNumber: result.invoice.invoiceNumber, status: result.invoice.status,
      printUrl: `/api/invoices/${result.invoice._id}/print` } : null,
    cancelledOrder: result.cancelledOrder ? { id: result.cancelledOrder._id, status: result.cancelledOrder.status } : null,
    messageIds: { inbound: result.inbound._id, outbound: result.outbound._id } });
});
app.post('/api/mobile/messages/inbound', inboundHandler);
app.post('/api/chat', inboundHandler);
app.post('/api/ai/customer-message', inboundHandler);
app.post('/api/mobile/messages/outbound', asyncRoute(async (req, res) => {
  const accountId = accountOf(req), phone = normalizePhone(req.body.phone), text = String(req.body.message || req.body.text || '').trim();
  if (!phone || !text) return res.status(400).json({ success: false, message: 'رقم الهاتف ونص الرسالة مطلوبان.' });
  let row;
  if (req.body.messageId && mongoose.isValidObjectId(req.body.messageId)) {
    row = await MessageModel.findOneAndUpdate({ _id: req.body.messageId, accountId, phone, direction: 'outbound' },
      { $set: { status: req.body.sent === false ? 'failed' : 'sent', meta: { deviceMessageId: req.body.deviceMessageId || null } } }, { new: true });
  }
  if (!row) row = await MessageModel.create({ accountId, phone, customerName: String(req.body.name || ''), direction: 'outbound',
    text, status: req.body.sent === false ? 'failed' : 'sent', channel: 'android', meta: { deviceMessageId: req.body.deviceMessageId || null } });
  res.json({ success: true, data: row });
}));
app.get('/api/messages', asyncRoute(async (req, res) => {
  const filter = { accountId: accountOf(req) };
  if (req.query.phone) filter.phone = normalizePhone(req.query.phone);
  const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
  const messages = await MessageModel.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ success: true, count: messages.length, data: messages });
}));
app.get('/api/conversations/:phone', asyncRoute(async (req, res) => {
  const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
  const data = await MessageModel.find({ accountId: accountOf(req), phone: normalizePhone(req.params.phone) }).sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ success: true, conversations: data });
}));

// الفواتير: الفاتورة النهائية لا تُصدر إلا بسعر ومجموع معلومين. مسودات الطلب تظل موسومة بوضوح.
app.get('/api/invoices', asyncRoute(async (req, res) => {
  const filter = { accountId: accountOf(req) };
  if (req.query.phone) filter.phone = normalizePhone(req.query.phone);
  if (req.query.date) {
    if (!validDate(req.query.date)) return res.status(400).json({ success: false, message: 'صيغة التاريخ يجب أن تكون YYYY-MM-DD.' });
    filter.date = req.query.date;
  }
  const rows = await InvoiceModel.find(filter).sort({ createdAt: -1 }).limit(Math.max(1, Math.min(200, Number(req.query.limit) || 50))).lean();
  res.json({ success: true, data: rows });
}));
app.post('/api/invoices', asyncRoute(async (req, res) => {
  const accountId = accountOf(req), phone = normalizePhone(req.body.phone || ''), date = String(req.body.date || todayInAden());
  if (!validDate(date)) return res.status(400).json({ success: false, message: 'التاريخ غير صالح.' });
  const items = Array.isArray(req.body.items) ? req.body.items.slice(0, 100) : [];
  if (!items.length) return res.status(400).json({ success: false, message: 'أضف صنفاً واحداً على الأقل.' });
  const cleanItems = items.map(item => {
    const qty = Number(item.qty ?? item.quantity), price = Number(item.price);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price < 0) throw Object.assign(new Error('الكمية والسعر لكل صنف يجب أن يكونا أرقاماً صحيحة.'), { status: 400 });
    return { name: String(item.name || 'صنف').slice(0, 200), qty, unit: String(item.unit || 'حبة'), price, amount: qty * price };
  });
  const total = cleanItems.reduce((sum, item) => sum + item.amount, 0);
  const invoiceNumber = String(req.body.invoiceNumber || `INV-${Date.now().toString(36).toUpperCase()}`).slice(0, 80);
  const invoice = await InvoiceModel.create({ accountId, invoiceNumber, phone, customerName: String(req.body.customerName || '').slice(0, 200),
    date, items: cleanItems, subtotal: total, total, paidAmount: Math.max(0, Number(req.body.paidAmount) || 0),
    status: 'issued', note: String(req.body.note || '').slice(0, 1000) });
  await DayModel.findOneAndUpdate({ accountId, date }, {
    $setOnInsert: { accountId, date, stock: {}, invoices: [], returns: [], expenses: [], incomingCards: [], cardMeta: {} },
    $push: { invoices: { num: invoiceNumber, invoiceNumber, customer: invoice.customerName, customerName: invoice.customerName, phone,
      items: cleanItems, total, paidAmount: invoice.paidAmount, status: 'issued', createdAt: invoice.createdAt } }
  }, { upsert: true, new: true, setDefaultsOnInsert: true });
  res.status(201).json({ success: true, data: invoice, printUrl: `/api/invoices/${invoice._id}/print` });
}));
app.get('/api/invoices/:id/print', asyncRoute(async (req, res) => {
  const accountId = accountOf(req), key = String(req.params.id);
  let invoice = mongoose.isValidObjectId(key) ? await InvoiceModel.findOne({ _id: key, accountId }).lean() : null;
  if (!invoice) invoice = await InvoiceModel.findOne({ accountId, invoiceNumber: key }).lean();
  if (!invoice) return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة.' });
  const rows = (invoice.items || []).map(item => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.qty ?? item.quantity ?? '')} ${escapeHtml(item.unit || '')}</td><td>${item.price == null ? 'بانتظار التسعير' : escapeHtml(item.price)}</td><td>${item.amount == null ? '—' : escapeHtml(item.amount)}</td></tr>`).join('');
  const total = invoice.total == null ? 'مسودة — لم يعتمد السعر' : `${escapeHtml(invoice.total)} ريال`;
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>فاتورة ${escapeHtml(invoice.invoiceNumber)}</title><style>body{font-family:Arial,sans-serif;margin:24px;color:#172033}h1{margin-bottom:4px}.muted{color:#687386}.card{border:1px solid #d8dee8;border-radius:10px;padding:16px;margin:16px 0}table{width:100%;border-collapse:collapse}th,td{padding:10px;border-bottom:1px solid #d8dee8;text-align:right}th{background:#f2f5f9}.total{font-size:1.25rem;font-weight:bold;text-align:left}@media print{button{display:none}body{margin:0}}</style></head><body><button onclick="window.print()">طباعة الفاتورة</button><h1>فاتورة ${escapeHtml(invoice.invoiceNumber)}</h1><div class="muted">${escapeHtml(invoice.date)} · الحالة: ${escapeHtml(invoice.status)}</div><div class="card">العميل: ${escapeHtml(invoice.customerName || '—')}<br>الهاتف: ${escapeHtml(invoice.phone || '—')}</div><table><thead><tr><th>الصنف</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table><p class="total">الإجمالي: ${total}</p><p>المدفوع: ${escapeHtml(invoice.paidAmount || 0)} ريال</p><p class="muted">${escapeHtml(invoice.note || '')}</p><script>if(new URLSearchParams(location.search).get('autoprint')==='1')window.print()</script></body></html>`;
  res.type('html').send(html);
}));
app.get('/api/invoices/:id', asyncRoute(async (req, res) => {
  const key = String(req.params.id), accountId = accountOf(req);
  const invoice = (mongoose.isValidObjectId(key) && await InvoiceModel.findOne({ _id: key, accountId }).lean()) ||
    await InvoiceModel.findOne({ accountId, invoiceNumber: key }).lean();
  if (!invoice) return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة.' });
  res.json({ success: true, data: invoice, printUrl: `/api/invoices/${invoice._id}/print` });
}));
app.get('/api/orders', asyncRoute(async (req, res) => {
  const filter = { accountId: accountOf(req) };
  if (req.query.phone) filter.phone = normalizePhone(req.query.phone);
  const orders = await OrderModel.find(filter).sort({ createdAt: -1 }).limit(Math.max(1, Math.min(200, Number(req.query.limit) || 50))).lean();
  res.json({ success: true, orders });
}));
app.post('/api/orders/:id/cancel', asyncRoute(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'معرف الطلب غير صالح.' });
  const order = await OrderModel.findOneAndUpdate({ _id: req.params.id, accountId: accountOf(req), status: 'pending' }, { $set: { status: 'cancelled' } }, { new: true });
  if (!order) return res.status(404).json({ success: false, message: 'الطلب غير موجود أو غير معلق.' });
  if (order.invoiceId) await InvoiceModel.updateOne({ _id: order.invoiceId, accountId: accountOf(req) }, { $set: { status: 'cancelled' } });
  res.json({ success: true, data: order });
}));

// أخطاء وتوجيهات API فقط؛ لا يقدم السيرفر ملفات واجهة الويب أو ملفات JSON محلية.
app.use((req, res) => res.status(404).json({ success: false, message: 'المسار غير موجود.' }));
app.use((error, req, res, next) => {
  console.error('API error:', error);
  const status = Number(error.status) || 500;
  res.status(status).json({ success: false, message: status < 500 ? error.message : 'حدث خطأ داخلي في السيرفر.' });
});

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 })
  .then(() => {
    console.log('تم الاتصال بـ MongoDB.');
    app.listen(PORT, '0.0.0.0', () => console.log(`Mojam Android API يعمل على المنفذ ${PORT}`));
  })
  .catch(error => {
    console.error('فشل الاتصال بـ MongoDB:', error.message);
    process.exit(1);
  });

process.on('unhandledRejection', error => console.error('Unhandled rejection:', error));
process.on('SIGTERM', async () => { await mongoose.disconnect(); process.exit(0); });
