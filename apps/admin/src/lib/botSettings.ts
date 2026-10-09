// Sub-pages of "Bot sozlamalari" — the page's tabs and the sidebar dropdown (AdminLayout). The
// settings sections themselves come from the bot (taxiline-bot/app/services/bot_config.py), so a
// new bot setting shows up without a dashboard change; only a brand-new *section* needs a line here.
export const BOT_SETTINGS_PAGES: { slug: string; label: string; to?: string }[] = [
  { slug: 'features', label: 'Funksiyalar' },
  { slug: 'general', label: 'Umumiy' },
  { slug: 'drivers', label: 'Haydovchilar va obuna' },
  { slug: 'clients', label: 'Mijozlar' },
  { slug: 'format-ads', label: 'E’lon shabloni' },
  { slug: 'group-ads', label: 'Guruh e’lonlari' },
  { slug: 'ads-log', label: 'E’lonlar jurnali' },
  { slug: 'groups', label: 'Guruhlar va biriktirish', to: '/groups' },
]
