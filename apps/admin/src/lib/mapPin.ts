import L from 'leaflet'

// Round colour dot used for places on the panel's Leaflet maps.
export function pinIcon(color: string, selected = false) {
  const size = selected ? 22 : 16
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></span>`,
  })
}
