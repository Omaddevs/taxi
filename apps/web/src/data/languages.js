export const LANGUAGES = [
  {
    code: 'uz',
    name: 'O‘zbekcha',
    native: 'O‘zbek tili',
    hint: 'Tilni o‘zgartirish',
    sheetTitle: 'Tilni tanlang',
  },
  {
    code: 'ru',
    name: 'Русский',
    native: 'Русский язык',
    hint: 'Изменить язык',
    sheetTitle: 'Выберите язык',
  },
  {
    code: 'en',
    name: 'English',
    native: 'English (UK)',
    hint: 'Change language',
    sheetTitle: 'Choose language',
  },
]

export function findLanguage(code) {
  return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0]
}
