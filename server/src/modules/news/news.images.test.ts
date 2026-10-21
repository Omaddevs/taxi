import { describe, expect, it } from 'vitest'
import { referencedImageIds } from './news.images.js'

const post = (patch: Partial<Parameters<typeof referencedImageIds>[0][number]>) => ({
  body: '',
  coverUrl: null,
  authorAvatar: null,
  bannerImage: null,
  ...patch,
})

describe('referencedImageIds', () => {
  it('collects images from the body, cover, author avatar and banner', () => {
    const ids = referencedImageIds([
      post({
        body: '<p>a</p><img src="https://api.taxiline.uz/news/images/cmabc1"><img src="/news/images/cmabc2" data-size="m">',
        coverUrl: 'https://api.taxiline.uz/news/images/cmcover',
      }),
      post({ authorAvatar: 'https://api.taxiline.uz/news/images/cmavatar', bannerImage: '/news/images/cmbanner' }),
    ])
    expect([...ids].sort()).toEqual(['cmabc1', 'cmabc2', 'cmavatar', 'cmbanner', 'cmcover'])
  })

  it('ignores external URLs, data: URIs and empty fields', () => {
    const ids = referencedImageIds([
      post({ body: '<img src="https://example.com/a.png">', coverUrl: 'data:image/png;base64,AAAA', bannerImage: '' }),
    ])
    expect(ids.size).toBe(0)
  })
})
