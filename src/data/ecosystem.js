export const ecosystem = [
  { id: 'women', to: '/women', title: 'Ayollar', desc: 'Xavfsiz taxi', emoji: '👩', phase: 1 },
  { id: 'delivery', to: '/cargo', title: 'Yetkazish', desc: 'Pochta va yuk', emoji: '📦', phase: 1 },
  { id: 'roadside', to: '/roadside', title: 'Yo‘lda yordam', desc: 'Usta, evakuator', emoji: '🚨', phase: 1 },
  { id: 'map', to: '/map', title: 'Smart xarita', desc: 'Hamma xizmat', emoji: '🗺️', phase: 1 },
  { id: 'fuel', to: '/fuel', title: 'Yoqilg‘i', desc: 'Arzon shahobcha', emoji: '⛽', phase: 1 },
  { id: 'service', to: '/hub/auto-service', title: 'Avtoservis', desc: 'Moy, diagnostika', emoji: '🔧', phase: 2 },
  { id: 'wash', to: '/hub/wash', title: 'Moyka', desc: 'Detailing', emoji: '🚿', phase: 2 },
  { id: 'parking', to: '/hub/parking', title: 'Parking', desc: 'Bo‘sh joylar', emoji: '🅿️', phase: 2 },
  { id: 'ev', to: '/hub/ev', title: 'EV zaryad', desc: 'Elektr stansiya', emoji: '⚡', phase: 2 },
  { id: 'food', to: '/hub/food', title: 'Oshxona', desc: 'Restoran, grocery', emoji: '🍔', phase: 3 },
  { id: 'wallet', to: '/wallet', title: 'Hamyon', desc: 'Bitta balans', emoji: '💳', phase: 4 },
  { id: 'sos', to: '/sos', title: 'SOS', desc: 'Favqulodda', emoji: '🆘', phase: 1 },
]

