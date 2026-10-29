// Yordamchi chatni istalgan joydan ochish (masalan "24/7 yordam" kartasi) — SupportChat shu hodisani tinglaydi.
export const SUPPORT_CHAT_OPEN_EVENT = 'taxiline:open-support-chat'

export function openSupportChat() {
  window.dispatchEvent(new Event(SUPPORT_CHAT_OPEN_EVENT))
}
