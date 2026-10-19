import { useState } from 'react'
import { Bell, Globe, LogOut, Moon, UserRound, Vibrate } from 'lucide-react'
import { AccountScreen, Group, Row, Sheet, Toggle } from '../components/account/AccountKit'
import { LanguageSheet } from '../components/ui/LanguagePicker'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { findLanguage } from '../data/languages'
import { canVibrate, setVibrateOnOpen, vibrateOnOpenEnabled } from '../lib/vibrate'
import { t } from '../i18n'
import { confirmAction } from '../components/ui/Feedback'

// Menu → Sozlamalar. Only settings that really do something: profile, theme, language, the
// open-buzz (where the device can vibrate), notifications and signing out.
export default function Settings() {
  const { user, theme, setTheme, language } = useApp()
  const { logout } = useAuth()
  const [themeOpen, setThemeOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [vibrate, setVibrate] = useState(vibrateOnOpenEnabled)
  const lang = findLanguage(language)

  return (
    <AccountScreen title="Sozlamalar">
      <Group>
        <Row icon={UserRound} title="Shaxsiy ma’lumotlar" subtitle={user.name || t('Ism kiritilmagan')} to="/settings/profile" />
      </Group>

      <Group>
        <Row icon={Moon} title="Tungi rejim" subtitle={t(theme === 'dark' ? 'Yoqilgan' : 'O‘chirilgan')} onClick={() => setThemeOpen(true)} />
        <Row icon={Globe} title="Ilova tili" subtitle={lang.name} onClick={() => setLangOpen(true)} />
        {canVibrate ? (
          <Row
            icon={Vibrate}
            title="Ochilganda tebranish"
            right={
              <Toggle
                label={t('Ochilganda tebranish')}
                checked={vibrate}
                onChange={(on) => {
                  setVibrate(on)
                  setVibrateOnOpen(on)
                  if (on) navigator.vibrate(18)
                }}
              />
            }
          />
        ) : null}
      </Group>

      <Group>
        <Row icon={Bell} title="Bildirishnomalar" to="/notifications" />
      </Group>

      <Group>
        <Row icon={LogOut} title="Chiqish" danger chevron={false} onClick={() => confirmAction({ title: 'Hisobdan chiqasizmi?', confirmLabel: 'Chiqish', cancelLabel: 'Qaytish' }).then((ok) => ok && logout())} />
      </Group>

      <Sheet open={themeOpen} title="Tungi rejim" onClose={() => setThemeOpen(false)}>
        <div className="overflow-hidden rounded-[22px] bg-canvas">
          {[
            ['light', 'O‘chirilgan'],
            ['dark', 'Yoqilgan'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setTheme(value)
                setThemeOpen(false)
              }}
              className="flex w-full items-center justify-between border-b border-line/80 px-4 py-4 text-left text-[16px] text-ink last:border-b-0"
            >
              {t(label)}
              <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${theme === value ? 'border-brand bg-brand' : 'border-black/15'}`}>
                {theme === value ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
              </span>
            </button>
          ))}
        </div>
      </Sheet>
      {langOpen ? <LanguageSheet onClose={() => setLangOpen(false)} /> : null}
    </AccountScreen>
  )
}
