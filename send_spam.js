'use strict';

const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

// رابط جلب العملاء من السيرفر السحابي
const API_URL = 'https://omnifeed-backend-1.onrender.com/api/customers';

// الشريحة المحددة للإرسال (0 تعني الشريحة الأولى SIM 1)
const SIM_SLOT = '0';

// دالة الانتظار (8000 مللي ثانية = 8 ثوانٍ)
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function safeName(value) {
  return String(value || 'عميلنا').replace(/[\r\n\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 70) || 'عميلنا';
}

// قوالب رسائل جادة ومباشرة بعبارة "شاكرين تعاملك"
function getRandomMessage(customerName, amount) {
  const templates = [
    `مكتب معجم للدواجن: الأخ ${customerName}، يلزم سداد المتبقي عليكم للحساب وقدره ${amount} YER دون تأخير. شاكرين تعاملك.`,
    `مكتب معجم للدواجن: العميل ${customerName}، عليك رصيد مستحق لم يتم تسديده بمبلغ ${amount} YER. يرجى السداد المباشر. شاكرين تعاملك.`,
    `مكتب معجم للدواجن: الأخ ${customerName}، المطلوب سداد المبلغ المتبقي لحسابكم البالغ ${amount} YER بأسرع وقت. شاكرين تعاملك.`,
    `مكتب معجم للدواجن: إشعار للعميل ${customerName}، الحساب المتبقي عليك هو ${amount} YER. نرجو التكرم بالتسوية فوراً. شاكرين تعاملك.`,
    `مكتب معجم للدواجن: الأخ ${customerName}، يرجى سرعة سداد الرصيد المستحق عليكم بقيمة ${amount} YER. شاكرين تعاملك.`
  ];

  const randomIndex = Math.floor(Math.random() * templates.length);
  return templates[randomIndex];
}

async function sendSpamReminders() {
  console.log('🔄 جاري جلب قائمة العملاء من السيرفر...');
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`خطأ في الاتصال بالسيرفر: ${response.status}`);
    
    const data = await response.json();
    const customers = data.customers || [];

    console.log(`📦 تم العثور على ${customers.length} عميل. بدء حملة الإرسال عبر الشريحة الأولى (SIM 1) بفاصل 8 ثوانٍ...`);

    for (const customer of customers) {
      const phone = customer.phone;
      const balance = customer.current_balance !== undefined ? customer.current_balance : customer.statement_balance;

      if (phone && Number(balance) > 0 && customer.suspended !== true) {
        const amount = Number(balance).toLocaleString('en-US', { maximumFractionDigits: 2 });
        const name = safeName(customer.customer_name);
        const message = getRandomMessage(name, amount);

        try {
          console.log(`📤 جاري الإرسال عبر SIM 1 إلى: ${name} (${phone}) - المبلغ: ${amount}`);
          await execFileAsync('termux-sms-send', ['-s', SIM_SLOT, '-n', phone, message], { timeout: 30000 });
          console.log(`✅ [تم الإرسال بنجاح] النص: "${message}"`);
        } catch (err) {
          console.error(`❌ [فشل الإرسال] إلى ${phone}:`, err.message);
        }

        console.log('⏳ انتظار 8 ثوانٍ قبل إرسال الرسالة التالية...\n');
        await sleep(8000);
      }
    }
    console.log('🎉 اكتملت حملة الإرسال لجميع العملاء المستهدفين بنجاح!');
  } catch (error) {
    console.error('⚠️ حدث خطأ أثناء جلب العملاء أو التنفيذ:', error.message);
  }
}

sendSpamReminders();
