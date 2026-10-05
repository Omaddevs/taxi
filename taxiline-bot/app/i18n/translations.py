"""Simple dict-based i18n. No external framework — the string set is entirely ours and small
enough that a plain dict keeps every translation easy to find and edit in one place.
"""

LANGS = ("uz", "ru", "en")
LANG_LABELS = {"uz": "🇺🇿 O'zbekcha", "ru": "🇷🇺 Русский", "en": "🇬🇧 English"}

TRANSLATIONS: dict[str, dict[str, str]] = {
    "choose_language": {
        "uz": "Tilni tanlang / Выберите язык / Choose language",
        "ru": "Tilni tanlang / Выберите язык / Choose language",
        "en": "Tilni tanlang / Выберите язык / Choose language",
    },
    "welcome": {
        "uz": (
            "Assalomu alaykum, {name}!\n\n"
            "Shaxarlar aro TaxiLine Uzbekistan botiga xush kelibsiz! 🚕\n"
            "Bot orqali safar buyurtma qilishingiz, TaxiLine ilovasidan foydalanishingiz, "
            "haydovchi bo'lib ro'yxatdan o'tishingiz mumkin."
        ),
        "ru": (
            "Здравствуйте, {name}!\n\n"
            "Добро пожаловать в бота TaxiLine Uzbekistan — межгородние поездки! 🚕\n"
            "Через бота вы можете заказать поездку, открыть приложение TaxiLine или "
            "зарегистрироваться как водитель."
        ),
        "en": (
            "Hello, {name}!\n\n"
            "Welcome to the TaxiLine Uzbekistan intercity taxi bot! 🚕\n"
            "You can order a trip, open the TaxiLine app, or register as a driver."
        ),
    },
    "ask_phone": {
        "uz": "Telefon raqamingizni yuboring — pastdagi tugma orqali yoki qo'lda kiriting.",
        "ru": "Отправьте свой номер телефона — кнопкой ниже или введите вручную.",
        "en": "Send your phone number — via the button below or type it manually.",
    },
    "share_phone_btn": {"uz": "📱 Raqamni yuborish", "ru": "📱 Отправить номер", "en": "📱 Share phone number"},
    "invalid_phone": {
        "uz": "Raqam noto'g'ri. Masalan: +998901234567",
        "ru": "Неверный номер. Например: +998901234567",
        "en": "Invalid number. Example: +998901234567",
    },
    "not_registered": {
        "uz": "Siz ro'yxatdan o'tmagansiz. Davom etish uchun ismingizni kiriting:",
        "ru": "Вы не зарегистрированы. Для продолжения введите ваше имя:",
        "en": "You are not registered yet. Please enter your name to continue:",
    },
    "registered_ok": {
        "uz": "Ro'yxatdan muvaffaqiyatli o'tdingiz! ✅",
        "ru": "Вы успешно зарегистрированы! ✅",
        "en": "You have been registered successfully! ✅",
    },
    "welcome_back": {
        "uz": "Yana xush kelibsiz, {name}!",
        "ru": "С возвращением, {name}!",
        "en": "Welcome back, {name}!",
    },
    # Main menu
    "menu_start_trip": {"uz": "🚕 Safarni boshlash", "ru": "🚕 Начать поездку", "en": "🚕 Start a trip"},
    "menu_webapp": {"uz": "🌐 TaxiLine", "ru": "🌐 TaxiLine", "en": "🌐 TaxiLine"},
    "menu_support": {"uz": "🆘 Yordam", "ru": "🆘 Поддержка", "en": "🆘 Support"},
    "menu_become_driver": {"uz": "🚗 Haydovchi bo'lish", "ru": "🚗 Стать водителем", "en": "🚗 Become a driver"},
    "menu_my_trips": {"uz": "📋 Safarlarim", "ru": "📋 Мои поездки", "en": "📋 My trips"},
    "menu_profile": {"uz": "👤 Profil", "ru": "👤 Профиль", "en": "👤 Profile"},
    "menu_settings": {"uz": "⚙️ Sozlamalar", "ru": "⚙️ Настройки", "en": "⚙️ Settings"},
    "menu_admin": {"uz": "🛠 Admin panel", "ru": "🛠 Админ-панель", "en": "🛠 Admin panel"},
    "main_menu_hint": {
        "uz": "Kerakli bo'limni tanlang 👇",
        "ru": "Выберите нужный раздел 👇",
        "en": "Choose an option below 👇",
    },
    # Driver-only main menu (shown instead of the client menu once a driver is APPROVED)
    "driver_main_menu_hint": {
        "uz": "Haydovchi paneli — kerakli bo'limni tanlang 👇",
        "ru": "Панель водителя — выберите нужный раздел 👇",
        "en": "Driver panel — choose an option below 👇",
    },
    "menu_driver_profile": {"uz": "🚗 Mening profilim", "ru": "🚗 Мой профиль", "en": "🚗 My profile"},
    "menu_driver_open_orders": {"uz": "📥 Ochiq buyurtmalar", "ru": "📥 Открытые заказы", "en": "📥 Open orders"},
    "driver_profile_view": {
        "uz": (
            "🚗 Mening profilim\n\n"
            "👤 {name}\n"
            "📞 {phone}\n"
            "🚙 {car_brand} · {plate}\n"
            "📍 {route}\n"
            "Holati: {status}\n"
            "{subscription}"
        ),
        "ru": (
            "🚗 Мой профиль\n\n"
            "👤 {name}\n"
            "📞 {phone}\n"
            "🚙 {car_brand} · {plate}\n"
            "📍 {route}\n"
            "Статус: {status}\n"
            "{subscription}"
        ),
        "en": (
            "🚗 My profile\n\n"
            "👤 {name}\n"
            "📞 {phone}\n"
            "🚙 {car_brand} · {plate}\n"
            "📍 {route}\n"
            "Status: {status}\n"
            "{subscription}"
        ),
    },
    "driver_subscription_active": {
        "uz": "✅ Obuna faol — {days} kun qoldi (tugash sanasi: {expires})",
        "ru": "✅ Подписка активна — осталось {days} дн. (истекает: {expires})",
        "en": "✅ Subscription active — {days} day(s) left (expires: {expires})",
    },
    "driver_subscription_none": {
        "uz": "⏳ Obuna hali boshlanmagan — yopiq guruhga qo'shilishingiz kerak.",
        "ru": "⏳ Подписка ещё не началась — вам нужно вступить в закрытую группу.",
        "en": "⏳ Subscription hasn't started yet — you need to join the closed group.",
    },
    "driver_open_orders_empty": {
        "uz": "Hozircha sizning viloyatingizda ochiq buyurtmalar yo'q.",
        "ru": "Пока нет открытых заказов в вашей области.",
        "en": "No open orders in your region right now.",
    },
    "driver_edit_name": {"uz": "✏️ Ismni o'zgartirish", "ru": "✏️ Изменить имя", "en": "✏️ Change name"},
    "driver_edit_phone": {"uz": "📞 Telefonni o'zgartirish", "ru": "📞 Изменить телефон", "en": "📞 Change phone"},
    "driver_edit_car": {"uz": "🚙 Avtomobilni o'zgartirish", "ru": "🚙 Изменить автомобиль", "en": "🚙 Change car"},
    "driver_edit_plate": {
        "uz": "🔢 Davlat raqamini o'zgartirish",
        "ru": "🔢 Изменить гос. номер",
        "en": "🔢 Change plate number",
    },
    "driver_edit_region": {
        "uz": "📍 Ish viloyatini o'zgartirish",
        "ru": "📍 Изменить рабочую область",
        "en": "📍 Change work region",
    },
    "driver_edit_to_region": {
        "uz": "📍 Yo'nalishni o'zgartirish",
        "ru": "📍 Изменить направление",
        "en": "📍 Change destination region",
    },
    # Trip flow
    "confirm_phone": {
        "uz": "{phone} raqami orqali davom etasizmi?",
        "ru": "Продолжить с номером {phone}?",
        "en": "Continue with the number {phone}?",
    },
    "yes": {"uz": "✅ Ha", "ru": "✅ Да", "en": "✅ Yes"},
    "no": {"uz": "❌ Yo'q", "ru": "❌ Нет", "en": "❌ No"},
    "ask_new_phone": {
        "uz": "Yangi telefon raqamingizni kiriting:",
        "ru": "Введите новый номер телефона:",
        "en": "Enter your new phone number:",
    },
    "ask_location": {
        "uz": (
            "📍 Joylashuvingizni yuboring — pastdagi tugma orqali geolokatsiyani yoqing yoki "
            "manzilni forward/matn ko'rinishida yozing."
        ),
        "ru": (
            "📍 Отправьте геолокацию — включите её кнопкой ниже, либо перешлите/напишите "
            "адрес текстом."
        ),
        "en": (
            "📍 Send your location — enable geolocation with the button below, or forward/type "
            "the address as text."
        ),
    },
    "share_location_btn": {"uz": "📍 Joylashuvni yuborish", "ru": "📍 Отправить геолокацию", "en": "📍 Share location"},
    "location_received_ack": {"uz": "📍 Manzil qabul qilindi.", "ru": "📍 Местоположение получено.", "en": "📍 Location received."},
    "phone_received_ack": {"uz": "📱 Raqam qabul qilindi.", "ru": "📱 Номер получен.", "en": "📱 Number received."},
    "ask_from_region": {"uz": "Qayerdan ketmoqchisiz? Viloyatni tanlang:", "ru": "Откуда вы едете? Выберите область:", "en": "Where are you traveling from? Choose a region:"},
    "ask_from_district": {"uz": "{region} — tumanni tanlang:", "ru": "{region} — выберите район:", "en": "{region} — choose a district:"},
    "ask_to_region": {"uz": "Qayerga borasiz? Viloyatni tanlang:", "ru": "Куда вы едете? Выберите область:", "en": "Where are you traveling to? Choose a region:"},
    "ask_to_district": {"uz": "{region} — tumanni tanlang:", "ru": "{region} — выберите район:", "en": "{region} — choose a district:"},
    "ask_car_brand": {"uz": "Avtomobil rusumini tanlang:", "ru": "Выберите марку автомобиля:", "en": "Choose a car brand:"},
    "ask_seat": {"uz": "O'rindiqni tanlang:", "ru": "Выберите место:", "en": "Choose a seat:"},
    "seat_front": {"uz": "Old o'rindiq", "ru": "Переднее сиденье", "en": "Front seat"},
    "seat_any": {"uz": "Farqi yo'q", "ru": "Без разницы", "en": "Any seat"},
    "seat_rear_right": {"uz": "Orqa o'ng o'rindiq", "ru": "Заднее правое сиденье", "en": "Rear right seat"},
    "seat_rear_left": {"uz": "Orqa chap o'rindiq", "ru": "Заднее левое сиденье", "en": "Rear left seat"},
    "seat_rear_middle": {"uz": "Orqa o'rta o'rindiq", "ru": "Заднее среднее сиденье", "en": "Rear middle seat"},
    "ask_passengers": {"uz": "Nechta yo'lovchi?", "ru": "Сколько пассажиров?", "en": "How many passengers?"},
    "ask_luggage": {"uz": "Bagaj hajmi qanday?", "ru": "Какой размер багажа?", "en": "How big is the luggage?"},
    "luggage_small": {"uz": "Kichik", "ru": "Маленький", "en": "Small"},
    "luggage_medium": {"uz": "O'rta", "ru": "Средний", "en": "Medium"},
    "luggage_large": {"uz": "Katta", "ru": "Большой", "en": "Large"},
    "ask_time": {
        "uz": "Qachon jo'nmoqchisiz? \"Hozir\" tugmasini bosing yoki vaqtni yozing (masalan 18:30):",
        "ru": "Когда хотите выехать? Нажмите \"Сейчас\" или напишите время (например 18:30):",
        "en": "When do you want to leave? Tap \"Now\" or type a time (e.g. 18:30):",
    },
    "time_now": {"uz": "🕐 Hozir", "ru": "🕐 Сейчас", "en": "🕐 Now"},
    "order_summary": {
        "uz": (
            "📋 Buyurtma ma'lumotlari:\n\n"
            "👤 Yo'lovchi: {passenger_name} ({passenger_phone})\n"
            "📍 Qayerdan: {from_region}, {from_district}\n"
            "🏁 Qayerga: {to_region}, {to_district}\n"
            "🚗 Avtomobil: {car_brand}\n"
            "💺 O'rindiq: {seat}\n"
            "👥 Yo'lovchilar soni: {passengers}\n"
            "🧳 Bagaj: {luggage_size}\n"
            "🕐 Vaqt: {when_text}\n\n"
            "Buyurtmani tasdiqlaysizmi?"
        ),
        "ru": (
            "📋 Детали заказа:\n\n"
            "👤 Пассажир: {passenger_name} ({passenger_phone})\n"
            "📍 Откуда: {from_region}, {from_district}\n"
            "🏁 Куда: {to_region}, {to_district}\n"
            "🚗 Автомобиль: {car_brand}\n"
            "💺 Место: {seat}\n"
            "👥 Пассажиров: {passengers}\n"
            "🧳 Багаж: {luggage_size}\n"
            "🕐 Время: {when_text}\n\n"
            "Подтвердить заказ?"
        ),
        "en": (
            "📋 Order details:\n\n"
            "👤 Passenger: {passenger_name} ({passenger_phone})\n"
            "📍 From: {from_region}, {from_district}\n"
            "🏁 To: {to_region}, {to_district}\n"
            "🚗 Car: {car_brand}\n"
            "💺 Seat: {seat}\n"
            "👥 Passengers: {passengers}\n"
            "🧳 Luggage: {luggage_size}\n"
            "🕐 Time: {when_text}\n\n"
            "Confirm this order?"
        ),
    },
    "order_confirm_btn": {"uz": "✅ Tasdiqlash", "ru": "✅ Подтвердить", "en": "✅ Confirm"},
    "order_cancel_btn": {"uz": "❌ Bekor qilish", "ru": "❌ Отменить", "en": "❌ Cancel"},
    "order_edit_btn": {"uz": "✏️ Tahrirlash", "ru": "✏️ Изменить", "en": "✏️ Edit"},
    "ask_edit_field": {
        "uz": "Nimani o'zgartirmoqchisiz?",
        "ru": "Что вы хотите изменить?",
        "en": "What would you like to change?",
    },
    "edit_phone": {"uz": "📱 Telefon raqam", "ru": "📱 Номер телефона", "en": "📱 Phone number"},
    "edit_from": {"uz": "📍 Qayerdan", "ru": "📍 Откуда", "en": "📍 From"},
    "edit_to": {"uz": "🏁 Qayerga", "ru": "🏁 Куда", "en": "🏁 To"},
    "edit_car": {"uz": "🚗 Avtomobil", "ru": "🚗 Автомобиль", "en": "🚗 Car"},
    "edit_seat": {"uz": "💺 O'rindiq", "ru": "💺 Место", "en": "💺 Seat"},
    "edit_passengers": {"uz": "👥 Yo'lovchilar soni", "ru": "👥 Пассажиров", "en": "👥 Passengers"},
    "edit_luggage": {"uz": "🧳 Bagaj", "ru": "🧳 Багаж", "en": "🧳 Luggage"},
    "edit_time": {"uz": "🕐 Vaqt", "ru": "🕐 Время", "en": "🕐 Time"},
    "order_created": {
        "uz": "✅ Buyurtmangiz qabul qilindi! Haydovchilar tez orada siz bilan bog'lanishadi.",
        "ru": "✅ Ваш заказ принят! Водители скоро свяжутся с вами.",
        "en": "✅ Your order has been placed! Drivers will contact you shortly.",
    },
    "order_cancelled": {"uz": "Buyurtma bekor qilindi.", "ru": "Заказ отменён.", "en": "Order cancelled."},
    "no_group_for_region": {
        "uz": "Kechirasiz, hozircha bu viloyat uchun haydovchilar guruhi sozlanmagan. Admin tez orada bog'lanadi.",
        "ru": "Извините, для этой области пока не настроена группа водителей. Администратор скоро свяжется.",
        "en": "Sorry, no driver group is configured for this region yet. An admin will reach out shortly.",
    },
    # Inactivity nudge
    "inactivity_nudge_text": {
        "uz": "Safarni davom ettirasizmi?",
        "ru": "Хотите продолжить оформление поездки?",
        "en": "Would you like to continue placing your trip?",
    },
    "inactivity_nudge_voice": {
        "uz": (
            "Assalomu aleykum. TaxiLine Uzbekistan mijozlarga xizmat ko'rsatishdan mamnun. "
            "Safarlarni havfsiz va qulay bo'lishini ta'minlashga harakat qiladi. "
            "Safarni davom ettirasizmi?"
        ),
        "ru": (
            "Здравствуйте. TaxiLine Uzbekistan рад обслуживать вас. "
            "Мы стремимся сделать ваши поездки безопасными и комфортными. "
            "Хотите продолжить оформление поездки?"
        ),
        "en": (
            "Hello. TaxiLine Uzbekistan is glad to serve you. "
            "We work hard to keep every trip safe and comfortable. "
            "Would you like to continue placing your trip?"
        ),
    },
    "trip_continued": {"uz": "Davom etamiz 👍", "ru": "Продолжаем 👍", "en": "Let's continue 👍"},
    "trip_stopped": {
        "uz": "Yaxshi, buyurtma bekor qilindi. Istalgan vaqtda qaytadan boshlashingiz mumkin.",
        "ru": "Хорошо, заказ отменён. Вы можете начать заново в любое время.",
        "en": "Okay, the order was cancelled. You can start again any time.",
    },
    # Driver application
    "driver_intro": {
        "uz": "Haydovchi sifatida ro'yxatdan o'tish uchun ma'lumotlaringizni kiritamiz.",
        "ru": "Для регистрации в качестве водителя укажите свои данные.",
        "en": "Let's collect your details to register you as a driver.",
    },
    "ask_driver_name": {"uz": "Ism familyangizni kiriting:", "ru": "Введите ваше имя и фамилию:", "en": "Enter your full name:"},
    "ask_driver_phone": {"uz": "Telefon raqamingizni yuboring:", "ru": "Отправьте номер телефона:", "en": "Send your phone number:"},
    "ask_driver_car": {"uz": "Avtomobil rusumini tanlang:", "ru": "Выберите марку автомобиля:", "en": "Choose your car brand:"},
    "ask_driver_plate": {
        "uz": "Avtomobil davlat raqamini kiriting (masalan: 60E091GB — probel qo'ysangiz ham, kichik harf bilan yozsangiz ham bo'ladi):",
        "ru": "Введите гос. номер автомобиля (например: 60E091GB — можно с пробелами и строчными буквами):",
        "en": "Enter the car's plate number (e.g. 60E091GB — spaces and lowercase letters are fine):",
    },
    "ask_driver_region": {"uz": "Qaysi viloyatdan ishlaysiz?", "ru": "Из какой области вы работаете?", "en": "Which region do you drive from?"},
    "ask_driver_to_region": {"uz": "Odatda qayerga olib borasiz?", "ru": "Куда вы обычно возите пассажиров?", "en": "Where do you usually drive to?"},
    "driver_application_summary": {
        "uz": (
            "📋 Ariza ma'lumotlari:\n\n"
            "👤 Ism: {full_name}\n"
            "📱 Telefon: {phone}\n"
            "🚙 Avtomobil: {car_model} · {plate}\n"
            "📍 Yo'nalish: {region} → {to_region}\n\n"
            "Arizani yuborasizmi?"
        ),
        "ru": (
            "📋 Данные заявки:\n\n"
            "👤 Имя: {full_name}\n"
            "📱 Телефон: {phone}\n"
            "🚙 Автомобиль: {car_model} · {plate}\n"
            "📍 Маршрут: {region} → {to_region}\n\n"
            "Отправить заявку?"
        ),
        "en": (
            "📋 Application details:\n\n"
            "👤 Name: {full_name}\n"
            "📱 Phone: {phone}\n"
            "🚙 Car: {car_model} · {plate}\n"
            "📍 Route: {region} → {to_region}\n\n"
            "Send the application?"
        ),
    },
    "driver_application_submit_btn": {"uz": "✅ Yuborish", "ru": "✅ Отправить", "en": "✅ Submit"},
    "driver_application_cancelled": {"uz": "Ariza bekor qilindi.", "ru": "Заявка отменена.", "en": "Application cancelled."},
    "driver_application_sent": {
        "uz": "✅ Arizangiz qabul qilindi va admin ko'rib chiqishi uchun yuborildi.",
        "ru": "✅ Ваша заявка принята и отправлена на рассмотрение администратору.",
        "en": "✅ Your application has been submitted for admin review.",
    },
    "driver_already_pending": {
        "uz": "Sizning arizangiz allaqachon ko'rib chiqilmoqda.",
        "ru": "Ваша заявка уже находится на рассмотрении.",
        "en": "Your application is already pending review.",
    },
    "driver_already_approved": {
        "uz": "Siz allaqachon haydovchi sifatida tasdiqlangansiz.",
        "ru": "Вы уже подтверждены как водитель.",
        "en": "You are already an approved driver.",
    },
    "driver_approved_dm": {
        "uz": "🎉 Tabriklaymiz! Haydovchi sifatida tasdiqlandingiz.",
        "ru": "🎉 Поздравляем! Вы подтверждены как водитель.",
        "en": "🎉 Congratulations! You are approved as a driver.",
    },
    "driver_group_invite_message": {
        "uz": (
            "Buyurtmalarni olishni boshlash uchun quyidagi havola orqali yopiq guruhga qo'shiling — "
            "obunangiz aynan shu guruhga qo'shilgan kuningizdan boshlanadi:\n\n{link}"
        ),
        "ru": (
            "Чтобы начать получать заказы, присоединитесь к закрытой группе по этой ссылке — "
            "ваша подписка начнётся именно со дня вступления в группу:\n\n{link}"
        ),
        "en": (
            "To start receiving orders, join the closed group via this link — your subscription "
            "starts on the day you actually join:\n\n{link}"
        ),
    },
    "driver_group_invite_missing": {
        "uz": "Sizning viloyatingiz uchun hali yopiq guruh sozlanmagan. Admin tez orada bog'lanadi.",
        "ru": "Для вашей области ещё не настроена закрытая группа. Администратор скоро свяжется.",
        "en": "No closed group is configured for your region yet. An admin will reach out shortly.",
    },
    "driver_rejected_dm": {
        "uz": "Afsuski, arizangiz rad etildi. Sabab: {reason}",
        "ru": "К сожалению, ваша заявка отклонена. Причина: {reason}",
        "en": "Unfortunately your application was rejected. Reason: {reason}",
    },
    "driver_subscription_expiring": {
        "uz": "⚠️ {days} kundan so'ng obunangiz tugaydi. Qayta obuna bo'lish uchun Adminga murojaat qiling.",
        "ru": "⚠️ Через {days} дн. ваша подписка закончится. Чтобы продлить, обратитесь к администратору.",
        "en": "⚠️ Your subscription ends in {days} day(s). To renew it, contact the Admin.",
    },
    "driver_subscription_expired": {
        "uz": "❌ Obunangiz tugadi. Qayta obuna bo'lmoqchi bo'lsangiz adminga murojaat qiling.",
        "ru": "❌ Ваша подписка истекла. Чтобы продлить, обратитесь к администратору.",
        "en": "❌ Your subscription has expired. Contact the admin to renew it.",
    },
    # Profile / settings
    "profile_text": {
        "uz": (
            "👤 Profil\n\n"
            "Ism: {name}\n"
            "Username: {username}\n"
            "Telefon: {phone}\n"
            "Manzil: {address}\n"
            "Safarlar soni: {trips_count}\n"
            "ID: {id}"
        ),
        "ru": (
            "👤 Профиль\n\n"
            "Имя: {name}\n"
            "Username: {username}\n"
            "Телефон: {phone}\n"
            "Адрес: {address}\n"
            "Количество поездок: {trips_count}\n"
            "ID: {id}"
        ),
        "en": (
            "👤 Profile\n\n"
            "Name: {name}\n"
            "Username: {username}\n"
            "Phone: {phone}\n"
            "Address: {address}\n"
            "Trips: {trips_count}\n"
            "ID: {id}"
        ),
    },
    "not_set": {"uz": "kiritilmagan", "ru": "не указано", "en": "not set"},
    "settings_menu": {
        "uz": "⚙️ Sozlamalar — nimani o'zgartirmoqchisiz?",
        "ru": "⚙️ Настройки — что вы хотите изменить?",
        "en": "⚙️ Settings — what would you like to change?",
    },
    "settings_change_name": {"uz": "✏️ Ismni o'zgartirish", "ru": "✏️ Изменить имя", "en": "✏️ Change name"},
    "settings_change_phone": {"uz": "📱 Raqamni o'zgartirish", "ru": "📱 Изменить номер", "en": "📱 Change phone"},
    "settings_change_address": {"uz": "🏠 Manzilni o'zgartirish", "ru": "🏠 Изменить адрес", "en": "🏠 Change address"},
    "settings_change_language": {"uz": "🌐 Tilni o'zgartirish", "ru": "🌐 Изменить язык", "en": "🌐 Change language"},
    "settings_logout": {"uz": "🚪 Chiqib ketish", "ru": "🚪 Выйти", "en": "🚪 Log out"},
    "profile_edit_hint": {
        "uz": "Profilni tahrirlash uchun pastdagi tugmalardan birini tanlang 👇",
        "ru": "Чтобы отредактировать профиль, выберите одну из кнопок ниже 👇",
        "en": "To edit your profile, choose one of the buttons below 👇",
    },
    "ask_new_name": {"uz": "Yangi ismingizni kiriting:", "ru": "Введите новое имя:", "en": "Enter your new name:"},
    "ask_new_address": {"uz": "Yangi manzilingizni kiriting:", "ru": "Введите новый адрес:", "en": "Enter your new address:"},
    "saved_ok": {"uz": "Saqlandi ✅", "ru": "Сохранено ✅", "en": "Saved ✅"},
    "logged_out": {
        "uz": "Chiqib ketdingiz. Qayta kirish uchun /start bosing.",
        "ru": "Вы вышли из системы. Нажмите /start чтобы войти снова.",
        "en": "You have been logged out. Press /start to log in again.",
    },
    "login_or_register": {"uz": "Kirish", "ru": "Войти", "en": "Log in"},
    "register_btn": {"uz": "Ro'yxatdan o'tish", "ru": "Регистрация", "en": "Register"},
    "ask_login_phone": {
        "uz": "Ro'yxatdan o'tgan telefon raqamingizni kiriting:",
        "ru": "Введите номер телефона, указанный при регистрации:",
        "en": "Enter the phone number you registered with:",
    },
    "post_logout_prompt": {
        "uz": "Davom etish uchun tanlang:",
        "ru": "Выберите, чтобы продолжить:",
        "en": "Choose an option to continue:",
    },
    "not_found_register_prompt": {
        "uz": "Siz ro'yxatdan o'tmagansiz. Ro'yxatdan o'tishni xohlaysizmi?",
        "ru": "Вы не зарегистрированы. Хотите зарегистрироваться?",
        "en": "You are not registered. Would you like to register?",
    },
    # Support / complaints
    "support_menu": {"uz": "🆘 Yordam kerakmi?", "ru": "🆘 Нужна помощь?", "en": "🆘 Need help?"},
    "support_write_btn": {"uz": "✍️ Support'ga yozish", "ru": "✍️ Написать в поддержку", "en": "✍️ Write to support"},
    "complaint_btn": {"uz": "⚠️ Shikoyat yuborish", "ru": "⚠️ Отправить жалобу", "en": "⚠️ Submit a complaint"},
    "ask_support_message": {
        "uz": "Xabaringizni yozing, biz tez orada javob beramiz:",
        "ru": "Напишите ваше сообщение, мы скоро ответим:",
        "en": "Write your message, we'll reply soon:",
    },
    "support_message_sent": {
        "uz": "✅ Xabaringiz yuborildi. Tez orada javob beramiz.",
        "ru": "✅ Ваше сообщение отправлено. Скоро ответим.",
        "en": "✅ Your message was sent. We'll reply soon.",
    },
    "support_admin_reply": {
        "uz": "💬 Support javobi:\n\n{text}",
        "ru": "💬 Ответ поддержки:\n\n{text}",
        "en": "💬 Support reply:\n\n{text}",
    },
    "ask_complaint_text": {
        "uz": "Shikoyatingizni batafsil yozing:",
        "ru": "Опишите вашу жалобу подробно:",
        "en": "Describe your complaint in detail:",
    },
    "complaint_sent": {
        "uz": "✅ Shikoyatingiz qabul qilindi. Holati haqida sizga xabar beramiz.",
        "ru": "✅ Ваша жалоба принята. Мы сообщим вам о её статусе.",
        "en": "✅ Your complaint has been received. We'll update you on its status.",
    },
    "complaint_status_update": {
        "uz": "📢 Shikoyatingiz holati yangilandi: {status}\n\n{reply}",
        "ru": "📢 Статус вашей жалобы обновлён: {status}\n\n{reply}",
        "en": "📢 Your complaint status was updated: {status}\n\n{reply}",
    },
    # My trips
    "my_trips_empty": {
        "uz": "Sizda hali safarlar mavjud emas.",
        "ru": "У вас пока нет поездок.",
        "en": "You don't have any trips yet.",
    },
    "my_trips_item": {
        "uz": "🚕 #{id} — {from_region} → {to_region}\n{status} · {created_at}",
        "ru": "🚕 #{id} — {from_region} → {to_region}\n{status} · {created_at}",
        "en": "🚕 #{id} — {from_region} → {to_region}\n{status} · {created_at}",
    },
    "blocked_message": {
        "uz": "Kechirasiz, sizning hisobingiz bloklangan. Savollar bo'lsa admin bilan bog'laning.",
        "ru": "Извините, ваш аккаунт заблокирован. По вопросам обращайтесь к администратору.",
        "en": "Sorry, your account has been blocked. Contact an admin with any questions.",
    },
    "mandatory_sub_text": {
        "uz": "Botdan foydalanish uchun quyidagi kanal/guruhlarga obuna bo'ling, so'ng \"✅ Obuna bo'ldim\" tugmasini bosing:",
        "ru": "Чтобы пользоваться ботом, подпишитесь на каналы/группы ниже, затем нажмите \"✅ Я подписался\":",
        "en": "To use the bot, subscribe to the channels/groups below, then tap \"✅ I subscribed\":",
    },
    "mandatory_sub_check_btn": {"uz": "✅ Obuna bo'ldim", "ru": "✅ Я подписался", "en": "✅ I subscribed"},
    "mandatory_sub_ok": {
        "uz": "Muvaffaqiyatli obuna bo'ldingiz! Botdan foydalanishingiz mumkin.",
        "ru": "Вы успешно подписались! Можете пользоваться ботом.",
        "en": "You've successfully subscribed! You can now use the bot.",
    },
    "mandatory_sub_missing": {
        "uz": "Hali barcha kanal/guruhlarga obuna bo'lmadingiz. Iltimos tekshirib qayta urinib ko'ring.",
        "ru": "Вы ещё не подписаны на все каналы/группы. Пожалуйста, проверьте и попробуйте снова.",
        "en": "You haven't subscribed to everything yet. Please check and try again.",
    },
    "order_status_new": {"uz": "🟢 Yangi", "ru": "🟢 Новый", "en": "🟢 New"},
    "order_status_fresh": {"uz": "🟡 {mins} daqiqa oldin", "ru": "🟡 {mins} мин назад", "en": "🟡 {mins} min ago"},
    "order_status_stale": {"uz": "🔴 Eskirgan", "ru": "🔴 Устарел", "en": "🔴 Stale"},
    "order_source_bot": {"uz": "Telegram Bot orqali", "ru": "Через Telegram-бота", "en": "Via Telegram Bot"},
    "order_source_webapp": {"uz": "WebApp orqali", "ru": "Через WebApp", "en": "Via WebApp"},
    "order_source_group": {"uz": "Guruh orqali", "ru": "Через группу", "en": "Via Group"},
    "dispatch_card": {
        "uz": (
            "{status_label}\n\n"
            "🚕 Yangi buyurtma ({source})\n\n"
            "👤 {passenger_name} — {passenger_phone}\n"
            "📍 {from_place} → {to_place}\n"
            "🚗 {car_brand} · 💺 {seat}\n"
            "👥 {passengers} yo'lovchi · 🧳 {luggage_size}\n"
            "🕐 {when_text}\n"
            "{pickup_line}"
            "{contact_note_line}"
        ),
        "ru": (
            "{status_label}\n\n"
            "🚕 Новый заказ ({source})\n\n"
            "👤 {passenger_name} — {passenger_phone}\n"
            "📍 {from_place} → {to_place}\n"
            "🚗 {car_brand} · 💺 {seat}\n"
            "👥 {passengers} пассажир(ов) · 🧳 {luggage_size}\n"
            "🕐 {when_text}\n"
            "{pickup_line}"
            "{contact_note_line}"
        ),
        "en": (
            "{status_label}\n\n"
            "🚕 New order ({source})\n\n"
            "👤 {passenger_name} — {passenger_phone}\n"
            "📍 {from_place} → {to_place}\n"
            "🚗 {car_brand} · 💺 {seat}\n"
            "👥 {passengers} passenger(s) · 🧳 {luggage_size}\n"
            "🕐 {when_text}\n"
            "{pickup_line}"
            "{contact_note_line}"
        ),
    },
    "dispatch_voice_summary": {
        "uz": "Yangi buyurtma. {from_region} dan {to_region} ga. {passengers} yo'lovchi. Vaqti: {when_text}.",
        "ru": "Новый заказ. Из {from_region} в {to_region}. {passengers} пассажир(ов). Время: {when_text}.",
        "en": "New order. From {from_region} to {to_region}. {passengers} passenger(s). Time: {when_text}.",
    },
    "pickup_map_line": {
        "uz": "📌 Aniq joylashuv: {link}\n",
        "ru": "📌 Точное местоположение: {link}\n",
        "en": "📌 Exact location: {link}\n",
    },
    # Claim / accept flow
    "order_claim_btn": {"uz": "✅ Qabul qildim", "ru": "✅ Принимаю", "en": "✅ I'll take it"},
    "order_location_btn": {"uz": "📍 Manzil", "ru": "📍 Адрес", "en": "📍 Location"},
    "order_location_text_only": {
        "uz": "📌 Mijoz yozgan manzil: {text}",
        "ru": "📌 Адрес от клиента: {text}",
        "en": "📌 Address the client wrote: {text}",
    },
    "order_claim_lost": {
        "uz": "Kechirasiz, bu buyurtmani boshqa haydovchi allaqachon qabul qildi.",
        "ru": "Извините, этот заказ уже принял другой водитель.",
        "en": "Sorry, another driver already accepted this order.",
    },
    "order_taken_label": {
        "uz": "🔒 Band qilindi (boshqa haydovchi tomonidan)",
        "ru": "🔒 Занято (другим водителем)",
        "en": "🔒 Taken (by another driver)",
    },
    "order_closed_by_admin_label": {
        "uz": "⛔️ Administrator tomonidan yopildi",
        "ru": "⛔️ Закрыто администратором",
        "en": "⛔️ Closed by administrator",
    },
    "order_cancelled_by_admin_label": {
        "uz": "❌ Administrator tomonidan bekor qilindi",
        "ru": "❌ Отменено администратором",
        "en": "❌ Cancelled by administrator",
    },
    "order_claimed_self": {
        "uz": "✅ Siz ushbu buyurtmani qabul qildingiz. Yo'lga chiqqaningizda pastdagi tugmani bosing:",
        "ru": "✅ Вы приняли этот заказ. Когда выедете, нажмите кнопку ниже:",
        "en": "✅ You accepted this order. Tap the button below once you're on the way:",
    },
    "order_enroute_btn": {"uz": "🚗 Yo'ldaman", "ru": "🚗 Уже еду", "en": "🚗 On my way"},
    "order_enroute_confirmed": {
        "uz": "👍 Rahmat, mijozga xabar berildi.",
        "ru": "👍 Спасибо, клиент уведомлён.",
        "en": "👍 Thanks, the client has been notified.",
    },
    "driver_found_for_client": {
        "uz": (
            "✅ Haydovchi topildi!\n\n"
            "👤 {name}\n"
            "🚗 {car_brand} · {plate}\n"
            "📞 {phone}\n\n"
            "Agar haydovchi ko'p kutdirsa, shu raqamga qo'ng'iroq qilishingiz mumkin."
        ),
        "ru": (
            "✅ Водитель найден!\n\n"
            "👤 {name}\n"
            "🚗 {car_brand} · {plate}\n"
            "📞 {phone}\n\n"
            "Если водитель долго не приезжает, вы можете позвонить по этому номеру."
        ),
        "en": (
            "✅ Driver found!\n\n"
            "👤 {name}\n"
            "🚗 {car_brand} · {plate}\n"
            "📞 {phone}\n\n"
            "If the driver takes too long, you can call this number directly."
        ),
    },
    "driver_enroute_notify_client": {
        "uz": "🚗 Haydovchingiz yo'lga chiqdi.",
        "ru": "🚗 Ваш водитель выехал.",
        "en": "🚗 Your driver is on the way.",
    },
    "order_reclaim_search": {
        "uz": "⏳ Avvalgi haydovchi javob bermadi, boshqa haydovchi qidiryapmiz...",
        "ru": "⏳ Предыдущий водитель не ответил, ищем другого водителя...",
        "en": "⏳ The previous driver didn't respond, we're searching for another one...",
    },
    "order_cancel_claim_btn": {"uz": "❌ Bekor qilish", "ru": "❌ Отменить", "en": "❌ Cancel"},
    "order_claim_cancelled_self": {
        "uz": "❌ Buyurtmani bekor qildingiz. Boshqa haydovchi qidirilmoqda.",
        "ru": "❌ Вы отменили заказ. Ищем другого водителя.",
        "en": "❌ You cancelled the order. Searching for another driver.",
    },
    "order_cancelled_by_driver_notify_client": {
        "uz": "⚠️ Haydovchi buyurtmani bekor qildi. Boshqa haydovchi qidiryapmiz...",
        "ru": "⚠️ Водитель отменил заказ. Ищем другого водителя...",
        "en": "⚠️ The driver cancelled the order. Searching for another driver...",
    },
    "order_complete_btn": {"uz": "✅ Safarni yakunlash", "ru": "✅ Завершить поездку", "en": "✅ Finish trip"},
    "order_completed_confirmed": {
        "uz": "🎉 Safar yakunlandi. Rahmat!",
        "ru": "🎉 Поездка завершена. Спасибо!",
        "en": "🎉 Trip completed. Thank you!",
    },
    "trip_completed_notify_client": {
        "uz": "🎉 Safaringiz yakunlandi. TaxiLine'dan foydalanganingiz uchun rahmat!\n\nHaydovchini baholang:",
        "ru": "🎉 Ваша поездка завершена. Спасибо, что воспользовались TaxiLine!\n\nОцените водителя:",
        "en": "🎉 Your trip has been completed. Thank you for using TaxiLine!\n\nRate your driver:",
    },
    "trip_completed_rate_passenger_prompt": {
        "uz": "🎉 Safar yakunlandi. Yo'lovchini baholang:",
        "ru": "🎉 Поездка завершена. Оцените пассажира:",
        "en": "🎉 Trip completed. Rate your passenger:",
    },
    "rating_thanks": {
        "uz": "✅ Bahoyingiz uchun rahmat!",
        "ru": "✅ Спасибо за вашу оценку!",
        "en": "✅ Thanks for your rating!",
    },
    "rating_failed": {
        "uz": "⚠️ Bahoni saqlab bo'lmadi, birozdan so'ng qayta urinib ko'ring.",
        "ru": "⚠️ Не удалось сохранить оценку, попробуйте позже.",
        "en": "⚠️ Couldn't save the rating, please try again shortly.",
    },
    # Webapp booking bridge (server/ -> taxiline-bot instant DM)
    "webapp_booking_new": {
        "uz": (
            "🚕 Yangi bron (TaxiLine ilovasi)\n\n"
            "👤 {rider_name} — {rider_phone}\n"
            "📍 {from_label} → {to_label}\n"
            "🕐 {depart_at}\n"
            "🪑 {seats_summary}\n\n"
            "Ilovada ko'rib, tasdiqlang yoki rad eting."
        ),
        "ru": (
            "🚕 Новая бронь (приложение TaxiLine)\n\n"
            "👤 {rider_name} — {rider_phone}\n"
            "📍 {from_label} → {to_label}\n"
            "🕐 {depart_at}\n"
            "🪑 {seats_summary}\n\n"
            "Откройте приложение, чтобы принять или отклонить."
        ),
        "en": (
            "🚕 New booking (TaxiLine app)\n\n"
            "👤 {rider_name} — {rider_phone}\n"
            "📍 {from_label} → {to_label}\n"
            "🕐 {depart_at}\n"
            "🪑 {seats_summary}\n\n"
            "Open the app to accept or reject it."
        ),
    },
    "webapp_offer_posted": {
        "uz": (
            "🆕 Yangi elon (TaxiLine ilovasi)\n\n"
            "🚗 {driver_name} — {driver_phone}\n"
            "🚘 {car_model} · {plate}\n"
            "📍 {from_label} → {to_label}\n"
            "🕐 {depart_at}\n"
            "🪑 {seats_total} o'rindiq · 💵 {price} so'm/joy"
        ),
        "ru": (
            "🆕 Новое объявление (приложение TaxiLine)\n\n"
            "🚗 {driver_name} — {driver_phone}\n"
            "🚘 {car_model} · {plate}\n"
            "📍 {from_label} → {to_label}\n"
            "🕐 {depart_at}\n"
            "🪑 {seats_total} мест · 💵 {price} сум/место"
        ),
        "en": (
            "🆕 New listing (TaxiLine app)\n\n"
            "🚗 {driver_name} — {driver_phone}\n"
            "🚘 {car_model} · {plate}\n"
            "📍 {from_label} → {to_label}\n"
            "🕐 {depart_at}\n"
            "🪑 {seats_total} seats · 💵 {price} so'm/seat"
        ),
    },
    "webapp_cargo_posted": {
        "uz": (
            "📦 Yangi yuk (TaxiLine ilovasi)\n\n"
            "🏷 {cargo_type} · {weight_label}\n"
            "📍 {from_label} → {to_label}\n"
            "👤 Qabul qiluvchi: {recipient_name} — {recipient_phone}\n"
            "💵 {price} so'm"
        ),
        "ru": (
            "📦 Новая посылка (приложение TaxiLine)\n\n"
            "🏷 {cargo_type} · {weight_label}\n"
            "📍 {from_label} → {to_label}\n"
            "👤 Получатель: {recipient_name} — {recipient_phone}\n"
            "💵 {price} сум"
        ),
        "en": (
            "📦 New parcel (TaxiLine app)\n\n"
            "🏷 {cargo_type} · {weight_label}\n"
            "📍 {from_label} → {to_label}\n"
            "👤 Recipient: {recipient_name} — {recipient_phone}\n"
            "💵 {price} so'm"
        ),
    },
    "webapp_booking_pending_reminder": {
        "uz": (
            "⏳ Eslatma: {rider_name} ({rider_phone}) sizning {from_label} → {to_label} "
            "reysingizga bron qilgan, lekin siz hali javob bermadingiz. Iltimos ilovada tez "
            "orada tasdiqlang yoki rad eting — mijoz kutmoqda."
        ),
        "ru": (
            "⏳ Напоминание: {rider_name} ({rider_phone}) забронировал место на вашем рейсе "
            "{from_label} → {to_label}, но вы ещё не ответили. Пожалуйста, примите или "
            "отклоните бронь в приложении — клиент ждёт."
        ),
        "en": (
            "⏳ Reminder: {rider_name} ({rider_phone}) booked a seat on your {from_label} → "
            "{to_label} ride, but you haven't responded yet. Please accept or reject it in the "
            "app — the rider is waiting."
        ),
    },
    "webapp_booking_start_reminder": {
        "uz": (
            "⏳ Eslatma: {from_label} → {to_label} safaringiz vaqti keldi, lekin siz hali "
            "\"Safarni boshlash\"ni bosmadingiz. {rider_name} ({rider_phone}) sizni kutmoqda."
        ),
        "ru": (
            "⏳ Напоминание: время вашей поездки {from_label} → {to_label} наступило, но вы "
            "ещё не нажали \"Начать поездку\". {rider_name} ({rider_phone}) ждёт вас."
        ),
        "en": (
            "⏳ Reminder: it's time for your {from_label} → {to_label} ride, but you haven't "
            "tapped \"Start trip\" yet. {rider_name} ({rider_phone}) is waiting for you."
        ),
    },
    # Webapp OTP login via Telegram
    "otp_code_message": {
        "uz": (
            "🔐 TaxiLine tizimiga kirish uchun tasdiqlash kodingiz: {code}\n\n"
            "Kodni kompyuteringizdagi sahifaga kiriting, yoki pastdagi tugmani bosib avtomatik kiring:"
        ),
        "ru": (
            "🔐 Код подтверждения для входа в TaxiLine: {code}\n\n"
            "Введите код на странице входа, либо нажмите кнопку ниже, чтобы войти автоматически:"
        ),
        "en": (
            "🔐 Your TaxiLine sign-in code: {code}\n\n"
            "Type it on the login page, or tap the button below to sign in automatically:"
        ),
    },
    "otp_confirm_btn": {"uz": "✅ Tasdiqlash va kirish", "ru": "✅ Подтвердить и войти", "en": "✅ Confirm and sign in"},
    "otp_confirmed": {
        "uz": "✅ Tasdiqlandingiz — endi kompyuteringizdagi sahifa avtomatik kirishi kerak.",
        "ru": "✅ Подтверждено — страница на вашем компьютере должна войти автоматически.",
        "en": "✅ Confirmed — the page on your computer should sign in automatically now.",
    },
    "otp_confirm_failed": {
        "uz": "⚠️ Kod eskirgan yoki allaqachon ishlatilgan. Sahifada qaytadan kod so'rang.",
        "ru": "⚠️ Код устарел или уже использован. Запросите новый код на странице входа.",
        "en": "⚠️ The code expired or was already used. Request a new one on the login page.",
    },
    "service_unavailable": {
        "uz": "⚠️ Xizmat vaqtincha ishlamayapti. Birozdan so'ng qayta urinib ko'ring.",
        "ru": "⚠️ Сервис временно недоступен. Попробуйте ещё раз чуть позже.",
        "en": "⚠️ The service is temporarily unavailable. Please try again shortly.",
    },
    "back": {"uz": "⬅️ Orqaga", "ru": "⬅️ Назад", "en": "⬅️ Back"},
    "cancel": {"uz": "Bekor qilish", "ru": "Отмена", "en": "Cancel"},
}


def t(key: str, lang: str | None, **kwargs) -> str:
    entry = TRANSLATIONS.get(key)
    if not entry:
        return key
    template = entry.get(lang or "uz") or entry.get("uz") or next(iter(entry.values()))
    return template.format(**kwargs) if kwargs else template
