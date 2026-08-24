export const user = {
  name: 'Otabek Anvarov',
  firstName: 'Otabek',
  phone: '+998 90 123 45 67',
  email: 'otabek@taxiline.uz',
  avatar: 'https://i.pravatar.cc/160?img=12',
  verified: true,
  trips: 48,
  rating: 4.9,
  points: 1250,
  balance: 1250000,
}

export const cities = [
  'Qarshi',
  'Toshkent',
  'Samarqand',
  'Buxoro',
  'Namangan',
  'Andijon',
  'Nukus',
  'Xorazm',
  'Fargona',
  'Termiz',
]

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
    desc: 'Faqat ayol haydovchilar',
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

export const trips = [
  {
    id: 't1',
    from: 'Qarshi',
    to: 'Toshkent',
    fromAddress: 'Qarshi, Nasaf ko‘chasi 12',
    toAddress: 'Toshkent, Amir Temur 45',
    date: '22 May',
    time: '18:00',
    arrive: '23:40',
    seats: 3,
    luggage: 2,
    price: 350000,
    service: 'standart',
    serviceTitle: 'Standart Taxi',
    car: 'Chevrolet Cobalt',
    plate: '01 A 777 BA',
    carImage:
      'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=640&q=80',
    driver: {
      name: 'Azizbek',
      rating: 4.9,
      trips: 1240,
      avatar: 'https://i.pravatar.cc/120?img=11',
      phone: '+998 91 200 11 22',
    },
  },
  {
    id: 't2',
    from: 'Qarshi',
    to: 'Toshkent',
    fromAddress: 'Qarshi avtovokzal',
    toAddress: 'Toshkent, Chorsu',
    date: '22 May',
    time: '19:30',
    arrive: '01:10',
    seats: 2,
    luggage: 3,
    price: 380000,
    service: 'women',
    serviceTitle: 'Ayollar uchun',
    car: 'Chevrolet Onix',
    plate: '01 W 515 AA',
    carImage:
      'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=640&q=80',
    driver: {
      name: 'Madina',
      rating: 5.0,
      trips: 860,
      avatar: 'https://i.pravatar.cc/120?img=32',
      phone: '+998 93 111 22 33',
    },
  },
  {
    id: 't3',
    from: 'Samarqand',
    to: 'Toshkent',
    fromAddress: 'Samarqand, Registon',
    toAddress: 'Toshkent, Yunusobod',
    date: '23 May',
    time: '07:00',
    arrive: '11:20',
    seats: 6,
    luggage: 4,
    price: 420000,
    service: 'minivan',
    serviceTitle: 'Minivan',
    car: 'Hyundai Staria',
    plate: '10 M 100 MA',
    carImage:
      'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=640&q=80',
    driver: {
      name: 'Javohir',
      rating: 4.8,
      trips: 540,
      avatar: 'https://i.pravatar.cc/120?img=15',
      phone: '+998 97 700 80 90',
    },
  },
  {
    id: 't4',
    from: 'Qarshi',
    to: 'Buxoro',
    fromAddress: 'Qarshi markaz',
    toAddress: 'Buxoro, Lyabi Hovuz',
    date: '22 May',
    time: '09:00',
    arrive: '12:30',
    seats: 3,
    luggage: 2,
    price: 220000,
    service: 'family',
    serviceTitle: 'Oilaviy Taxi',
    car: 'Chevrolet Tracker',
    plate: '70 F 909 FA',
    carImage:
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=640&q=80',
    driver: {
      name: 'Sardor',
      rating: 4.7,
      trips: 310,
      avatar: 'https://i.pravatar.cc/120?img=13',
      phone: '+998 90 555 44 33',
    },
  },
  {
    id: 't5',
    from: 'Toshkent',
    to: 'Andijon',
    fromAddress: 'Toshkent, Olmazor',
    toAddress: 'Andijon, Bobur shoh',
    date: '24 May',
    time: '06:30',
    arrive: '12:00',
    seats: 2,
    luggage: 2,
    price: 480000,
    service: 'premium',
    serviceTitle: 'Premium',
    car: 'Toyota Camry',
    plate: '01 P 001 PA',
    carImage:
      'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=640&q=80',
    driver: {
      name: 'Akmal',
      rating: 4.95,
      trips: 2100,
      avatar: 'https://i.pravatar.cc/120?img=14',
      phone: '+998 95 001 02 03',
    },
  },
]

