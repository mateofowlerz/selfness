---
name: add-to-wishlist
description: Add a product to the wishlist from a URL. Use when adding items to the wishlist, or when the user shares a product link they want to save.
argument-hint: [product-url]
disable-model-invocation: true
---

# Add to Wishlist

Add a product to the wishlist given a URL.

## Input

`$ARGUMENTS` — a product page URL.

## Steps

1. **Fetch the product page** using WebFetch. Extract:
   - Product name/title
   - Brand
   - Price
   - The highest resolution product image URL available (for Shopify stores, look for `_1024x1024@2x` or similar suffixes in srcset/meta tags)

2. **Generate an `id`** from the brand and product name in kebab-case (e.g. `fugazi-firestorm-jacket-red`). Keep it short and unique relative to existing items.

3. **Pick a `category`** — short label like `Sneakers`, `Jacket`, `Collectible`, `Accessory`, `Bike`, etc.

4. **Download the highest-res image** to `site/public/images/<id>.<ext>`.

5. **Remove the background** using `rembg`:
   ```bash
   python3 -c "
   from rembg import remove
   from PIL import Image
   import io

   with open('<input_path>', 'rb') as f:
       input_data = f.read()
   output_data = remove(input_data)
   img = Image.open(io.BytesIO(output_data))
   img.save('<output_path>', 'PNG')
   print(f'Saved: {img.size[0]}x{img.size[1]}')
   "
   ```
   - Save the result as `site/public/images/<id>.png`
   - Delete the original non-PNG file if it was a different format
   - If `rembg` is not installed, install it with: `pip3 install --break-system-packages rembg[cpu] Pillow`

6. **Append the item** to `wishlist.json` at the project root. The schema:
   ```json
   {
     "id": "string (required)",
     "title": "string (required) — display name",
     "url": "string (required) — the original product URL",
     "image": "string (required) — path relative to /public, e.g. /images/<id>.png",
     "brand": "string (optional)",
     "category": "string (optional)",
     "price": "string (optional) — e.g. $248"
   }
   ```

7. **Verify** the image file exists and the JSON is valid.
