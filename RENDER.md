# نشر على Render

1. أنشئ Web Service من هذا المجلد.
2. Build Command: `npm install`
3. Start Command: `npm start`
4. أضف Environment Variable:
   - `MONGO_URI` = رابط MongoDB Atlas نفسه المستخدم حاليًا.
5. بعد النشر الروابط:
   - `/` الصفحة الرئيسية والروابط الثلاثة.
   - `/customers.html` إدارة العملاء (رقم، اسم، هاتف، سقف، إيقاف/تعديل).
   - `/pdf.html` رفع PDF ومعاينة واعتماد الأرصدة.
   - `/api/health` فحص اتصال MongoDB.

مهم: لا تضع MONGO_URI داخل الكود أو GitHub؛ ضعه في Render Environment Variables.