export const hubs = {
  'auto-service': {
    title: 'Avtoservis',
    subtitle: 'Motor, moy, diagnostika va konditsioner',
    items: [
      { title: 'Motor ta’miri', desc: 'Yaqin ustaxonalar' },
      { title: 'Hodovoy', desc: 'Podveska va tormoz' },
      { title: 'Elektrik', desc: 'Generator, starter' },
      { title: 'Diagnostika', desc: 'Kompyuter tekshiruv' },
      { title: 'Moy almashtirish', desc: 'Original moylar' },
      { title: 'Konditsioner', desc: 'To‘ldirish va ta’mir' },
    ],
  },
  tires: {
    title: 'Shina xizmati',
    subtitle: 'Shinomontaj, vulkanizatsiya, balansirovka',
    items: [
      { title: 'Shinomontaj', desc: '30 daqiqada' },
      { title: 'Vulkanizatsiya', desc: 'Yoriq va teshik' },
      { title: 'Mobil shina', desc: 'Siz turgan joyga' },
      { title: 'Disk ta’miri', desc: 'Raskrutka, bo‘yoq' },
      { title: 'Balansirovka', desc: 'Tebranishni bartaraf' },
    ],
  },
  wash: {
    title: 'Moyka va detailing',
    subtitle: 'Tashqi yuvishdan PPF gacha',
    items: [
      { title: 'Car Wash', desc: 'Tezkor yuvish' },
      { title: 'Detailing', desc: 'To‘liq kompleks' },
      { title: 'Polirovka', desc: 'Yaltiroq sirt' },
      { title: 'Ceramic', desc: 'Himoya qoplama' },
      { title: 'PPF', desc: 'Plyonka himoya' },
      { title: 'Tonirovka', desc: 'Qonuniy plyonka' },
    ],
  },
  market: {
    title: 'Avto marketplace',
    subtitle: 'Ehtiyot qism, shina, moy — yaqin do‘konlar',
    items: [
      { title: 'Ehtiyot qismlar', desc: 'Cobalt, Onix, Tracker' },
      { title: 'Shinalar', desc: 'Yozgi va qishki' },
      { title: 'Akkumulyator', desc: 'Yetkazib berish' },
      { title: 'Moy', desc: '5W-30, 10W-40' },
      { title: 'Lampalar', desc: 'LED va halogen' },
      { title: 'Avto kosmetika', desc: 'Salon va kuzov' },
    ],
  },
  parking: {
    title: 'Parking',
    subtitle: 'Bo‘sh joy, narx va ish vaqti',
    items: [
      { title: 'Yopiq parking', desc: 'Kamerasiz xavfsiz' },
      { title: 'Ochiq parking', desc: 'Markazga yaqin' },
      { title: 'Oldindan band', desc: 'Joyni saqlab qo‘ying' },
      { title: 'Aeroport parking', desc: 'Kunlik tarif' },
    ],
  },
  ev: {
    title: 'EV zaryad',
    subtitle: 'Elektr stansiyalar va band qilish',
    items: [
      { title: 'Tez zaryad', desc: 'CCS / GB/T' },
      { title: 'Oddiy zaryad', desc: 'Type 2' },
      { title: 'Band qilish', desc: 'Navbat kutmasdan' },
    ],
  },
  business: {
    title: 'Korporativ',
    subtitle: 'Xodimlar taxi, delivery va hisob-faktura',
    items: [
      { title: 'Company dashboard', desc: 'Barcha safarlar' },
      { title: 'Xodim taxi', desc: 'Limit va tasdiq' },
      { title: 'Delivery', desc: 'Ofis jo‘natmalari' },
      { title: 'Oylik invoice', desc: 'Bitta to‘lov' },
    ],
  },
  food: {
    title: 'Oshxona va grocery',
    subtitle: 'Restoran, supermarket — bir kuryer tarmog‘i',
    items: [
      { title: 'Restoran', desc: 'Tushlik va kechki' },
      { title: 'Fast food', desc: '25–40 daqiqa' },
      { title: 'Supermarket', desc: 'Mahsulot savati' },
      { title: 'Suv va ichimlik', desc: 'Uyga yetkazish' },
    ],
  },
  travel: {
    title: 'Sayohat',
    subtitle: 'Taxi + hotel + restoran + turistik joylar',
    items: [
      { title: 'Hotel', desc: 'Samarqand, Buxoro' },
      { title: 'Transfer', desc: 'Aeroport va vokzal' },
      { title: 'Restoran', desc: 'Mahalliy taomlar' },
      { title: 'Tur paket', desc: 'Weekend package' },
    ],
  },
  home: {
    title: 'Uy xizmatlari',
    subtitle: 'Yaqin mutaxassislar — santexnikdan elektrikgacha',
    items: [
      { title: 'Santexnik', desc: 'Quvur va kran' },
      { title: 'Elektrik', desc: 'Rozetka, svet' },
      { title: 'Tozalash', desc: 'Kvartira cleaning' },
      { title: 'Konditsioner', desc: 'O‘rnatish va tozalash' },
      { title: 'Qulfchi', desc: 'Eshik ochish' },
      { title: 'Ko‘chirish', desc: 'Mebel va yuk' },
    ],
  },
  health: {
    title: 'Salomatlik',
    subtitle: 'Klinika, dorixona va transfer',
    items: [
      { title: '24/7 dorixona', desc: 'Xaritada yaqin' },
      { title: 'Klinika', desc: 'Qabulga yozilish' },
      { title: 'Laboratoriya', desc: 'Analiz topshirish' },
      { title: 'Tibbiy transfer', desc: 'Bemorni olib borish' },
    ],
  },
  family: {
    title: 'Oila hisobi',
    subtitle: 'Onam uchun taxi — to‘lov sizning balansdan',
    items: [
      { title: 'Oilani qo‘shish', desc: 'Ona, bola, ota-ona' },
      { title: 'Boshqalar uchun taxi', desc: 'To‘lov sizdan' },
      { title: 'Lokatsiya ulashish', desc: 'Xavfsizlik' },
      { title: 'Kids ride', desc: 'Maktab-uy (tez orada)' },
    ],
  },
  insurance: {
    title: 'Sug‘urta',
    subtitle: 'Hamkor orqali OSAGO, KASKO va travel',
    items: [
      { title: 'OSAGO', desc: 'Majburiy sug‘urta' },
      { title: 'KASKO', desc: 'Keng qamrov' },
      { title: 'Travel', desc: 'Safar sug‘urtasi' },
      { title: 'Cargo', desc: 'Yuk sug‘urtasi' },
    ],
  },
}

export const fuelStations = [
  { id: 1, name: 'Shahobcha A · Qarshi', type: 'AI-92', price: 12000, km: 1.2, open: true },
  { id: 2, name: 'Shahobcha B · Nasaf', type: 'AI-92', price: 11800, km: 2.4, open: true },
  { id: 3, name: 'Metan Hub', type: 'Metan', price: 3800, km: 3.1, open: true },
  { id: 4, name: 'Propan 24', type: 'Propan', price: 6200, km: 4.0, open: false },
  { id: 5, name: 'EV Fast Charge', type: 'EV', price: 1800, km: 1.8, open: true },
]

export const roadside = [
  { id: 'usta', title: 'Usta', desc: 'Yo‘lda nosozlik', emoji: '🔧' },
  { id: 'tow', title: 'Evakuator', desc: '15–30 daqiqa', emoji: '🚛' },
  { id: 'battery', title: 'Akkumulyator', desc: 'Zaryad / almashtirish', emoji: '🔋' },
  { id: 'tire', title: 'Shina', desc: 'Mobil shinomontaj', emoji: '🛞' },
  { id: 'fuel', title: 'Yoqilg‘i', desc: 'Yetkazib berish', emoji: '⛽' },
  { id: 'key', title: 'Kalit', desc: 'Eshik ochish', emoji: '🔑' },
  { id: 'crash', title: 'YTH yordam', desc: 'Hujjat va evakuatsiya', emoji: '💥' },
  { id: 'diag', title: 'Diagnostika', desc: 'Xatolik kodlari', emoji: '🛠' },
]
