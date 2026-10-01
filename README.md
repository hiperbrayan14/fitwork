# Fit Work Tailwind Setup

This project now uses local Tailwind CSS build output instead of the Tailwind CDN.

## Setup

1. Install Node.js (which includes npm).
2. Run:
   ```bash
   npm install
   npm run build:css
   ```
3. Open `login.html`, `registro.html`, or `usuarios.html`.

## Development

To rebuild automatically while editing:

```bash
npm run watch:css
```

> If styles still appear incomplete, install Node.js/npm and run `npm install` followed by `npm run build:css`.
