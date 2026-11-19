# NANDO Messenger — Web prototype

واجهة مراسلة عربية متجاوبة، قابلة للإضافة إلى الشاشة الرئيسية على iPhone كـ PWA عند نشرها عبر HTTPS.

## ما تمت إضافته
- واجهة محادثات عربية RTL متجاوبة.
- بحث وفلاتر ومحادثات شخصية ومجموعات تجريبية.
- إرسال رسائل محلية وحفظها في المتصفح عبر localStorage.
- ملف manifest وService Worker لتجربة التثبيت والتشغيل الأساسي دون اتصال بعد أول تحميل.

## مصادر مفتوحة تمت مراجعتها
- Telegram Web K: https://github.com/morethanwords/tweb
- Telegram Web A: https://github.com/Ajaxy/telegram-tt
- TDLib: https://github.com/tdlib/td
- Telegram iOS: https://github.com/TelegramMessenger/Telegram-iOS
- Telegram Android: https://github.com/DrKLO/Telegram
- الصفحة الرسمية التي تجمع المصادر والتراخيص: https://telegram.org/apps

## التراخيص والتنبيهات
Telegram تنشر عملاءها الرسميين بتراخيص مختلفة؛ الصفحة الرسمية تذكر GPL-3.0 لعملاء الويب، GPL-2.0-or-later لتطبيقات iOS وAndroid، وBoost 1.0 لـ TDLib. يجب مراجعة ملف LICENSE لكل مستودع والالتزام بشروطه قبل نسخ أو توزيع أي شيفرة. لم يتم نسخ مستودع Telegram كاملًا داخل هذا المشروع؛ الواجهة الحالية مستقلة وتستفيد من أفكار وتجارب العملاء المفتوحة المصدر. لا يوجد كود خادم Telegram عام يمكن دمجه ليمنحنا خوادم تيليجرام.

## ما يزال غير موجود
لا يوجد تسجيل دخول حقيقي أو مراسلة بين مستخدمين أو قاعدة بيانات سحابية أو إشعارات دفع أو تشفير طرفي. الرسائل الحالية محفوظة على نفس المتصفح والجهاز فقط. مرفقات الملفات مجرد معاينة محلية وليست رفعًا إلى خادم.
