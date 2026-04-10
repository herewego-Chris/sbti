# Byte-Sized Bullshit Type Indicator (SBTI)

A playful clone of the SBTI personality test experience, including:

- Web version (static HTML/CSS/JS clone)
- WeChat Mini Program version
- Full question flow, scoring logic, and persona mapping
- Result poster generation with character image + analysis + share-ready layout

## Project Structure

- `index.html`, `main.css`, `main.js`: web clone
- `miniprogram/`: WeChat Mini Program implementation
- `miniprogram/utils/sbti-logic.js`: scoring + type logic
- `miniprogram/pages/index/`: test flow and result UI

## Mini Program Highlights

- Full test flow with conditional questions
- Result page with type image and dimension analysis
- Result poster export to album
- Image sharing flow (share generated result image)
- Built-in placeholder mini-code area on poster (`miniprogram/assets/mini/mini-code.jpg`)

## Notes

This project is intended for entertainment and UI/logic replication learning only.

If you want real mini-program QR linking in the poster, replace:

- `miniprogram/assets/mini/mini-code.jpg`

with your official generated mini-program code image.

## Local Run (Web)

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.