export const history = [
  {
    id: 'h1',
    from: 'Qarshi',
    to: 'Toshkent',
    date: '18 May, 18:00',
    price: 350000,
    status: 'done',
    driver: 'Azizbek',
    plate: '01 A 777 BA',
  },
  {
    id: 'h2',
    from: 'Toshkent',
    to: 'Samarqand',
    date: '12 May, 09:20',
    price: 280000,
    status: 'done',
    driver: 'Javohir',
    plate: '10 M 100 MA',
  },
  {
    id: 'h3',
    from: 'Qarshi',
    to: 'Buxoro',
    date: '04 May, 07:00',
    price: 210000,
    status: 'cancelled',
    driver: 'Sardor',
    plate: '70 F 909 FA',
  },
]

export const conversations = [
  {
    id: 'c1',
    name: 'Azizbek',
    role: 'Haydovchi',
    avatar: 'https://i.pravatar.cc/120?img=11',
    last: 'Qarshi vokzal oldida kutaman',
    time: '14:22',
    unread: 2,
    online: true,
  },
  {
    id: 'c2',
    name: 'Taxiline Support',
    role: 'Yordam',
    avatar: '',
    last: 'Buyurtmangiz tasdiqlandi',
    time: 'Kecha',
    unread: 0,
    online: true,
  },
  {
    id: 'c3',
    name: 'Madina',
    role: 'Haydovchi',
    avatar: 'https://i.pravatar.cc/120?img=32',
    last: 'Bagaj joyi yetarli',
    time: 'Dush',
    unread: 0,
    online: false,
  },
]

export const chatMessages = {
  c1: [
    { id: 1, from: 'them', text: 'Assalomu alaykum, safarni tasdiqladim', time: '14:10' },
    { id: 2, from: 'me', text: 'Vaalaykum assalom. Qayerda kutamiz?', time: '14:12' },
    { id: 3, from: 'them', text: 'Qarshi vokzal oldida kutaman', time: '14:22' },
  ],
  c2: [
    { id: 1, from: 'them', text: 'Salom! Qanday yordam bera olamiz?', time: '10:00' },
    { id: 2, from: 'me', text: 'To‘lov o‘tganini tekshirib bering', time: '10:04' },
    { id: 3, from: 'them', text: 'Buyurtmangiz tasdiqlandi', time: '10:08' },
  ],
  c3: [
    { id: 1, from: 'them', text: 'Bagaj joyi yetarli', time: '09:40' },
  ],
}

export const promos = [
  { id: 'p1', code: 'QARSHI50', title: 'Qarshi yo‘nalishi', discount: '50 000 so‘m', until: '31 May' },
  { id: 'p2', code: 'YANGI20', title: 'Yangi foydalanuvchi', discount: '20%', until: '15 Iyun' },
  { id: 'p3', code: 'OILA10', title: 'Oilaviy taksi', discount: '10%', until: '30 Iyun' },
]

export const payments = [
  { id: 'cash', title: 'Naqd pul', subtitle: 'Haydovchiga to‘lov' },
  { id: 'uzcard', title: 'UzCard', subtitle: '**** 4412' },
  { id: 'humo', title: 'Humo', subtitle: '**** 8890' },
  { id: 'click', title: 'Click', subtitle: 'Mobil to‘lov' },
  { id: 'payme', title: 'Payme', subtitle: 'Mobil to‘lov' },
  { id: 'uzum', title: 'Uzum Bank', subtitle: 'Kartadan to‘lov' },
]

