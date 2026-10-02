# Uzbekistan's 14 top-level regions with their districts (tumanlar). Good enough to run the
# trip-order flow end to end; extend/correct individual district lists here as needed — nothing
# else in the codebase needs to change when this data grows.

REGIONS: dict[str, list[str]] = {
    "Qoraqalpog'iston Respublikasi": [
        "Nukus shahri", "Amudaryo", "Beruniy", "Chimboy", "Ellikqal'a", "Kegeyli", "Mo'ynoq",
        "Nukus tumani", "Qanliko'l", "Qorao'zak", "Qo'ng'irot", "Shumanay", "Taxtako'pir",
        "To'rtko'l", "Xo'jayli",
    ],
    "Andijon viloyati": [
        "Andijon shahri", "Andijon tumani", "Asaka", "Baliqchi", "Bo'z", "Buloqboshi",
        "Izboskan", "Jalaquduq", "Xo'jaobod", "Qo'rg'ontepa", "Marhamat", "Oltinko'l",
        "Paxtaobod", "Shahrixon", "Ulug'nor", "Xonobod",
    ],
    "Buxoro viloyati": [
        "Buxoro shahri", "Buxoro tumani", "Vobkent", "G'ijduvon", "Jondor", "Kogon shahri",
        "Kogon tumani", "Olot", "Peshku", "Qorako'l", "Qorovulbozor", "Romitan", "Shofirkon",
    ],
    "Farg'ona viloyati": [
        "Farg'ona shahri", "Marg'ilon shahri", "Qo'qon shahri", "Farg'ona tumani", "Bag'dod",
        "Beshariq", "Buvayda", "Dang'ara", "Furqat", "Quva", "Qo'shtepa", "Rishton", "So'x",
        "Toshloq", "Uchko'prik", "O'zbekiston tumani", "Yozyovon",
    ],
    "Jizzax viloyati": [
        "Jizzax shahri", "Arnasoy", "Baxmal", "Do'stlik", "Forish", "G'allaorol", "Zafarobod",
        "Zarbdor", "Zomin", "Mirzacho'l", "Paxtakor", "Yangiobod", "Sharof Rashidov tumani",
    ],
    "Xorazm viloyati": [
        "Urganch shahri", "Xiva shahri", "Bog'ot", "Gurlan", "Xazorasp", "Xonqa", "Qo'shko'pir",
        "Shovot", "Urganch tumani", "Yangiariq", "Yangibozor",
    ],
    "Namangan viloyati": [
        "Namangan shahri", "Chortoq", "Chust", "Kosonsoy", "Mingbuloq", "Namangan tumani",
        "Norin", "Pop", "To'raqo'rg'on", "Uychi", "Uchqo'rg'on", "Yangiqo'rg'on",
    ],
    "Navoiy viloyati": [
        "Navoiy shahri", "Zarafshon shahri", "Konimex", "Karmana", "Qiziltepa", "Xatirchi",
        "Navbahor", "Nurota", "Tomdi", "Uchquduq",
    ],
    "Qashqadaryo viloyati": [
        "Qarshi shahri", "Shahrisabz shahri", "Dehqonobod", "G'uzor", "Qamashi",
        "Qarshi tumani", "Koson", "Kitob", "Mirishkor", "Muborak", "Nishon", "Chiroqchi",
        "Yakkabog'",
    ],
    "Samarqand viloyati": [
        "Samarqand shahri", "Bulung'ur", "Jomboy", "Ishtixon", "Kattaqo'rg'on shahri",
        "Kattaqo'rg'on tumani", "Qo'shrabot", "Narpay", "Nurobod", "Oqdaryo", "Payariq",
        "Pastdarg'om", "Paxtachi", "Samarqand tumani", "Toyloq", "Urgut",
    ],
    "Sirdaryo viloyati": [
        "Guliston shahri", "Guliston tumani", "Boyovut", "Sayxunobod", "Sirdaryo", "Xovos",
        "Mirzaobod", "Sardoba", "Yangiyer shahri",
    ],
    "Surxondaryo viloyati": [
        "Termiz shahri", "Angor", "Boysun", "Denov", "Jarqo'rg'on", "Qiziriq", "Qumqo'rg'on",
        "Muzrabot", "Oltinsoy", "Sariosiyo", "Sherobod", "Sho'rchi", "Termiz tumani", "Uzun",
    ],
    "Toshkent viloyati": [
        "Angren shahri", "Bekobod shahri", "Chirchiq shahri", "Yangiyo'l shahri",
        "Bekobod tumani", "Bo'ka", "Bo'stonliq", "Qibray", "Ohangaron", "Oqqo'rg'on",
        "Parkent", "Piskent", "Toshkent tumani", "Yuqorichirchiq", "Quyichirchiq", "Zangiota",
    ],
    "Toshkent shahri": [
        "Bektemir", "Chilonzor", "Mirzo Ulug'bek", "Mirobod", "Sergeli", "Shayxontohur",
        "Olmazor", "Uchtepa", "Yashnobod", "Yakkasaroy", "Yunusobod", "Yangihayot",
    ],
}

REGION_NAMES = list(REGIONS.keys())
