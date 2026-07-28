# Currency Converter

A fast, offline-first currency converter for iOS. 160+ currencies, a built-in
calculator, and every currency on your list updating as you type.

- **Convert to everything at once.** Type an amount and every currency you've
  added updates live — no picking a "from" and a "to" every time.
- **Works offline.** Rates are cached on the device, and a snapshot ships inside
  the app, so a fresh install works on a plane.
- **Calculator built in.** Type `48.50 × 3` right in the amount field.
- **No account, no ads, no tracking.** Nothing leaves the device.

## Layout

| Path | What it is |
| --- | --- |
| `App.tsx` | The single screen: rate status, currency list, keypad |
| `src/engine.ts` | Pure conversion, calculator, and formatting logic |
| `src/rates.ts` | Fetch, fallback provider, offline cache |
| `src/currencies.ts` | Name / symbol / flag / precision for every code |
| `src/seed-rates.ts` | Generated rate snapshot bundled into the binary |
| `src/components/` | Currency row, keypad, currency picker |

## Development

```
npm install
npx expo start --web --port 8094
```

The engine has no React or React Native imports, so its maths runs under plain
node:

```
node --experimental-strip-types scripts/test-engine.mjs
```

## Regenerating assets

```
node scripts/make-seed.mjs      # refresh the bundled rate snapshot
node scripts/make-icons.mjs     # app icon, splash mark, favicon
node scripts/make-screenshots.mjs   # App Store screenshots (web server must be up)
```

## Shipping

`scripts/asc-*.mjs` drive the App Store Connect API directly with a self-signed
ES256 JWT: provisioning, store metadata, screenshot upload, build attach, and
review submission. They read the app id from `.ascappid`.

## Rates

Rates come from [exchangerate-api.com](https://www.exchangerate-api.com)'s open
endpoint, falling back to the
[@fawazahmed0 currency API](https://github.com/fawazahmed0/exchange-api). They
are mid-market reference rates — not the rate a bank or exchange will give you.

## Privacy

See [PRIVACY.md](PRIVACY.md). Short version: the app collects nothing.
