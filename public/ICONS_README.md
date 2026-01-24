# PWA Icons Setup

You need to create the following icon files for your PWA to work properly on iPhone:

## Required Icon Files:

1. **pwa-192x192.png** - 192x192px PNG icon
2. **pwa-512x512.png** - 512x512px PNG icon
3. **apple-touch-icon.png** - 180x180px PNG icon (for iOS home screen)

## How to Generate Icons:

### Option 1: Use an online tool (Easiest)
- Visit https://realfavicongenerator.net/
- Upload your logo/icon
- Download the generated icons
- Place them in the `public/` folder

### Option 2: Use the placeholder SVG
- I've created `icon-placeholder.svg` in this folder
- Convert it to PNG at different sizes using:
  - ImageMagick: `convert -background none -resize 192x192 icon-placeholder.svg pwa-192x192.png`
  - Online converter: https://cloudconvert.com/svg-to-png

### Option 3: Design custom icons
- Create a 512x512px icon with:
  - Black background (#000000)
  - Cyan-to-purple gradient (#06B6D4 to #9333EA)
  - Your app logo/symbol
- Export at 192x192, 512x512, and 180x180 sizes

## Temporary Solution:

For now, I'll create simple placeholder PNG files so the PWA works immediately.
You can replace these later with proper branded icons.

## Icon Design Tips:
- Use simple, bold designs that work at small sizes
- Ensure good contrast on both light and dark backgrounds
- Test on actual device to see how it looks on home screen
- Consider using the vinyl record/DJ theme from your app