export const transactions = [
  { id: 1, title: 'Hisob to‘ldirish', route: 'Click', date: '20 May, 12:10', amount: 200000, type: 'in' },
  { id: 2, title: 'Safar to‘lovi', route: 'Qarshi → Toshkent', date: '18 May, 18:00', amount: -350000, type: 'out' },
  { id: 3, title: 'Promo bonus', route: 'QARSHI50', date: '16 May, 09:00', amount: 50000, type: 'in' },
  { id: 4, title: 'Safar to‘lovi', route: 'Toshkent → Samarqand', date: '12 May, 09:20', amount: -280000, type: 'out' },
]

export const faqs = [
  { q: 'Safarni qanday bekor qilaman?', a: 'Safar tafsilotlari sahifasida “Bekor qilish” tugmasini bosing. 30 daqiqadan oldin bekor qilish bepul.' },
  { q: 'To‘lov qanday amalga oshiriladi?', a: 'Naqd, UzCard, Humo, Click, Payme yoki Uzum Bank orqali to‘lashingiz mumkin.' },
  { q: 'Ayollar uchun taksi xavfsizmi?', a: 'Ha. Bu xizmatda faqat tasdiqlangan ayol haydovchilar, GPS kuzatuv va SOS tugmasi mavjud.' },
  { q: 'Yuk qancha vaqtda yetib boradi?', a: 'Shahardan shaharga odatda 4–8 soat. Og‘irlik va yo‘nalishga qarab aniq vaqt ko‘rsatiladi.' },
  { q: 'Haydovchi bo‘lish uchun nima kerak?', a: 'Passport, haydovchilik guvohnomasi, mashina hujjatlari va toza jinoiy tarix talab qilinadi.' },
]

export const notifications = [
  { id: 1, title: 'Joy band qilindi', text: 'Qarshi → Toshkent, 22 May 18:00', time: '2 daqiqa oldin', unread: true },
  { id: 2, title: 'Promo kodi faol', text: 'QARSHI50 — 50 000 so‘m chegirma', time: '1 soat oldin', unread: true },
  { id: 3, title: 'Safar yakunlandi', text: 'Toshkent → Samarqand muvaffaqiyatli yakunlandi', time: 'Kecha', unread: true },
  { id: 4, title: 'Hisob to‘ldirildi', text: '+200 000 so‘m Click orqali', time: '3 kun oldin', unread: false },
]

export const drivers = [
  { id: 'd1', name: 'Azizbek Karimov', rating: 4.9, car: 'Chevrolet Cobalt', city: 'Qarshi', trips: 1240, avatar: 'https://i.pravatar.cc/120?img=11' },
  { id: 'd2', name: 'Madina Yusupova', rating: 5.0, car: 'Chevrolet Onix', city: 'Toshkent', trips: 860, avatar: 'https://i.pravatar.cc/120?img=32' },
  { id: 'd3', name: 'Javohir Nazarov', rating: 4.8, car: 'Hyundai Staria', city: 'Samarqand', trips: 540, avatar: 'https://i.pravatar.cc/120?img=15' },
  { id: 'd4', name: 'Akmal Toshpo‘latov', rating: 4.95, car: 'Toyota Camry', city: 'Toshkent', trips: 2100, avatar: 'https://i.pravatar.cc/120?img=14' },
]

export const cargoTypes = [
  { id: 'docs', title: 'Hujjat', icon: 'file' },
  { id: 'clothes', title: 'Kiyim', icon: 'shirt' },
  { id: 'food', title: 'Oziq-ovqat', icon: 'utensils' },
  { id: 'tech', title: 'Texnika', icon: 'smartphone' },
  { id: 'other', title: 'Boshqa', icon: 'box' },
]

export const quickRoutes = [
  'Qarshi → Toshkent',
  'Toshkent → Samarqand',
  'Qarshi → Buxoro',
  'Samarqand → Buxoro',
]
