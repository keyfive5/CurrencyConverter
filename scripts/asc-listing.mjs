// Fills the complete App Store listing for Currency Converter:
// version metadata, subtitle + privacy URL, category, age rating, copyright,
// price (Free), availability (all territories), and 6.5" screenshots.
// Requires ./.ascappid to contain the ASC app ID (written after record creation).
// Run: node scripts/asc-listing.mjs
import { createHash, createPrivateKey, sign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const ROOT = process.cwd();
const KEY_ID = 'SVTXG8P9K9';
const ISSUER_ID = 'c46619e9-74be-420a-aaeb-746a63af1a11';
const APP_ID = readFileSync(join(ROOT, '.ascappid'), 'utf8').trim();
const API = 'https://api.appstoreconnect.apple.com';

const DESCRIPTION = `One screen. Every currency you care about. Updating as you type.

CONVERT TO EVERYTHING AT ONCE
Most converters make you pick a "from" and a "to", then start over for the next one. This one doesn't. Build a list of the currencies you actually use, type an amount, and every one of them updates at the same time. Tap any row to flip the direction instantly.

WORKS WITH NO SIGNAL
Rates are saved to your device the moment they load, so the app keeps converting in a taxi, on a plane, or in a basement cafe with no bars. A rate snapshot is built into the app itself, so even a brand-new install works before it ever touches the internet.

A CALCULATOR THAT SPEAKS MONEY
Splitting a dinner bill? Buying three of something? Type 48.50 x 3 straight into the amount and watch every currency follow along. No switching apps, no scratch paper.

160+ CURRENCIES
From the US dollar and euro to the Vietnamese dong, Kuwaiti dinar, and CFA franc - each with the right number of decimal places, so yen and dinar both look the way they should. Search by code or by name.

BUILT TO BE READ
Big, clear numbers. The live rate under every row. A timestamp telling you exactly how fresh the rates are, and an amber dot the moment they are not.

FREE, WITH NO CATCH
No ads. No account. No subscription. No upsells.

NOTHING LEAVES YOUR PHONE
No analytics, no tracking, no profile. The app asks a public source for a list of rates and nothing else. It has no idea who you are or what you converted.

Exchange rates are mid-market reference rates shown for information only; your bank or exchange will quote its own.`;

const KEYWORDS = 'exchange,forex,money,travel,convert,fx,calculator,euro,dollar,pound,yen,peso,rupee,foreign,cash';
const PROMO = 'Type once and every currency on your list updates at the same time. Works with no signal, does the maths for you, and never asks who you are.';
const SUBTITLE = 'Live rates, works offline';
const SUPPORT_URL = 'https://github.com/keyfive5/CurrencyConverter';
const PRIVACY_URL = 'https://github.com/keyfive5/CurrencyConverter/blob/main/PRIVACY.md';
const COPYRIGHT = '2026 Muhammad Hasan Zafar';
const SHOTS_DIR = join(ROOT, 'screenshots', '6.5');
const SHOTS = ['01-main.png', '02-calc.png', '03-picker.png', '04-many.png', '05-offline.png'];

const b64url = (buf) => Buffer.from(buf).toString('base64url');
function makeJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ iss: ISSUER_ID, iat: now - 30, exp: now + 900, aud: 'appstoreconnect-v1' }));
  const input = `${header}.${payload}`;
  const key = createPrivateKey(readFileSync(join(ROOT, `AuthKey_${KEY_ID}.p8`), 'utf8'));
  return `${input}.${b64url(sign('sha256', Buffer.from(input), { key, dsaEncoding: 'ieee-p1363' }))}`;
}
const jwt = makeJwt();

