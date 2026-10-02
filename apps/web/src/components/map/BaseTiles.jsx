import { TileLayer } from 'react-leaflet'

/** Free OSM raster tiles — no API key. Carto Voyager now watermarks without a key. */
export function BaseTiles() {
  return (
    <TileLayer
      attribution='&copy; OpenStreetMap'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      maxZoom={19}
    />
  )
}
