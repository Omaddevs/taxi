# TaxiLine — serverga joylash

Bitta Ubuntu serverda hammasi Docker orqali ishlaydi:

| Servis | Vazifasi | Manzil |
|---|---|---|
| `caddy` | HTTPS (Let's Encrypt sertifikatini o‘zi oladi va yangilaydi) | 80, 443-portlar |
| `web` | Yo‘lovchi va haydovchi ilovasi | `https://WEB_DOMAIN` |
| `admin` | Admin panel | `https://WEB_DOMAIN/admin` (`ADMIN_DOMAIN` shu yerga yo‘naltiradi) |
| `server` | API va Socket.IO | `https://API_DOMAIN` |
| `bot` | Telegram bot | tashqariga ochilmagan |
| `postgres` | Ma'lumotlar bazasi (`taxiline` va `taxiline_bot`) | tashqariga ochilmagan |

## 1. Talablar

- Ubuntu 22.04/24.04 VPS, kamida 2 GB RAM (build uchun), 20 GB disk.
- Docker: `curl -fsSL https://get.docker.com | sh`
- Domenning uchta A-yozuvi server IP manziliga yo‘naltirilgan bo‘lishi kerak, masalan:
  - `taxiline.uz` → `IP`
  - `admin.taxiline.uz` → `IP`
  - `api.taxiline.uz` → `IP`
- 80 va 443-portlar ochiq bo‘lishi kerak (`ufw allow 80,443/tcp`).

## 2. O‘rnatish

```bash
git clone https://github.com/Omaddevs/taxi.git /opt/taxiline
cd /opt/taxiline
cp .env.production.example .env
nano .env        # <...> belgilangan hamma qiymatni to‘ldiring
```

Maxfiy kalitlarni shunday yarating (har biri uchun alohida):

```bash
openssl rand -hex 32
```

`POSTGRES_PASSWORD` uchun ham `openssl rand -hex 24` ishlating. Maxsus belgilar (`@`, `/`, `:`) baza manzilini buzadi.

## 3. Ishga tushirish

```bash
docker compose up -d --build
docker compose logs -f server bot caddy     # chiqish: Ctrl+C
```

Server har safar ishga tushganda o‘zi migratsiyalarni qo‘llaydi va xizmat turlari hamda tariflar bor-yo‘qligini tekshiradi. Admin o‘zgartirgan narxlar qayta yozilmaydi.

## 4. Admin

`.env`ga admin telefoni va parolini yozing:

```
ADMIN_PHONE=+998901112233
ADMIN_PASSWORD=KuchliParol123
```

Server har safar ishga tushganda shu akkauntni o‘zi yaratadi yoki parolini yangilaydi. Keyin `https://WEB_DOMAIN/admin/login` sahifasidan shu telefon va parol bilan kiring. Parolni o‘zgartirish uchun `.env`dagi qiymatni o‘zgartirib, `docker compose up -d server` buyrug‘ini bering.

## 5. Tizimga kirish (SMS)

- **`SMS_PROVIDER=console`** (standart): SMS yuborilmaydi, foydalanuvchilar **Telegram bot orqali** kiradi. Shuning uchun `BOT_TOKEN` va `TELEGRAM_BOT_USERNAME` to‘g‘ri bo‘lishi shart.
- **`SMS_PROVIDER=eskiz`**: kod SMS orqali boradi. Kerakli sozlamalar:
  1. eskiz.uz'da kabinet oching va `ESKIZ_EMAIL` hamda `ESKIZ_PASSWORD`ni yozing.
  2. Kabinetda `TaxiLine tasdiqlash kodi: XXXXXX` matnli shablonni tasdiqlatib oling. Tasdiqlanmagan matn yuborilmaydi.
  3. O‘z jo‘natuvchi nomingiz bo‘lsa, uni `ESKIZ_FROM`ga yozing. `4546` — Eskiz'ning test jo‘natuvchisi.

## 6. To‘lovlar

`ONLINE_PAYMENTS_ENABLED=false` bo‘lganda hamyonni to‘ldirish, pul yechish, karta qo‘shish va onlayn to‘lov "Tez orada" bo‘lib turadi, server ham bu so‘rovlarni rad etadi. Naqd pul ishlaydi.

Click yoki Payme ulanmaguncha bu qiymatni **`true` qilmang**: `PAYMENT_PROVIDER=mock` har qanday to‘lovni "muvaffaqiyatli" deb qabul qiladi.

## 7. Yangilash

```bash
cd /opt/taxiline
git pull
docker compose up -d --build
```

## 8. Zaxira nusxa (backup)

```bash
docker compose exec -T postgres pg_dump -U taxiline taxiline | gzip > backup-$(date +%F).sql.gz
docker compose exec -T postgres pg_dump -U taxiline taxiline_bot | gzip > backup-bot-$(date +%F).sql.gz
```

Buni cron orqali har kuni ishga tushirib, nusxalarni boshqa joyda saqlash tavsiya etiladi.

## Muammolar

| Belgi | Sababi |
|---|---|
| Caddy sertifikat ololmayapti | DNS hali server IP'siga yo‘nalmagan yoki 80/443-port yopiq |
| Saytda "Network error" | `API_DOMAIN` noto‘g‘ri yoki `server` ishlamayapti: `docker compose logs server` |
| `Environment validation failed` | `.env`da majburiy qiymat bo‘sh qolgan, xatoda qaysi biri ekani yozilgan |
| Bot javob bermayapti | `BOT_TOKEN` noto‘g‘ri yoki bot boshqa joyda ham ishlab turibdi (bitta token = bitta jarayon) |