async function asc(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json.errors ?? json).slice(0, 600)}`);
  return json;
}

// 1. Editable version + localization
const versions = (await asc('GET', `/v1/apps/${APP_ID}/appStoreVersions?filter[appStoreState]=PREPARE_FOR_SUBMISSION&limit=5`)).data;
if (versions.length === 0) throw new Error('No editable version found');
const version = versions[0];
console.log(`Version ${version.attributes.versionString} (${version.id})`);

const locs = (await asc('GET', `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`)).data;
const loc = locs.find((l) => l.attributes.locale === 'en-US') ?? locs[0];

await asc('PATCH', `/v1/appStoreVersionLocalizations/${loc.id}`, {
  data: {
    type: 'appStoreVersionLocalizations',
    id: loc.id,
    attributes: { description: DESCRIPTION, keywords: KEYWORDS, promotionalText: PROMO, supportUrl: SUPPORT_URL },
  },
});
console.log('Set description, keywords, promo, support URL');

await asc('PATCH', `/v1/appStoreVersions/${version.id}`, {
  data: { type: 'appStoreVersions', id: version.id, attributes: { copyright: COPYRIGHT } },
});
console.log('Set copyright');

// 2. App info: subtitle + privacy policy URL + categories
const infos = (await asc('GET', `/v1/apps/${APP_ID}/appInfos?include=appInfoLocalizations`)).data;
const info = infos.find((i) => ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED'].includes(i.attributes.appStoreState)) ?? infos[0];
const infoLocs = (await asc('GET', `/v1/appInfos/${info.id}/appInfoLocalizations`)).data;
const infoLoc = infoLocs.find((l) => l.attributes.locale === 'en-US') ?? infoLocs[0];

await asc('PATCH', `/v1/appInfoLocalizations/${infoLoc.id}`, {
  data: {
    type: 'appInfoLocalizations',
    id: infoLoc.id,
    attributes: { subtitle: SUBTITLE, privacyPolicyUrl: PRIVACY_URL },
  },
});
console.log('Set subtitle + privacy policy URL');

await asc('PATCH', `/v1/appInfos/${info.id}`, {
  data: {
    type: 'appInfos',
    id: info.id,
    relationships: {
      primaryCategory: { data: { type: 'appCategories', id: 'FINANCE' } },
      secondaryCategory: { data: { type: 'appCategories', id: 'TRAVEL' } },
    },
  },
});
console.log('Set categories: Finance / Travel');

// 3. Age rating: everything none/false -> 4+ (lives on appInfos since mid-2026;
// attrs are mixed bool/enum types, so only send keys the API reports)
const decl = (await asc('GET', `/v1/appInfos/${info.id}/ageRatingDeclaration`)).data;
const BOOL_KEYS = [
  'advertising',
  'ageAssurance',
  'gambling',
  'healthOrWellnessTopics',
  'lootBox',
  'messagingAndChat',
  'parentalControls',
  'unrestrictedWebAccess',
  'userGeneratedContent',
];
const ENUM_KEYS = [
  'alcoholTobaccoOrDrugUseOrReferences',
  'contests',
  'gamblingSimulated',
  'gunsOrOtherWeapons',
  'medicalOrTreatmentInformation',
  'profanityOrCrudeHumor',
  'sexualContentGraphicAndNudity',
  'sexualContentOrNudity',
  'horrorOrFearThemes',
  'matureOrSuggestiveThemes',
  'violenceCartoonOrFantasy',
  'violenceRealisticProlongedGraphicOrSadistic',
  'violenceRealistic',
];
const ratingAttrs = {};
for (const k of BOOL_KEYS) if (k in decl.attributes) ratingAttrs[k] = false;
for (const k of ENUM_KEYS) if (k in decl.attributes) ratingAttrs[k] = 'NONE';
await asc('PATCH', `/v1/ageRatingDeclarations/${decl.id}`, {
  data: { type: 'ageRatingDeclarations', id: decl.id, attributes: ratingAttrs },
});
console.log('Age rating declaration set (4+)');

// 4. Price: Free (USD 0 base)
const points = (await asc('GET', `/v1/apps/${APP_ID}/appPricePoints?filter[territory]=USA&limit=200&include=territory`)).data;
const free = points.find((p) => Number(p.attributes.customerPrice) === 0);
if (!free) throw new Error('No 0-USD price point found');
await asc('POST', '/v1/appPriceSchedules', {
  data: {
    type: 'appPriceSchedules',
    relationships: {
      app: { data: { type: 'apps', id: APP_ID } },
      baseTerritory: { data: { type: 'territories', id: 'USA' } },
      manualPrices: { data: [{ type: 'appPrices', id: '${price1}' }] },
    },
  },
  included: [
    {
      type: 'appPrices',
      id: '${price1}',
      attributes: { startDate: null },
      relationships: { appPricePoint: { data: { type: 'appPricePoints', id: free.id } } },
    },
  ],
});
console.log('Price set: Free (USD 0 base)');

// 5. Availability: all territories
const territories = (await asc('GET', '/v1/territories?limit=200')).data;
await asc('POST', '/v2/appAvailabilities', {
  data: {
    type: 'appAvailabilities',
    attributes: { availableInNewTerritories: true },
    relationships: {
      app: { data: { type: 'apps', id: APP_ID } },
      territoryAvailabilities: { data: territories.map((t, i) => ({ type: 'territoryAvailabilities', id: `\${t${i}}` })) },
    },
  },
  included: territories.map((t, i) => ({
    type: 'territoryAvailabilities',
    id: `\${t${i}}`,
    attributes: { available: true },
    relationships: { territory: { data: { type: 'territories', id: t.id } } },
  })),
});
console.log(`Availability set: ${territories.length} territories`);

// 6. Screenshots (6.5", APP_IPHONE_65)
const sets = (await asc('GET', `/v1/appStoreVersionLocalizations/${loc.id}/appScreenshotSets`)).data;
let set = sets.find((s) => s.attributes.screenshotDisplayType === 'APP_IPHONE_65');
if (!set) {
  set = (
    await asc('POST', '/v1/appScreenshotSets', {
      data: {
        type: 'appScreenshotSets',
        attributes: { screenshotDisplayType: 'APP_IPHONE_65' },
        relationships: { appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: loc.id } } },
      },
    })
  ).data;
  console.log('Created 6.5" screenshot set');
} else {
  const existing = (await asc('GET', `/v1/appScreenshotSets/${set.id}/appScreenshots`)).data;
  for (const s of existing) await asc('DELETE', `/v1/appScreenshots/${s.id}`);
  if (existing.length) console.log(`Deleted ${existing.length} existing screenshots`);
}

for (const name of SHOTS) {
  const file = readFileSync(join(SHOTS_DIR, name));
  const reserved = (
    await asc('POST', '/v1/appScreenshots', {
      data: {
        type: 'appScreenshots',
        attributes: { fileName: basename(name), fileSize: file.length },
        relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: set.id } } },
      },
    })
  ).data;
  for (const op of reserved.attributes.uploadOperations) {
    const headers = Object.fromEntries(op.requestHeaders.map((h) => [h.name, h.value]));
    const chunk = file.subarray(op.offset, op.offset + op.length);
    const up = await fetch(op.url, { method: op.method, headers, body: chunk });
    if (!up.ok) throw new Error(`Upload part failed for ${name}: ${up.status}`);
  }
  await asc('PATCH', `/v1/appScreenshots/${reserved.id}`, {
    data: {
      type: 'appScreenshots',
      id: reserved.id,
      attributes: { uploaded: true, sourceFileChecksum: createHash('md5').update(file).digest('hex') },
    },
  });
  console.log(`Uploaded ${name} (${file.length} bytes)`);
}

console.log('done');
