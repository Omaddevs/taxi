# Regions the service currently operates in, with their districts (tumanlar). Add a region
# back here to show it in the bot again — nothing else in the codebase needs to change.

REGIONS: dict[str, list[str]] = {
    "Andijon viloyati": [
        "Andijon shahri", "Andijon tumani", "Asaka", "Baliqchi", "Bo'z", "Buloqboshi",
        "Izboskan", "Jalaquduq", "Xo'jaobod", "Qo'rg'ontepa", "Marhamat", "Oltinko'l",
        "Paxtaobod", "Shahrixon", "Ulug'nor", "Xonobod",
    ],
    "Samarqand viloyati": [
        "Samarqand shahri", "Bulung'ur", "Jomboy", "Ishtixon", "Kattaqo'rg'on shahri",
        "Kattaqo'rg'on tumani", "Qo'shrabot", "Narpay", "Nurobod", "Oqdaryo", "Payariq",
        "Pastdarg'om", "Paxtachi", "Samarqand tumani", "Toyloq", "Urgut",
    ],
    "Toshkent viloyati": [
        "Angren shahri", "Bekobod shahri", "Chirchiq shahri", "Yangiyo'l shahri",
        "Bekobod tumani", "Bo'ka", "Bo'stonliq", "Qibray", "Ohangaron", "Oqqo'rg'on", "Parkent",
        "Piskent", "Toshkent tumani", "Yuqorichirchiq", "Quyichirchiq", "Zangiota",
    ],
    "Toshkent shahri": [
        "Bektemir", "Chilonzor", "Mirzo Ulug'bek", "Mirobod", "Sergeli", "Shayxontohur",
        "Olmazor", "Uchtepa", "Yashnobod", "Yakkasaroy", "Yunusobod", "Yangihayot",
    ],
}

REGION_NAMES = list(REGIONS.keys())
