// "Shaxsiy ma’lumotlarni qayta ishlashga rozilik" — the text an applicant must read to the end
// and accept before the "Haydovchi bo‘ling" form can be sent. Change the wording → bump
// CONSENT_VERSION: it is stored with every application, so we know which text a person agreed to.
export const CONSENT_VERSION = '2026-10-13'

export const CONSENT_INTRO =
  'Ushbu rozilik TaxiLine (taxiline.uz) platformasiga haydovchi sifatida ariza yuborayotgan shaxs tomonidan beriladi. “Qabul qilaman” tugmasini bosish orqali quyidagi shartlarga roziligingizni bildirasiz.'

export const CONSENT_SECTIONS = [
  {
    title: '1. Qanday ma’lumotlar yig‘iladi',
    text: 'Ism-familiyangiz, telefon raqamingiz, shahringiz va faoliyat turingiz; shuningdek siz yuklagan hujjatlar: pasport yoki ID-karta, haydovchilik guvohnomasi, avtomobil hujjatlari va avtomobil ma’lumotlari.',
  },
  {
    title: '2. Ma’lumotlar nima uchun kerak',
    text: 'Ma’lumotlar faqat arizangizni ko‘rib chiqish, shaxsingiz va avtomobilingizni tekshirish, siz bilan bog‘lanish hamda platformada haydovchi hisobini ochish uchun ishlatiladi.',
  },
  {
    title: '3. Qayerda va qanday saqlanadi',
    text: 'Ma’lumotlar va fayllar TaxiLine serverlarida saqlanadi. Hujjatlar ochiq havola orqali ko‘rinmaydi — ularni faqat arizalarni ko‘rib chiquvchi vakolatli xodimlar ko‘ra oladi.',
  },
  {
    title: '4. Uchinchi shaxslarga berilishi',
    text: 'Ma’lumotlaringiz sotilmaydi va reklama maqsadida hech kimga berilmaydi. Ular faqat qonunda belgilangan hollarda vakolatli davlat organlariga taqdim etilishi mumkin.',
  },
  {
    title: '5. Saqlash muddati',
    text: 'Ma’lumotlar arizangiz ko‘rib chiqilayotgan va platformada ishlayotgan davringizda saqlanadi. Arizani qaytarib olsangiz yoki roziligingizni bekor qilsangiz, so‘rovingiz bo‘yicha ma’lumotlar va fayllar o‘chiriladi.',
  },
  {
    title: '6. Sizning huquqlaringiz',
    text: 'Istalgan vaqtda ma’lumotlaringizni ko‘rish, tuzatish yoki o‘chirishni so‘rashingiz hamda roziligingizni bekor qilishingiz mumkin. Buning uchun +998 87 735 36 36 raqamiga yoki Telegram’dagi @taxilines_bot ga murojaat qiling.',
  },
  {
    title: '7. Qo‘shimcha ma’lumot',
    text: 'Ma’lumotlar bilan ishlash tartibi to‘liq holda Maxfiylik siyosatida (taxiline.uz/privacy) keltirilgan.',
  },
]
