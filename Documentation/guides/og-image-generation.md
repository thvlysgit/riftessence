# Open Graph Image Generation

> Last updated: 2026-05-14

The Open Graph (OG) image is displayed when RiftEssence links are shared on Discord, Twitter/X, Facebook, and other preview surfaces.

## Current OG Routes

RiftEssence uses a global branded Edge OG image for normal public pages, and dynamic Edge OG images for share-style pages:

- `/api/og/app` - default app showcase image
- `/api/og/post/:id` - dynamic duo post image
- `/api/og/rating/:username` - dynamic rating image
- `/api/og/team/:id` - dynamic team invite/share image

`_app.tsx` and `SEOHead` publish the global image through `globalOgImageUrl()` in `apps/web/utils/ogImage.ts` unless a page provides an explicit image through `ssrOgImage` or the `SEOHead` `ogImage` prop. The global URL includes a version query string because Discord and OG validators cache image URLs aggressively.

The canonical production host is:

```
https://riftessence.app
```

## Global Image Template

The historical static template still lives at:

```
apps/web/public/assets/og-image-template.html
```

If a static fallback image is regenerated from that template, save it as:

```
apps/web/public/assets/og-image.png
```

The final image should be exactly `1200x630` pixels.

## Verification

After changing OG behavior:

1. Check the relevant route emits the expected `og:image` and `twitter:image` tags.
2. Check the image URL opens directly in a browser.
3. Test a production URL in Discord or an OG validator.
4. If Discord shows stale content, bump `GLOBAL_OG_IMAGE_VERSION` in `apps/web/utils/ogImage.ts` or change the dynamic image URL query.

## SEO Meta Tags

The meta tags are configured in:

- Global fallback: `apps/web/pages/_app.tsx`
- Per-page helper: `apps/web/components/SEOHead.tsx`
- Dynamic share metadata: page `getServerSideProps` values such as `ssrTitle`, `ssrDescription`, `ssrOgImage`, and `ssrUrl`

Default global image URL shape:

```
https://riftessence.app/api/og/app?v={GLOBAL_OG_IMAGE_VERSION}
```

## Troubleshooting

**Discord not showing embed?**

- Confirm the page is publicly accessible.
- Confirm `og:image` is an absolute HTTPS URL.
- Open the image URL directly.
- Bump the image version/query if Discord has cached an older preview.

**Wrong image showing?**

- Check whether the page provides `ssrOgImage`.
- Check whether `SEOHead` receives an `ogImage` prop.
- Confirm `_app.tsx` is not falling back to `globalOgImageUrl()` because no page image was provided.
