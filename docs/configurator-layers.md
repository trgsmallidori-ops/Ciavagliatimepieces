# Configurator Layer Images Guide

This guide explains how to prepare and upload layer images for the interactive watch configurator.

## Layer Structure

The configurator composites watch images by stacking transparent PNG layers:

| Layer | Step | Z-Index | Description |
|-------|------|---------|-------------|
| Base | Function | 0 | Full watch image (Oak, Naut, Sub, etc.) |
| Case | Case | 10 | Transparent PNG with case in selected color |
| Dial | Dial | 20 | Transparent PNG with dial pattern/color |
| Hands | Hands | 30 | Transparent PNG with watch hands |
| Strap | Strap | 40 | Transparent PNG with strap/bracelet |

## Image Requirements

- **Format**: PNG with transparency (for all layers except the base). Use PNG so the composite can stack layers correctly; JPEG has no transparency and will show a solid background.
- **Dimensions**: All layers for a given watch style must have identical dimensions for proper alignment
- **Base layer**: Can be opaque (full watch photo)
- **Other layers**: Must have transparent background; only the component (case, dial, etc.) should be visible. Export with alpha from your 3D or design tool when possible to avoid black-background and color issues.

## Naming Convention (Suggested)

```
base-oak.png, base-naut.png, base-sub.png, ...
case-yellow-gold.png, case-black.png, case-rose-gold.png, case-stainless-steel.png
dial-arctic-white.png, dial-onyx-black.png, dial-midnight-blue.png, dial-champagne-gold.png
hands-standard.png, hands-luminous.png, ...
strap-leather-black.png, strap-metal.png, ...
```

## Uploading via Admin Panel

1. Go to **Account > Admin > Configurator**
2. Edit each option (Function, Case, Dial, Hands, Strap)
3. Use the **Layer Image** upload field (separate from Thumbnail Image). When you crop a layer image in the admin, it is saved as **PNG** to preserve transparency and color; thumbnail and preview image crops are saved as JPEG.
4. Set **Layer Z-Index** (defaults: Function=0, Case=10, Dial=20, Hands=30, Strap=40)

## Fallback Behavior

- If `layer_image_url` is empty, the configurator falls back to `image_url` (thumbnail)
- Options without layer images are skipped in the composite
- The base (Function) layer is required; other layers are optional
- Layer images are shown as-is when they have real transparency. If a layer image has a solid black, white, or grey background (e.g. PNG exported without alpha, or alpha lost on some browsers), the configurator will **automatically** treat that background as transparent so the composite still looks correct. For best quality, export layer images with a real transparent background (alpha channel) from your 3D or design tool when possible.
