const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const { exec } = require('child_process');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// البرمجيات الوسيطة
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// تعريف الموديولات
const modules = [
  { pathName: 'service1', apiName: 'module1', dirName: 'module_1', dbUri: process.env.MONGO_URI_SERVICE1 },
  { pathName: 'service2', apiName: 'module2', dirName: 'module_2', dbUri: process.env.MONGO_URI_SERVICE2 },
  { pathName: 'service3', apiName: 'module3', dirName: 'module_3', dbUri: process.env.MONGO_URI_SERVICE3 },
  { pathName: 'service4', apiName: 'module4', dirName: 'module_4', dbUri: process.env.MONGO_URI_SERVICE4 },
  { pathName: 'service5', apiName: 'module5', dirName: 'module_5', dbUri: process.env.MONGO_URI_SERVICE5 },
  { pathName: 'settings', apiName: 'settings', dirName: 'settings', dbUri: process.env.MONGO_URI_SETTINGS }
];

// تسجيل الموديولات بأمان
modules.forEach((mod) => {
  const modDir = path.join(__dirname, mod.dirName);
  const publicPath = path.join(modDir, 'public');

  // 1. تقديم الواجهات الساكنة فقط إذا كان المجلد موجوداً
  if (fs.existsSync(publicPath)) {
    app.use(`/${mod.pathName}`, express.static(publicPath));
  }

  // 2. الاتصال بقواعد البيانات الخاصة بالخدمة
  let dbConnection = null;
  if (mod.dbUri) {
    dbConnection = mongoose.createConnection(mod.dbUri);
    dbConnection.on('connected', () => console.log(`✅ [${mod.dirName}] متصل بقاعدته بنجاح`));
    dbConnection.on('error', (err) => console.error(`⚠️ [${mod.dirName}] خطأ اتصال:`, err.message));
  }

  // 3. ربط الـ Router بدون تسجيل مسارات وهمية للموديولات المفقودة
  const routePath = path.join(modDir, 'route.js');
  if (fs.existsSync(routePath)) {
    try {
      const route = require(routePath);
      if (typeof route === 'function') {
        app.use(`/${mod.apiName}/api`, route(dbConnection));
      } else if (route && route.stack) {
        app.use(`/${mod.apiName}/api`, route);
      }
    } catch (err) {
      console.error(`⚠️ خطأ في تحميل الـ API للخدمة ${mod.dirName}:`, err.message);
    }
  }
});

// الواجهة الرئيسية (iframe)
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl" class="h-full overflow-hidden">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>العنوان ون كارد - للدفع الإلكتروني</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        html, body { height: 100%; width: 100%; margin: 0; padding: 0; overflow: hidden; font-family: 'Tajawal', sans-serif; }
        .nav-link.active { color: #10b981; font-weight: bold; }
      </style>
    </head>
    <body class="bg-slate-900 text-white flex flex-col justify-between">

      <header class="h-[52px] flex-none bg-slate-900 text-white px-3 flex justify-between items-center border-b border-slate-800">
        <div class="flex items-center space-x-2 space-x-reverse">
          <div class="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 font-black text-xs border border-slate-700">
            <i class="fa-solid fa-credit-card text-sm"></i>
          </div>
          <div>
            <h1 class="text-xs font-black leading-none text-slate-100">العنوان ون كارد</h1>
            <p class="text-[9px] text-emerald-400 font-semibold mt-1">للدفع الإلكتروني والخدمات</p>
          </div>
        </div>

        <button onclick="reloadCurrentFrame()" class="bg-slate-800 text-slate-300 p-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700">
          <i id="headerRefreshIcon" class="fa-solid fa-rotate-right text-emerald-400 text-xs"></i>
          <span class="text-[10px]">تحديث</span>
        </button>
      </header>

      <main class="flex-1 w-full relative overflow-hidden bg-slate-950">
        <!-- الرابط الافتراضي للـ iframe عند فتح التطبيق -->
        <iframe id="mainFrame" src="https://0zk30qr9iu.onrender.com" class="w-full h-full border-0 block"></iframe>
      </main>

      <nav class="flex-none bg-slate-900 border-t border-slate-800">
        <div class="w-full grid grid-cols-6 gap-0 text-center h-[58px] items-center px-1">
          
          <!-- الزر 1: اتصالات (تم ربطه بالرابط المطلوب) -->
          <button onclick="loadService('https://0zk30qr9iu.onrender.com', this)" class="nav-link active flex flex-col items-center justify-center h-full text-emerald-400">
            <i class="fa-solid fa-tower-cell text-base mb-0.5"></i>
            <span class="text-[9px]">اتصالات</span>
          </button>
          
          <!-- الزر 2: المحفظة -->
          <button onclick="loadService('https://6a9af7a5ff449e0763b2ee62--illustrious-faun-4fb7a4.netlify.app/', this)" class="nav-link flex flex-col items-center justify-center h-full text-slate-400">
            <i class="fa-solid fa-wallet text-base mb-0.5"></i>
            <span class="text-[9px]">المحفظة</span>
          </button>

          <button onclick="loadService('/service3/', this)" class="nav-link flex flex-col items-center justify-center h-full text-slate-400">
            <i class="fa-solid fa-receipt text-base mb-0.5"></i>
            <span class="text-[9px]">خدمة 3</span>
          </button>
          <button onclick="loadService('/service4/', this)" class="nav-link flex flex-col items-center justify-center h-full text-slate-400">
            <i class="fa-solid fa-sliders text-base mb-0.5"></i>
            <span class="text-[9px]">خدمة 4</span>
          </button>
          <button onclick="loadService('/service5/', this)" class="nav-link flex flex-col items-center justify-center h-full text-slate-400">
            <i class="fa-solid fa-chart-pie text-base mb-0.5"></i>
            <span class="text-[9px]">تقارير</span>
          </button>
          <button onclick="loadService('/settings/', this)" class="nav-link flex flex-col items-center justify-center h-full text-slate-400">
            <i class="fa-solid fa-gear text-base mb-0.5"></i>
            <span class="text-[9px]">الإعدادات</span>
          </button>
        </div>
      </nav>

      <script>
        function loadService(url, btn) {
          document.getElementById('mainFrame').src = url;
          document.querySelectorAll('.nav-link').forEach(b => {
            b.classList.remove('active', 'text-emerald-400');
            b.classList.add('text-slate-400');
          });
          btn.classList.add('active', 'text-emerald-400');
          btn.classList.remove('text-slate-400');
        }

        function reloadCurrentFrame() {
          const frame = document.getElementById('mainFrame');
          const icon = document.getElementById('headerRefreshIcon');
          icon.classList.add('fa-spin');
          frame.contentWindow.location.reload();
          setTimeout(() => icon.classList.remove('fa-spin'), 600);
        }
      </script>
    </body>
    </html>
  `);
});

// إدارة المنفذ وتشغيل السيرفر
const killPort = (port, callback) => {
  const isWin = process.platform === 'win32';
  const command = isWin
    ? `for /f "tokens=5" %a in ('netstat -aon ^| findstr :${port}') do taskkill /f /pid %a`
    : `lsof -i:${port} -t | xargs kill -9`;

  exec(command, () => { if (callback) callback(); });
};

const startServer = () => {
  const server = app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`\n🚀 سيرفر الواجهة يعمل عبر: http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`\n⚠️ المنفذ ${PORT} مشغول، جارِ إعادة التشغيل...`);
      killPort(PORT, () => setTimeout(startServer, 1000));
    } else {
      console.error('❌ خطأ غير متوقع:', err);
    }
  });
};

startServer();

