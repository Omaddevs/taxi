import { useEffect } from 'react'
import { OG_IMAGE, SEO_PAGES, SITE_NAME, absoluteUrl } from './pages'

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * Sahifa sarlavhasi, tavsifi, canonical va Open Graph teglarini o‘rnatadi.
 * `path` — SEO_PAGES dagi kalit; yoki `override` bilan (masalan, yangilik maqolasi) to‘liq beriladi.
 * Build paytida yozilgan statik teglar bilan bir xil qiymatlar — SPA ichida o‘tishda ham to‘g‘ri qoladi.
 */
export function useSeo(path, override) {
  const base = SEO_PAGES[path] || SEO_PAGES['/']
  const title = override?.title ?? base.title
  const description = override?.description ?? base.description
  const url = override?.url ?? absoluteUrl(path)
  const image = override?.image ?? OG_IMAGE
  const type = override?.type ?? 'website'
  const noindex = Boolean(override?.noindex)

  useEffect(() => {
    document.title = title
    setMeta('name', 'description', description)
    setMeta('name', 'robots', noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large')
    setCanonical(url)
    setMeta('property', 'og:site_name', SITE_NAME)
    setMeta('property', 'og:type', type)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:image', image)
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)
    setMeta('name', 'twitter:image', image)
  }, [title, description, url, image, type, noindex])
}

/** Sahifaga JSON-LD (Schema.org) qo‘shadi va sahifadan chiqqanda olib tashlaydi. */
export function useJsonLd(id, data) {
  const json = data ? JSON.stringify(data) : ''
  useEffect(() => {
    if (!json) return undefined
    const elId = `ld-${id}`
    // Build paytida yozilgan bir xil skript bo‘lsa — uni qayta ishlatamiz (dublikat bo‘lmasin).
    let el = document.getElementById(elId)
    if (!el) {
      el = document.createElement('script')
      el.type = 'application/ld+json'
      el.id = elId
      document.head.appendChild(el)
    }
    el.textContent = json
    return () => el.remove()
  }, [id, json])
}
