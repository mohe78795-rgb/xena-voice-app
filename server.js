const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const path = require('path');

// قراءة ملف .env الموجود بجانب server.js عند التشغيل محليًا أو على Termux.
// في Render يمكن استخدام Environment Variables مباشرة، وستكون لها الأولوية.
const envFile = path.join(__dirname, '.env');
if (require('fs').existsSync(envFile)) {
  for (const raw of require('fs').readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

const app = express();
const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) console.warn('MONGO_URI غير مضبوط. أضفه في Render Environment Variables.');

const customerSchema = new mongoose.Schema({
  customer_id: { type: Number, required: true, unique: true, index: true },
  customer_name: { type: String, required: true, trim: true },
  statement_balance: { type: Number, default: 0 },
  balance_adjustment: { type: Number, default: 0 },
  credit_limit: { type: Number, default: null },
  phone: { type: String, default: '' },
  suspended: { type: Boolean, default: false },
  currency: { type: String, default: 'YER' },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: true, strict: false });
const statementSchema = new mongoose.Schema({
  _id: { type: String, default: 'current' },
  source_file: String, period: Object, records: Array, records_extracted: Number,
  imported_at: { type: Date, default: Date.now }
}, { strict: false });
const Customer = mongoose.model('Customer', customerSchema, 'customers');
const Statement = mongoose.model('Statement', statementSchema, 'statements');

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 }, fileFilter: (_req, file, cb) => cb(null, file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) });

