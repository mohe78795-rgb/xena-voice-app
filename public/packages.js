/**
 * packages.js - قاعدة بيانات باقات وعروض شبكات الاتصالات والإنترنت في اليمن
 * مستخرجة بالكامل من وثيقة الربط البرمجي (API Documentation)
 */

const YEMEN_PACKAGES_DATA = [
  // =========================================================================
  // 1. يمن موبايل (YEMEN MOBILE)
  // =========================================================================

  // باقات مزايا وهدايا الأساسية
  { company: "Yemen Mobile", name_ar: "هدايا - الشهرية (فوترة)", code: "A68329", price: 1500, payment_type: "فوترة", line_type: "شريحة + برمجة", category: "باقات هدايا" },
  { company: "Yemen Mobile", name_ar: "مزايا الاسبوعية", code: "A64329", price: 479, payment_type: "دفع مسبق", line_type: "شريحة", category: "باقات مزايا" },
  { company: "Yemen Mobile", name_ar: "مزايا الشهرية - دفع مسبق", code: "A38394", price: 1196, payment_type: "دفع مسبق", line_type: "شريحة + برمجة", category: "باقات مزايا" },
  { company: "Yemen Mobile", name_ar: "هدايا - فوترة الاسبوعية", code: "A44330", price: 600, payment_type: "فوترة", line_type: "شريحة + برمجة", category: "باقات هدايا" },
  { company: "Yemen Mobile", name_ar: "هدايا توفير 250", code: "A66328", price: 250, payment_type: "فوترة", line_type: "شريحة + برمجة", category: "باقات هدايا" },
  { company: "Yemen Mobile", name_ar: "مزايا ماكس الشهرية", code: "A75328", price: 2000, payment_type: "دفع مسبق", line_type: "شريحة + برمجة", category: "باقات مزايا" },
  { company: "Yemen Mobile", name_ar: "هدايا ماكس الشهرية للفوترة", code: "A76328", price: 3000, payment_type: "فوترة", line_type: "شريحة + برمجة", category: "باقات هدايا" },

  // باقات فورجي (4G Data) - دفع مسبق وفوترة
  { company: "Yemen Mobile", name_ar: "باقة مزايا فورجي 1 جيجا اليومية", code: "A88337", price: 400, payment_type: "دفع مسبق", line_type: "شريحة", category: "باقات فورجي" },
  { company: "Yemen Mobile", name_ar: "باقة مزايا فورجي 2 جيجا الاسبوعية", code: "A88336", price: 1400, payment_type: "دفع مسبق", line_type: "شريحة", category: "باقات فورجي" },
  { company: "Yemen Mobile", name_ar: "باقة مزايا فورجي 4 جيجا الشهرية", code: "A88335", price: 2400, payment_type: "دفع مسبق", line_type: "شريحة", category: "باقات فورجي" },
  { company: "Yemen Mobile", name_ar: "باقة فورجي 6 جيجا الشهرية", code: "A88332", price: 2400, payment_type: "دفع مسبق", line_type: "شريحة", category: "باقات فورجي" },
  { company: "Yemen Mobile", name_ar: "باقة فورجي 12 جيجا الشهرية", code: "A88333", price: 4400, payment_type: "دفع مسبق", line_type: "شريحة", category: "باقات فورجي" },
  { company: "Yemen Mobile", name_ar: "باقة فورجي 25 جيجا الشهرية", code: "A88334", price: 9000, payment_type: "دفع مسبق", line_type: "شريحة", category: "باقات فورجي" },
  { company: "Yemen Mobile", name_ar: "باقة مزايا فورجي 1 جيجا اليومية (فوترة)", code: "A88340", price: 400, payment_type: "فوترة", line_type: "شريحة", category: "باقات فورجي" },
  { company: "Yemen Mobile", name_ar: "باقة مزايا فورجي 2 جيجا الاسبوعية (فوترة)", code: "A88339", price: 1400, payment_type: "فوترة", line_type: "شريحة", category: "باقات فورجي" },
  { company: "Yemen Mobile", name_ar: "باقة مزايا فورجي 4 جيجا الشهرية (فوترة)", code: "A88338", price: 2400, payment_type: "فوترة", line_type: "شريحة", category: "باقات فورجي" },
  { company: "Yemen Mobile", name_ar: "باقة فورجي 6 جيجا الشهرية (فوترة)", code: "A88329", price: 2400, payment_type: "فوترة", line_type: "شريحة", category: "باقات فورجي" },
  { company: "Yemen Mobile", name_ar: "باقة فورجي 12 جيجا الشهرية (فوترة)", code: "A88330", price: 4400, payment_type: "فوترة", line_type: "شريحة", category: "باقات فورجي" },
  { company: "Yemen Mobile", name_ar: "باقة فورجي 25 جيجا الشهرية (فوترة)", code: "A88331", price: 9000, payment_type: "فوترة", line_type: "شريحة", category: "باقات فورجي" },
  { company: "Yemen Mobile", name_ar: "باقة سوبر فورجي الشهرية (دفع مسبق)", code: "A5533822", price: 2000, payment_type: "دفع مسبق", line_type: "شريحة", category: "باقات فورجي" },
  { company: "Yemen Mobile", name_ar: "باقة سوبر فورجي الشهرية (فوترة)", code: "A5533821", price: 2000, payment_type: "فوترة", line_type: "شريحة", category: "باقات فورجي" },

  // باقات فولتي (VoLTE)
  { company: "Yemen Mobile", name_ar: "مزايا فولتي اليومية (1G + 40 دقيقة + 40 رسالة)", code: "A4990004", price: 400, payment_type: "دفع مسبق", line_type: "شريحة", category: "باقات فولتي VoLTE" },
  { company: "Yemen Mobile", name_ar: "مزايا فولتي اليومية فوترة (1G + 40 دقيقة + 40 رسالة)", code: "A4990003", price: 400, payment_type: "فوترة", line_type: "شريحة", category: "باقات فولتي VoLTE" },
  { company: "Yemen Mobile", name_ar: "مزايا فولتي الاسبوعية (2G + 200 دقيقة + 200 رسالة)", code: "A4990005", price: 1400, payment_type: "دفع مسبق", line_type: "شريحة", category: "باقات فولتي VoLTE" },
  { company: "Yemen Mobile", name_ar: "مزايا فولتي الاسبوعية فوترة (2G + 200 دقيقة + 200 رسالة)", code: "A4990002", price: 1400, payment_type: "فوترة", line_type: "شريحة", category: "باقات فولتي VoLTE" },
  { company: "Yemen Mobile", name_ar: "مزايا فولتي الشهرية (4G + 300 دقيقة + 300 رسالة)", code: "A4990006", price: 2400, payment_type: "دفع مسبق", line_type: "شريحة", category: "باقات فولتي VoLTE" },
  { company: "Yemen Mobile", name_ar: "مزايا فولتي الشهرية فوترة (4G + 300 دقيقة + 300 رسالة)", code: "A4990001", price: 2400, payment_type: "فوترة", line_type: "شريحة", category: "باقات فولتي VoLTE" },
  { company: "Yemen Mobile", name_ar: "مزايا ماكس فورجي الشهرية (4G + 1000 دقيقة + 500 رسالة)", code: "A88441", price: 3500, payment_type: "دفع مسبق", line_type: "شريحة", category: "باقات فولتي VoLTE" },
  { company: "Yemen Mobile", name_ar: "مزايا ماكس فورجي الشهرية فوترة (4G + 1000 دقيقة + 500 رسالة)", code: "A88440", price: 3500, payment_type: "فوترة", line_type: "شريحة", category: "باقات فولتي VoLTE" },

  // باقات الإنترنت 10 أيام
  { company: "Yemen Mobile", name_ar: "باقة 1 جيجا عشر أيام (شريحة دفع مسبق)", code: "A74331", price: 1400, payment_type: "دفع مسبق", line_type: "شريحة", category: "باقات الإنترنت 10 ايام" },
  { company: "Yemen Mobile", name_ar: "باقة 1 جيجا عشر أيام (برمجة دفع مسبق)", code: "A74332", price: 1400, payment_type: "دفع مسبق", line_type: "برمجة", category: "باقات الإنترنت 10 ايام" },
  { company: "Yemen Mobile", name_ar: "باقة 1 جيجا عشر أيام (شريحة فوترة)", code: "A74335", price: 1400, payment_type: "فوترة", line_type: "شريحة", category: "باقات الإنترنت 10 ايام" },
  { company: "Yemen Mobile", name_ar: "باقة 1 جيجا عشر أيام (برمجة فوترة)", code: "A74336", price: 1400, payment_type: "فوترة", line_type: "برمجة", category: "باقات الإنترنت 10 ايام" },
  { company: "Yemen Mobile", name_ar: "باقة 2 جيجا عشر أيام (شريحة دفع مسبق)", code: "A74339", price: 2600, payment_type: "دفع مسبق", line_type: "شريحة", category: "باقات الإنترنت 10 ايام" },
  { company: "Yemen Mobile", name_ar: "باقة 2 جيجا عشر أيام (برمجة دفع مسبق)", code: "A74338", price: 2600, payment_type: "دفع مسبق", line_type: "برمجة", category: "باقات الإنترنت 10 ايام" },
  { company: "Yemen Mobile", name_ar: "باقة 2 جيجا عشر أيام (شريحة فوترة)", code: "A74340", price: 2600, payment_type: "فوترة", line_type: "شريحة", category: "باقات الإنترنت 10 ايام" },
  { company: "Yemen Mobile", name_ar: "باقة 2 جيجا عشر أيام (برمجة فوترة)", code: "A74341", price: 2600, payment_type: "فوترة", line_type: "برمجة", category: "باقات الإنترنت 10 ايام" },
  { company: "Yemen Mobile", name_ar: "باقة 4 جيجا عشر أيام (شريحة دفع مسبق)", code: "A74345", price: 4800, payment_type: "دفع مسبق", line_type: "شريحة", category: "باقات الإنترنت 10 ايام" },
  { company: "Yemen Mobile", name_ar: "باقة 4 جيجا عشر أيام (برمجة دفع مسبق)", code: "A74346", price: 4800, payment_type: "دفع مسبق", line_type: "برمجة", category: "باقات الإنترنت 10 ايام" },
  { company: "Yemen Mobile", name_ar: "باقة 4 جيجا عشر أيام (شريحة فوترة)", code: "A74348", price: 4800, payment_type: "فوترة", line_type: "شريحة", category: "باقات الإنترنت 10 ايام" },
  { company: "Yemen Mobile", name_ar: "باقة 4 جيجا عشر أيام (برمجة فوترة)", code: "A74349", price: 4800, payment_type: "فوترة", line_type: "برمجة", category: "باقات الإنترنت 10 ايام" },
  { company: "Yemen Mobile", name_ar: "باقة 6 جيجا عشر أيام (شريحة دفع مسبق)", code: "A74351", price: 6000, payment_type: "دفع مسبق", line_type: "شريحة", category: "باقات الإنترنت 10 ايام" },
  { company: "Yemen Mobile", name_ar: "باقة 6 جيجا عشر أيام (برمجة دفع مسبق)", code: "A74352", price: 6000, payment_type: "دفع مسبق", line_type: "برمجة", category: "باقات الإنترنت 10 ايام" },
  { company: "Yemen Mobile", name_ar: "باقة 6 جيجا عشر أيام (شريحة فوترة)", code: "A74354", price: 6000, payment_type: "فوترة", line_type: "شريحة", category: "باقات الإنترنت 10 ايام" },
  { company: "Yemen Mobile", name_ar: "باقة 6 جيجا عشر أيام (برمجة فوترة)", code: "A74355", price: 6000, payment_type: "فوترة", line_type: "برمجة", category: "باقات الإنترنت 10 ايام" },

  // باقات الإنترنت الشهرية ومودم 3G
  { company: "Yemen Mobile", name_ar: "باقة 150 ميجابايت (دفع مسبق شريحة)", code: "A69329", price: 500, payment_type: "دفع مسبق", line_type: "شريحة", category: "باقات الإنترنت الشهرية" },
  { company: "Yemen Mobile", name_ar: "باقة 300 ميجابايت (دفع مسبق شريحة)", code: "A69330", price: 900, payment_type: "دفع مسبق", line_type: "شريحة", category: "باقات الإنترنت الشهرية" },
  { company: "Yemen Mobile", name_ar: "باقة 450 ميجابايت (دفع مسبق شريحة)", code: "A69331", price: 1300, payment_type: "دفع مسبق", line_type: "شريحة", category: "باقات الإنترنت الشهرية" },
  { company: "Yemen Mobile", name_ar: "باقة 700 ميجابايت (دفع مسبق شريحة)", code: "A69338", price: 1800, payment_type: "دفع مسبق", line_type: "شريحة", category: "باقات الإنترنت الشهرية" },
  { company: "Yemen Mobile", name_ar: "باقة 1500 ميجابايت (دفع مسبق شريحة)", code: "A69339", price: 3300, payment_type: "دفع مسبق", line_type: "شريحة", category: "باقات الإنترنت الشهرية" },
  { company: "Yemen Mobile", name_ar: "باقة 3 جيجابايت (دفع مسبق شريحة)", code: "A69340", price: 4500, payment_type: "دفع مسبق", line_type: "شريحة", category: "باقات الإنترنت الشهرية" },
  { company: "Yemen Mobile", name_ar: "باقة 5 جيجابايت (دفع مسبق شريحة)", code: "A69341", price: 7000, payment_type: "دفع مسبق", line_type: "شريحة", category: "باقات الإنترنت الشهرية" },
  { company: "Yemen Mobile", name_ar: "باقة 7 جيجابايت (دفع مسبق شريحة)", code: "A69342", price: 9000, payment_type: "دفع مسبق", line_type: "شريحة", category: "باقات الإنترنت الشهرية" },
  { company: "Yemen Mobile", name_ar: "باقة 15 جيجابايت (دفع مسبق شريحة)", code: "A69343", price: 15000, payment_type: "دفع مسبق", line_type: "شريحة", category: "باقات الإنترنت الشهرية" },
  { company: "Yemen Mobile", name_ar: "باقة 150 ميجابايت (فوترة شريحة)", code: "A69351", price: 500, payment_type: "فوترة", line_type: "شريحة", category: "باقات الإنترنت الشهرية" },
  { company: "Yemen Mobile", name_ar: "باقة 300 ميجابايت (فوترة شريحة)", code: "A69352", price: 900, payment_type: "فوترة", line_type: "شريحة", category: "باقات الإنترنت الشهرية" },
  { company: "Yemen Mobile", name_ar: "باقة 450 ميجابايت (فوترة شريحة)", code: "A69354", price: 1300, payment_type: "فوترة", line_type: "شريحة", category: "باقات الإنترنت الشهرية" },
  { company: "Yemen Mobile", name_ar: "باقة 700 ميجابايت (فوترة شريحة)", code: "A69355", price: 1800, payment_type: "فوترة", line_type: "شريحة", category: "باقات الإنترنت الشهرية" },
  { company: "Yemen Mobile", name_ar: "باقة 1500 ميجابايت (فوترة شريحة)", code: "A69356", price: 3300, payment_type: "فوترة", line_type: "شريحة", category: "باقات الإنترنت الشهرية" },
  { company: "Yemen Mobile", name_ar: "باقة 3 جيجابايت (فوترة شريحة)", code: "A69357", price: 4500, payment_type: "فوترة", line_type: "شريحة", category: "باقات الإنترنت الشهرية" },
  { company: "Yemen Mobile", name_ar: "باقة 5 جيجابايت (فوترة شريحة)", code: "A69358", price: 7000, payment_type: "فوترة", line_type: "شريحة", category: "باقات الإنترنت الشهرية" },
  { company: "Yemen Mobile", name_ar: "باقة 7 جيجابايت (فوترة شريحة)", code: "A69359", price: 9000, payment_type: "فوترة", line_type: "شريحة", category: "باقات الإنترنت الشهرية" },
  { company: "Yemen Mobile", name_ar: "باقة 15 جيجابايت (فوترة شريحة)", code: "A69360", price: 15000, payment_type: "فوترة", line_type: "شريحة", category: "باقات الإنترنت الشهرية" },

  // =========================================================================
  // 2. شركة يو (YOU / MTN)
  // =========================================================================
  { company: "MTN", name_ar: "مكس بلس (PREMIXPLUS)", code: "200", price: 1563, payment_type: "دفع مسبق", category: "باقات مكس" },
  { company: "MTN", name_ar: "مكالمات 400 دقيقة", code: "201", price: 1250, payment_type: "دفع مسبق", category: "باقات المكالمات" },
  { company: "MTN", name_ar: "توفير اليومية", code: "202", price: 513, payment_type: "دفع مسبق", category: "باقات توفير" },
  { company: "MTN", name_ar: "باقة رسايل 750 رسالة", code: "203", price: 1250, payment_type: "دفع مسبق", category: "باقات الرسائل" },
  { company: "MTN", name_ar: "مكالمات 600 دقيقة الأسبوعية", code: "204", price: 1038, payment_type: "دفع مسبق", category: "باقات المكالمات" },
  { company: "MTN", name_ar: "باقة 2 جيجا الأسبوعية", code: "205", price: 1250, payment_type: "دفع مسبق", category: "باقات الإنترنت الشهرية" },
  { company: "MTN", name_ar: "فورجي الاسبوعية (3GB)", code: "206", price: 1478, payment_type: "دفع مسبق", category: "باقات فورجي" },
  { company: "MTN", name_ar: "فورجي الشهرية (5GB)", code: "207", price: 2954, payment_type: "دفع مسبق", category: "باقات فورجي" },
  { company: "MTN", name_ar: "فورجي مكس الاسبوعية", code: "208", price: 1899, payment_type: "دفع مسبق", category: "باقات فورجي" },
  { company: "MTN", name_ar: "فورجي مكس الشهرية", code: "209", price: 2954, payment_type: "دفع مسبق", category: "باقات فورجي" },
  { company: "MTN", name_ar: "فورجي اليومية (1GB)", code: "210", price: 421, payment_type: "دفع مسبق", category: "باقات فورجي" },
  { company: "MTN", name_ar: "فورجي الشهرية 15 جيجا", code: "211", price: 5064, payment_type: "دفع مسبق", category: "باقات فورجي" },
  { company: "MTN", name_ar: "فورجي الشهرية 30 جيجا", code: "212", price: 9283, payment_type: "دفع مسبق", category: "باقات فورجي" },
  { company: "MTN", name_ar: "فوترة 500 ميجا", code: "214", price: 1250, payment_type: "فوترة", category: "باقات الإنترنت الشهرية" },
  { company: "MTN", name_ar: "سوا 250 دقيقة 300 رسالة الشهرية", code: "218", price: 1875, payment_type: "دفع مسبق", category: "باقات سوا" },
  { company: "MTN", name_ar: "سوا مكس الشهرية", code: "219", price: 4375, payment_type: "دفع مسبق", category: "باقات سوا" },
  { company: "MTN", name_ar: "مكس 300 دقيقة 400 رسالة 100 ميجا", code: "220", price: 1250, payment_type: "دفع مسبق", category: "باقات مكس" },
  { company: "MTN", name_ar: "مكس 600 دقيقة 700 رسالة 300 ميجا", code: "221", price: 2500, payment_type: "دفع مسبق", category: "باقات مزايا" },
  { company: "MTN", name_ar: "دفع مسبق 188 ميجابايت", code: "222", price: 1250, payment_type: "دفع مسبق", category: "باقات الإنترنت الشهرية" },
  { company: "MTN", name_ar: "واتساب بلا حدود", code: "223", price: 500, payment_type: "دفع مسبق", category: "باقات التواصل الاجتماعي" },
  { company: "MTN", name_ar: "مكس الاسبوعية", code: "225", price: 513, payment_type: "دفع مسبق", category: "باقات مكس" },
  // =========================================================================
  // 3. شركة سبأفون (SABAPHONE)
  // =========================================================================
  { company: "Sabafon", name_ar: "دفع مسبق يابلاش اليومية", code: "68", price: 482, payment_type: "دفع مسبق", category: "باقات يابلاش" },
  { company: "Sabafon", name_ar: "دفع مسبق يابلاش الاسبوعية", code: "69", price: 482, payment_type: "دفع مسبق", category: "باقات يابلاش" },
  { company: "Sabafon", name_ar: "دفع مسبق يابلاش الشهرية", code: "70", price: 1205, payment_type: "دفع مسبق", category: "باقات يابلاش" },
  { company: "Sabafon", name_ar: "دفع مسبق يابلاش 10 ايام", code: "71", price: 723, payment_type: "دفع مسبق", category: "باقات يابلاش" },
  { company: "Sabafon", name_ar: "دفع مسبق يابلاش سوبر بلس", code: "72", price: 3615, payment_type: "دفع مسبق", category: "باقات يابلاش" },
  { company: "Sabafon", name_ar: "دفع مسبق يابلاش كلام 400 دقيقة", code: "73", price: 1205, payment_type: "دفع مسبق", category: "باقات يابلاش" },
  { company: "Sabafon", name_ar: "دفع مسبق يابلاش بلاس", code: "74", price: 1506, payment_type: "دفع مسبق", category: "باقات يابلاش" },
  { company: "Sabafon", name_ar: "دفع مسبق واتساب الأسبوعية", code: "75", price: 482, payment_type: "دفع مسبق", category: "باقات التواصل الاجتماعي" },
  { company: "Sabafon", name_ar: "دفع مسبق واتساب بلاس الشهرية", code: "76", price: 1506, payment_type: "دفع مسبق", category: "باقات التواصل الاجتماعي" },
  { company: "Sabafon", name_ar: "دفع مسبق فيسبوك وتويتر", code: "77", price: 482, payment_type: "دفع مسبق", category: "باقات التواصل الاجتماعي" },
  { company: "Sabafon", name_ar: "دفع مسبق فيسبوك الشهرية", code: "78", price: 1205, payment_type: "دفع مسبق", category: "باقات التواصل الاجتماعي" },
  { company: "Sabafon", name_ar: "دفع مسبق تواصل اكسترا الشهرية", code: "79", price: 1024, payment_type: "دفع مسبق", category: "باقات التواصل الاجتماعي" },
  { company: "Sabafon", name_ar: "دفع مسبق تواصل الشهرية فيسبوك", code: "80", price: 1988, payment_type: "دفع مسبق", category: "باقات التواصل الاجتماعي" },
  { company: "Sabafon", name_ar: "دفع مسبق سوبرنت اليومية", code: "81", price: 482, payment_type: "دفع مسبق", category: "باقات سوبرنت (إنترنت)" },
  { company: "Sabafon", name_ar: "دفع مسبق سوبرنت 1 (250MB)", code: "82", price: 1205, payment_type: "دفع مسبق", category: "باقات سوبرنت (إنترنت)" },
  { company: "Sabafon", name_ar: "دفع مسبق سوبرنت 2 (500MB)", code: "83", price: 1808, payment_type: "دفع مسبق", category: "باقات سوبرنت (إنترنت)" },
  { company: "Sabafon", name_ar: "دفع مسبق سوبرنت 3 (1024MB)", code: "84", price: 3013, payment_type: "دفع مسبق", category: "باقات سوبرنت (إنترنت)" },
  { company: "Sabafon", name_ar: "دفع مسبق سوبرنت 4 (4000MB)", code: "85", price: 4820, payment_type: "دفع مسبق", category: "باقات سوبرنت (إنترنت)" },
  { company: "Sabafon", name_ar: "دفع مسبق 200 رسالة", code: "86", price: 482, payment_type: "دفع مسبق", category: "باقات الرسائل" },
  { company: "Sabafon", name_ar: "دفع مسبق 600 رسالة", code: "87", price: 723, payment_type: "دفع مسبق", category: "باقات الرسائل" },

  // =========================================================================
  // 4. شركة واي (WHY TELECOM)
  // =========================================================================
  { company: "WHY", name_ar: "شحن باقة كرم 250 (7 أيام)", packageid: "91", code: "91", price: 250, payment_type: "دفع مسبق", category: "باقات كرم" },
  { company: "WHY", name_ar: "شحن باقة كرم 500 (30 يوم)", packageid: "92", code: "92", price: 500, payment_type: "دفع مسبق", category: "باقات كرم" },
  { company: "WHY", name_ar: "شحن باقة كرم 900 (45 يوم)", packageid: "93", code: "93", price: 900, payment_type: "دفع مسبق", category: "باقات كرم" },
  { company: "WHY", name_ar: "شحن باقة كرم 2000 (60 يوم)", packageid: "94", code: "94", price: 2000, payment_type: "دفع مسبق", category: "باقات كرم" },

  // =========================================================================
  // 5. عدن نت (ADEN NET)
  // =========================================================================
  { company: "Aden Net", name_ar: "عدن نت 20 جيجا", code: "3000", num: "3000", price: 3000, payment_type: "دفع مسبق", category: "باقات عدن نت" },
  { company: "Aden Net", name_ar: "عدن نت 40 جيجا", code: "6000", num: "6000", price: 6000, payment_type: "دفع مسبق", category: "باقات عدن نت" },
  { company: "Aden Net", name_ar: "عدن نت 60 جيجا", code: "9000", num: "9000", price: 9000, payment_type: "دفع مسبق", category: "باقات عدن نت" },
  { company: "Aden Net", name_ar: "عدن نت 80 جيجا", code: "12000", num: "12000", price: 12000, payment_type: "دفع مسبق", category: "باقات عدن نت" },
  { company: "Aden Net", name_ar: "عدن نت باقة شهري تجاري", code: "30000", num: "30000", price: 30000, payment_type: "دفع مسبق", category: "باقات عدن نت" }
];

// تصدير البيانات للواجهة
if (typeof window !== 'undefined') {
  window.YEMEN_PACKAGES_DATA = YEMEN_PACKAGES_DATA;
}
