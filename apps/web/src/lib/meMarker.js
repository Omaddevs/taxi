import L from 'leaflet'
import { t } from '../i18n'

// lucide "person-standing", inlined: Leaflet divIcons are plain HTML strings, not React.
const PERSON_SVG =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><path d="m9 20 3-6 3 6"/><path d="m6 8 6 2 6-2"/><path d="M12 10v4"/></svg>'

const W = 170
const H = 72

/**
 * "Siz shu yerdasiz" — the passenger's own position on every map: a card with the person badge,
 * a stem and a pulsing foot. The foot (not the card) sits exactly on the GPS point.
 */
export function meLocationIcon({ color = '#00c7d4', label = t('Siz shu yerdasiz') } = {}) {
  const safe = String(label).replace(/</g, '')
  return L.divIcon({
    className: 'me-marker',
    iconSize: [W, H],
    iconAnchor: [W / 2, H - 7],
    html: `<span class="me-pin" style="--me:${color};width:${W}px;height:${H}px"><span class="me-pin-card"><span class="me-pin-badge">${PERSON_SVG}</span><span class="me-pin-text">${safe}</span></span><span class="me-pin-stem"></span><span class="me-pin-foot"></span></span>`,
  })
}