function normalizeName(value) { return String(value || '').normalize('NFKC').replace(/[\u064b-\u065f\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/[_-]/g, ' ').toLocaleLowerCase('ar').replace(/\s+/g, ' ').trim(); }
function clean(value) { return String(value || '').replace(/[\u202a-\u202e\u2066-\u2069\u200e\u200f\ufeff]/g, '').normalize('NFKC').replace(/[٠-٩۰-۹]/g, c => '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹'.indexOf(c) % 10); }
function amounts(line) {
  const re = /(?<!\d)[-−]?(?:\d[\d.,]*\d|\d)(?!\d)/g;
  return [...String(line).matchAll(re)].map(m => {
    let v = m[0].replace('−','-').replace(/\s/g,''); const c=v.lastIndexOf(','), d=v.lastIndexOf('.');
    if (c >= 0 && d >= 0) v = c > d ? v.replace(/\./g,'').replace(',','.') : v.replace(/,/g,'');
    else if (c >= 0) v = (v.length-c-1 <= 2) ? v.replace(',','.') : v.replace(/,/g,'');
    else if ((v.match(/\./g)||[]).length > 1) v=v.replace(/\./g,'');
    const n=Number(v); return Number.isFinite(n) ? n : null;
  }).filter(v => v !== null);
}
function parseRows(text) {
  const out=[]; const seen=new Set();
  const idRe=/(?<![\d.,])\d{1,4}(?![\d.,])/g;
  const nameRe=/[\u0600-\u06ff][\u0600-\u06ff\s_\-ـ.,()]{1,160}/u;
  for (const raw of String(text).replace(/\f/g,'\n').split(/\r?\n/)) {
    const line=clean(raw).trim(); if(!line) continue;
    const ids=[...line.matchAll(idRe)]; if(!ids.length) continue;
    const nm=line.match(nameRe); if(!nm) continue;
    // pdf-parse قد يعكس ترتيب الأعمدة؛ الرقم قد يكون أول الصف أو آخره.
    const startsWithId=line.match(/^\s*(\d{1,4})(?![\d.,])\s+/);
    const idMatch=startsWithId ? { 0: startsWithId[1] } : ids[ids.length-1];
    const customer_id=Number(idMatch[0]); if(customer_id<=0 || customer_id>=10000 || seen.has(customer_id)) continue;
    const customer_name=nm[0].replace(/\s+/g,' ').replace(/^[_\-.,()\s]+|[_\-.,()\s]+$/g,'');
    if(customer_name.length<2 || !/[\u0600-\u06ff]{2}/u.test(customer_name)) continue;
    seen.add(customer_id); const a=amounts(line).filter(value=>Number(value)!==customer_id);
    out.push({ customer_id, customer_name, balance: a.length ? a[a.length-1] : null, currency:'YER' });
  }
  return out;
}
function dto(c) { const x=c.toObject ? c.toObject() : c; return { ...x, current_balance: x.statement_balance == null ? null : Number(x.statement_balance || 0)+Number(x.balance_adjustment || 0) }; }

app.get('/api/health', (_req,res) => res.json({ ok:true, mongo: mongoose.connection.readyState === 1 }));
app.get('/api/customers', async (req,res) => { try { const q=String(req.query.q||''); const rows=await Customer.find(q ? { $or:[{customer_name:new RegExp(q,'i')},{customer_id:Number(q)||-1}] } : {}).sort({customer_id:1}).limit(500); res.json({customers:rows.map(dto)}); } catch(e){res.status(500).json({error:e.message});} });
app.post('/api/customers', async (req,res) => { try { const b=req.body||{}, id=Number(b.customer_id), name=String(b.customer_name||'').trim(); if(!id||!name) return res.status(400).json({error:'رقم العميل والاسم مطلوبان.'}); const c=await Customer.create({customer_id:id,customer_name:name,phone:String(b.phone||''),credit_limit:b.credit_limit===''||b.credit_limit==null?null:Number(b.credit_limit),suspended:Boolean(b.suspended),statement_balance:0}); res.status(201).json({customer:dto(c)}); } catch(e){res.status(e.code===11000?409:400).json({error:e.code===11000?'رقم العميل موجود مسبقًا.':e.message});} });
app.patch('/api/customers/:id', async (req,res) => { try { const b=req.body||{}, patch={updated_at:new Date()}; for(const k of ['customer_name','phone','suspended']) if(b[k]!==undefined) patch[k]=k==='customer_name'?String(b[k]).trim():b[k]; if(b.credit_limit!==undefined) patch.credit_limit=b.credit_limit===''||b.credit_limit==null?null:Number(b.credit_limit); const c=await Customer.findOneAndUpdate({customer_id:Number(req.params.id)},{$set:patch},{new:true}); if(!c)return res.status(404).json({error:'العميل غير موجود.'}); res.json({customer:dto(c)}); } catch(e){res.status(400).json({error:e.message});} });
app.post('/api/pdf/preview', upload.single('pdf'), async (req,res) => { try { if(!req.file)return res.status(400).json({error:'اختر ملف PDF.'}); const data=await pdfParse(req.file.buffer); const records=parseRows(data.text); if(!records.length)return res.status(422).json({error:'لم أجد صفوف عملاء قابلة للقراءة في PDF.'}); const ids=records.map(x=>x.customer_id); const old=await Customer.find({customer_id:{$in:ids}}); const map=new Map(old.map(x=>[x.customer_id,x])); const items=records.map(r=>({ ...r, old_balance:map.get(r.customer_id)?.statement_balance ?? null, status:!map.has(r.customer_id)?'added':map.get(r.customer_id).statement_balance!==r.balance?'changed':'unchanged' })); res.json({file:req.file.originalname,records:items,summary:{incoming:items.length,added:items.filter(x=>x.status==='added').length,changed:items.filter(x=>x.status==='changed').length,unchanged:items.filter(x=>x.status==='unchanged').length}}); } catch(e){res.status(422).json({error:e.message});} });
app.post('/api/pdf/commit', async (req,res) => { try { const {file,records}=req.body||{}; if(!Array.isArray(records)||!records.length)return res.status(400).json({error:'لا توجد معاينة للاعتماد.'}); let changed=0; for(const r of records){ await Customer.findOneAndUpdate({customer_id:Number(r.customer_id)},{$set:{customer_name:r.customer_name,statement_balance:r.balance,updated_at:new Date()},$setOnInsert:{currency:'YER',balance_adjustment:0,credit_limit:null,phone:'',suspended:false}},{upsert:true,returnDocument:'after'}); changed++; } await Statement.findOneAndUpdate({_id:'current'},{$set:{_id:'current',source_file:file,records,records_extracted:records.length,imported_at:new Date()}},{upsert:true,returnDocument:'after'}); res.json({ok:true,updated:changed}); } catch(e){res.status(500).json({error:e.message});} });
app.get('/', (_req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.use((_req,res)=>res.status(404).json({error:'الرابط غير موجود.'}));
(async()=>{ try { if(MONGO_URI) await mongoose.connect(MONGO_URI); app.listen(PORT,()=>console.log(`Mujam Render server listening on ${PORT}`)); } catch(e){console.error(e); process.exit(1);} })();
