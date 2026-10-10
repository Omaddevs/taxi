// i18n-ignore-file
// Til nomlari har doim o‘z tilida ko‘rsatiladi, shuning uchun t() orqali tarjima qilinmaydi.
export const LANGUAGES = [
  {
    code: 'uz',
    short: 'UZ',
    flag: 'uz',
    name: 'O‘zbekcha',
    native: 'Lotin alifbosi',
    hint: 'Tilni o‘zgartirish',
    sheetTitle: 'Tilni tanlang',
  },
  {
    code: 'oz',
    short: 'ЎЗ',
    flag: 'uz',
    name: 'Ўзбекча',
    native: 'Кирилл алифбоси',
    hint: 'Тилни ўзгартириш',
    sheetTitle: 'Тилни танланг',
  },
  {
    code: 'ru',
    short: 'RU',
    flag: 'ru',
    name: 'Русский',
    native: 'Русский язык',
    hint: 'Изменить язык',
    sheetTitle: 'Выберите язык',
  },
  {
    code: 'en',
    short: 'EN',
    flag: 'en',
    name: 'English',
    native: 'English (UK)',
    hint: 'Change language',
    sheetTitle: 'Choose language',
  },
]

export function findLanguage(code) {
  return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0]
}
