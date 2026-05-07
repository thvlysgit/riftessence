# How to Generate the Open Graph Image

The Open Graph (OG) image is displayed when you share RiftEssence links on Discord, Twitter, Facebook, etc.

## Current Dynamic OG Routes

RiftEssence now uses dynamic Edge OG images for share-heavy pages:

- `/api/og/app` — default app showcase image
- `/api/og/post/:id` — Looking For Duo post card
- `/api/og/rating/:username` — external rating page card
- `/api/og/team/:id` — team invite/roster card

Pages should set exactly one `ssrOgImage` through server-side props when they need a feature-specific Discord embed. `_app.tsx` reads `ssrTitle`, `ssrDescription`, `ssrOgImage`, and `ssrUrl` as the shared metadata source.

The current OG templates are designed as fixed 1200x630 share surfaces with bounded copy areas. Keep dynamic user text truncated before rendering instead of relying on browser-style wrapping; Satori can clip or overlap long text differently from normal CSS. Duo post images should foreground the player's own message and role intent, while keeping region as small metadata because most Discord communities already provide that context.

## Static Image Method

1. **Open the template**:
   - Navigate to `apps/web/public/assets/og-image-template.html`
   - Open this file in your web browser (Chrome recommended)

2. **Capture the image**:
   - Press `F12` to open Developer Tools
   - Press `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
   - Type "Capture screenshot"
   - Select **"Capture node screenshot"**
   - Click on the card element (it will highlight in blue)
   
   OR use the dimension method:
   - Press `Ctrl+Shift+P` / `Cmd+Shift+P`
   - Type "Capture screenshot"
   - Select **"Capture screenshot"** (full size)
   - In DevTools, toggle device toolbar (Ctrl+Shift+M)
   - Set dimensions to **1200 x 630** pixels
   - Take the screenshot

3. **Save the image**:
   - Save as `og-image.png` in `apps/web/public/assets/`
   - File should be exactly **1200x630 pixels**

## Alternative Methods

### Using Online Tools

1. Use [Screely](https://www.screely.com/) or similar
2. Upload a screenshot of the template
3. Export as 1200x630px PNG

### Using Screenshot Software

- **Windows**: Snipping Tool (Win+Shift+S)
- **Mac**: Screenshot utility (Cmd+Shift+4)
- **Linux**: Spectacle, Flameshot

Make sure final dimensions are **1200x630px**.

## Verification

After creating the image:

1. Check file exists: `apps/web/public/assets/og-image.png`
2. Verify dimensions: Right-click → Properties → Details (should be 1200x630)
3. Test locally: Paste link in Discord and check preview

## Testing Discord Embed

### Local Testing
If running dev server:
```
http://localhost:3000
```

### Production (DevTunnel)
```
https://qpnpc65t-3333.uks1.devtunnels.ms
```

Paste the URL in a Discord chat and see the embed!

## Customization

Want to change the OG image design?

Edit `apps/web/public/assets/og-image-template.html`:
- Change colors (CSS variables)
- Modify text (logo, tagline, description)
- Adjust feature badges
- Change gradient/theme

Then regenerate the screenshot.

## SEO Meta Tags

The meta tags are configured in:
- Global: `apps/web/pages/_app.tsx`
- Per-page: `apps/web/components/SEOHead.tsx`

Image URL is set to:
```
https://qpnpc65t-3333.uks1.devtunnels.ms/assets/og-image.png
```

Update this URL when migrating to production hosting.

## Troubleshooting

**Discord not showing embed?**
- Clear Discord cache (Settings → Advanced → Clear Cache)
- Wait 5-10 minutes (Discord caches OG data)
- Check image is accessible: paste image URL directly in browser

**Image not loading?**
- Verify file path: `/public/assets/og-image.png`
- Check file size (should be <1MB for fast loading)
- Ensure Next.js dev server or production build is running

**Wrong image showing?**
- Discord caches OG data - use different URL parameter to force refresh:
  ```
  https://your-url.com?v=2
  ```
