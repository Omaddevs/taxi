export const services = [
  {
    id: 'standart',
    title: 'Standart Taxi',
    desc: 'Qulay kundalik safarlar',
    icon: 'car',
    from: 180000,
  },
  {
    id: 'women',
    title: 'Ayollar uchun',
    desc: 'Avval ayol haydovchilarga',
    icon: 'heart',
    from: 200000,
  },
  {
    id: 'family',
    title: 'Oilaviy Taxi',
    desc: 'Katta oila uchun joy',
    icon: 'users',
    from: 280000,
  },
  {
    id: 'minivan',
    title: 'Minivan',
    desc: '6–8 yo‘lovchi sig‘imi',
    icon: 'bus',
    from: 320000,
  },
  {
    id: 'cargo',
    title: 'Yuk jo‘natish',
    desc: 'Tez va xavfsiz yetkazish',
    icon: 'package',
    from: 45000,
  },
  {
    id: 'premium',
    title: 'Premium',
    desc: 'Biznes klass avtomobillar',
    icon: 'sparkles',
    from: 450000,
  },
]

export const faqs = [
  { q: 'Safarni qanday bekor qilaman?', a: 'Safar tafsilotlari sahifasida “Bekor qilish” tugmasini bosing. 30 daqiqadan oldin bekor qilish bepul.' },
  { q: 'To‘lov qanday amalga oshiriladi?', a: 'Naqd, UzCard, Humo, Click, Payme yoki Uzum Bank orqali to‘lashingiz mumkin.' },
  { q: 'Ayollar uchun taksi xavfsizmi?', a: 'Ha. Buyurtma avval tasdiqlangan ayol haydovchilarga yuboriladi, safar davomida GPS kuzatuv va SOS tugmasi ishlaydi.' },
  { q: 'Yuk qancha vaqtda yetib boradi?', a: 'Shahardan shaharga odatda 4–8 soat. Og‘irlik va yo‘nalishga qarab aniq vaqt ko‘rsatiladi.' },
  { q: 'Haydovchi bo‘lish uchun nima kerak?', a: 'Passport, haydovchilik guvohnomasi, mashina hujjatlari va toza jinoiy tarix talab qilinadi.' },
]

export const cargoTypes = [
  { id: 'parcel', title: 'Buyum', hint: 'Kichik yuklar', emoji: '📦', image: '/cargo/parcel.webp', icon: 'box' },
  { id: 'shopping', title: 'Xarid', hint: 'Do‘kon, market', emoji: '🛍️', image: '/cargo/shopping.webp', icon: 'bag' },
  { id: 'docs', title: 'Hujjat', hint: 'Tezkor yetkazish', emoji: '📄', image: '/cargo/docs.webp', icon: 'file' },
  { id: 'flowers', title: 'Gul', hint: 'Sovg‘alar', emoji: '💐', image: '/cargo/flowers.png', icon: 'flower' },
  { id: 'tech', title: 'Texnika', hint: 'Telefon, noutbuk', emoji: '💻', image: '/cargo/tech.webp', icon: 'smartphone' },
  { id: 'food', title: 'Oziq-ovqat', hint: 'Taom, mahsulot', emoji: '🍱', image: '/cargo/food.webp', icon: 'utensils' },
  { id: 'clothes', title: 'Kiyim', hint: 'Kiyim-kechak', emoji: '👕', image: '/cargo/clothes.webp', icon: 'shirt' },
  { id: 'other', title: 'Boshqa', hint: 'Har qanday yuk', emoji: '🧳', image: '/cargo/other.png', icon: 'box' },
]

// ids must stay in sync with server/src/modules/cargo/cargo.schema.ts's cargoVehicleSchema.
export const cargoVehicles = [
  { id: 'moto', title: 'Moto', hint: 'Tez va arzon', emoji: '🛵', image: '/cargo/moto.webp' },
  { id: 'car', title: 'Avto', hint: 'Katta va og‘ir yuklar', emoji: '🚗', image: '/cargo/car.webp' },
  { id: 'van', title: 'Kichik yuk mashinasi', hint: 'Hajmli yuklar', emoji: '🚐', image: '/cargo/van.webp' },
]
