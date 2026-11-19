# NANDO Messenger — Web prototype

واجهة مراسلة عربية متجاوبة، قابلة للإضافة إلى الشاشة الرئيسية على iPhone كـ PWA عند نشرها عبر HTTPS.

## ما تمت إضافته
- واجهة محادثات عربية RTL متجاوبة وقابلة للتثبيت كـ PWA.
- وضع تجريبي محلي يعمل دون خادم.
- Backend مستقل بـ Node.js وPostgreSQL.
- تسجيل حسابات وتسجيل دخول بكلمات مرور مجزأة باستخدام bcrypt.
- API للمستخدمين والمحادثات الخاصة والجماعية والرسائل.
- Socket.IO للمراسلة الفورية بعد تشغيل الخادم.
- ملف SQL لإنشاء الجداول والفهارس، وملف إعداد محلي `.env.example`.
- شاشة تسجيل الدخول/إنشاء الحساب وربط الواجهة بالـ API عند توفر الخادم.

## مصادر مفتوحة تمت مراجعتها
- Telegram Web K: https://github.com/morethanwords/tweb
- Telegram Web A: https://github.com/Ajaxy/telegram-tt
- TDLib: https://github.com/tdlib/td
- Telegram iOS: https://github.com/TelegramMessenger/Telegram-iOS
- Telegram Android: https://github.com/TelegramMessenger/Telegram-Android
- tgcalls (مراجع هندسة المكالمات): https://github.com/TelegramMessenger/tgcalls
- MTProto Engine: https://github.com/TelegramMessenger/mtproto-engine
- خريطة ربط المصادر داخل المشروع: [docs/SOURCE_INTEGRATION.md](docs/SOURCE_INTEGRATION.md)
- الصفحة الرسمية التي تجمع المصادر والتراخيص: https://telegram.org/apps

## التراخيص والتنبيهات
Telegram تنشر عملاءها الرسميين بتراخيص مختلفة؛ الصفحة الرسمية تذكر GPL-3.0 لعملاء الويب، GPL-2.0-or-later لتطبيقات iOS وAndroid، وBoost 1.0 لـ TDLib. يجب مراجعة ملف LICENSE لكل مستودع والالتزام بشروطه قبل نسخ أو توزيع أي شيفرة. لم يتم نسخ مستودع Telegram كاملًا داخل هذا المشروع؛ الواجهة الحالية مستقلة وتستفيد من أفكار وتجارب العملاء المفتوحة المصدر. لا يوجد كود خادم Telegram عام يمكن دمجه ليمنحنا خوادم تيليجرام.

## حالة التشغيل الحالية
ملفات Backend والواجهة المرتبطة بها موجودة في هذا الفرع، لكن لم يتم إنشاء قاعدة بيانات مستضافة أو نشر API بعد. عند عدم توفر الخادم تعمل الواجهة بوضع تجريبي محلي فقط. راجع [دليل إعداد Backend](docs/BACKEND_SETUP.md).

لا تزال هناك ميزات غير مفعّلة: رفع الملفات إلى تخزين سحابي، إشعارات الدفع، مكالمات الصوت/الفيديو، التشفير الطرفي، استعادة الحساب، واختبارات الإنتاج. لا تعتبر المراسلة السحابية عاملة حتى يتم إعداد `DATABASE_URL` و`JWT_SECRET` ونشر الخادم واجتياز فحص `/health`.
