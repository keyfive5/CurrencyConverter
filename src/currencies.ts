/**
 * Currency metadata for every code the rates feed publishes.
 *
 * Flags come from the ISO-3166 country code, which for most currencies is just
 * the first two letters of the ISO-4217 code (USD -> US). FLAG_OVERRIDE holds
 * the ones where that rule breaks (supranational, territories, retired codes).
 */

export type Currency = {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  /** Digits shown after the decimal point. */
  decimals: number;
};

/** [code, name, symbol, decimals] — decimals omitted means 2. */
const TABLE: Array<[string, string, string, number?]> = [
  ['USD', 'US Dollar', '$'],
  ['EUR', 'Euro', '€'],
  ['GBP', 'British Pound', '£'],
  ['JPY', 'Japanese Yen', '¥', 0],
  ['AUD', 'Australian Dollar', '$'],
  ['CAD', 'Canadian Dollar', '$'],
  ['CHF', 'Swiss Franc', 'Fr'],
  ['CNY', 'Chinese Yuan', '¥'],
  ['INR', 'Indian Rupee', '₹'],
  ['MXN', 'Mexican Peso', '$'],
  ['BRL', 'Brazilian Real', 'R$'],
  ['KRW', 'South Korean Won', '₩', 0],
  ['SGD', 'Singapore Dollar', '$'],
  ['HKD', 'Hong Kong Dollar', '$'],
  ['NZD', 'New Zealand Dollar', '$'],
  ['SEK', 'Swedish Krona', 'kr'],
  ['NOK', 'Norwegian Krone', 'kr'],
  ['DKK', 'Danish Krone', 'kr'],
  ['PLN', 'Polish Zloty', 'zł'],
  ['CZK', 'Czech Koruna', 'Kč'],
  ['HUF', 'Hungarian Forint', 'Ft'],
  ['RON', 'Romanian Leu', 'lei'],
  ['BGN', 'Bulgarian Lev', 'лв'],
  ['HRK', 'Croatian Kuna', 'kn'],
  ['RSD', 'Serbian Dinar', 'дин'],
  ['ISK', 'Icelandic Krona', 'kr', 0],
  ['TRY', 'Turkish Lira', '₺'],
  ['RUB', 'Russian Ruble', '₽'],
  ['UAH', 'Ukrainian Hryvnia', '₴'],
  ['ZAR', 'South African Rand', 'R'],
  ['AED', 'UAE Dirham', 'د.إ'],
  ['SAR', 'Saudi Riyal', '﷼'],
  ['QAR', 'Qatari Riyal', '﷼'],
  ['KWD', 'Kuwaiti Dinar', 'د.ك', 3],
  ['BHD', 'Bahraini Dinar', '.د.ب', 3],
  ['OMR', 'Omani Rial', '﷼', 3],
  ['JOD', 'Jordanian Dinar', 'د.ا', 3],
  ['ILS', 'Israeli Shekel', '₪'],
  ['EGP', 'Egyptian Pound', '£'],
  ['THB', 'Thai Baht', '฿'],
  ['VND', 'Vietnamese Dong', '₫', 0],
  ['PHP', 'Philippine Peso', '₱'],
  ['IDR', 'Indonesian Rupiah', 'Rp', 0],
  ['MYR', 'Malaysian Ringgit', 'RM'],
  ['TWD', 'New Taiwan Dollar', 'NT$'],
  ['PKR', 'Pakistani Rupee', '₨'],
  ['BDT', 'Bangladeshi Taka', '৳'],
  ['LKR', 'Sri Lankan Rupee', '₨'],
  ['NPR', 'Nepalese Rupee', '₨'],
  ['AFN', 'Afghan Afghani', '؋'],
  ['ARS', 'Argentine Peso', '$'],
  ['CLP', 'Chilean Peso', '$', 0],
  ['COP', 'Colombian Peso', '$', 0],
  ['PEN', 'Peruvian Sol', 'S/'],
  ['UYU', 'Uruguayan Peso', '$U'],
  ['BOB', 'Bolivian Boliviano', 'Bs'],
  ['PYG', 'Paraguayan Guarani', '₲', 0],
  ['VES', 'Venezuelan Bolivar', 'Bs'],
  ['CRC', 'Costa Rican Colon', '₡'],
  ['GTQ', 'Guatemalan Quetzal', 'Q'],
  ['HNL', 'Honduran Lempira', 'L'],
  ['NIO', 'Nicaraguan Cordoba', 'C$'],
  ['PAB', 'Panamanian Balboa', 'B/.'],
  ['DOP', 'Dominican Peso', 'RD$'],
  ['CUP', 'Cuban Peso', '$'],
  ['JMD', 'Jamaican Dollar', 'J$'],
  ['TTD', 'Trinidad & Tobago Dollar', 'TT$'],
  ['BBD', 'Barbadian Dollar', '$'],
  ['BSD', 'Bahamian Dollar', '$'],
  ['BZD', 'Belize Dollar', 'BZ$'],
  ['BMD', 'Bermudian Dollar', '$'],
  ['KYD', 'Cayman Islands Dollar', '$'],
  ['XCD', 'East Caribbean Dollar', '$'],
  ['XCG', 'Caribbean Guilder', 'ƒ'],
  ['ANG', 'Netherlands Antillean Guilder', 'ƒ'],
  ['AWG', 'Aruban Florin', 'ƒ'],
  ['SRD', 'Surinamese Dollar', '$'],
  ['GYD', 'Guyanese Dollar', '$'],
  ['HTG', 'Haitian Gourde', 'G'],
  ['NGN', 'Nigerian Naira', '₦'],
  ['KES', 'Kenyan Shilling', 'KSh'],
  ['GHS', 'Ghanaian Cedi', '₵'],
  ['TZS', 'Tanzanian Shilling', 'TSh'],
  ['UGX', 'Ugandan Shilling', 'USh', 0],
  ['ETB', 'Ethiopian Birr', 'Br'],
  ['MAD', 'Moroccan Dirham', 'د.م'],
  ['TND', 'Tunisian Dinar', 'د.ت', 3],
  ['DZD', 'Algerian Dinar', 'د.ج'],
  ['LYD', 'Libyan Dinar', 'ل.د', 3],
  ['IQD', 'Iraqi Dinar', 'ع.د', 3],
  ['IRR', 'Iranian Rial', '﷼', 0],
  ['LBP', 'Lebanese Pound', 'ل.ل', 0],
  ['SYP', 'Syrian Pound', '£'],
  ['YER', 'Yemeni Rial', '﷼'],
  ['SDG', 'Sudanese Pound', 'ج.س'],
  ['SSP', 'South Sudanese Pound', '£'],
  ['ZMW', 'Zambian Kwacha', 'ZK'],
  ['ZWG', 'Zimbabwe Gold', 'Z$'],
  ['ZWL', 'Zimbabwean Dollar', 'Z$'],
  ['MWK', 'Malawian Kwacha', 'MK'],
  ['MZN', 'Mozambican Metical', 'MT'],
  ['AOA', 'Angolan Kwanza', 'Kz'],
  ['CDF', 'Congolese Franc', 'FC'],
  ['RWF', 'Rwandan Franc', 'FRw', 0],
  ['BIF', 'Burundian Franc', 'FBu', 0],
  ['DJF', 'Djiboutian Franc', 'Fdj', 0],
  ['SOS', 'Somali Shilling', 'Sh'],
  ['ERN', 'Eritrean Nakfa', 'Nfk'],
  ['XAF', 'Central African CFA Franc', 'FCFA', 0],
  ['XOF', 'West African CFA Franc', 'CFA', 0],
  ['XPF', 'CFP Franc', '₣', 0],
  ['GMD', 'Gambian Dalasi', 'D'],
  ['GNF', 'Guinean Franc', 'FG', 0],
  ['SLE', 'Sierra Leonean Leone', 'Le'],
  ['SLL', 'Sierra Leonean Leone (old)', 'Le'],
  ['LRD', 'Liberian Dollar', '$'],
  ['CVE', 'Cape Verdean Escudo', '$'],
  ['STN', 'Sao Tome & Principe Dobra', 'Db'],
  ['MRU', 'Mauritanian Ouguiya', 'UM'],
  ['MUR', 'Mauritian Rupee', '₨'],
  ['SCR', 'Seychellois Rupee', '₨'],
  ['MVR', 'Maldivian Rufiyaa', '.ރ'],
  ['BTN', 'Bhutanese Ngultrum', 'Nu.'],
  ['BWP', 'Botswanan Pula', 'P'],
  ['NAD', 'Namibian Dollar', '$'],
  ['LSL', 'Lesotho Loti', 'L'],
  ['SZL', 'Swazi Lilangeni', 'L'],
  ['MGA', 'Malagasy Ariary', 'Ar', 0],
  ['KMF', 'Comorian Franc', 'CF', 0],
  ['SHP', 'Saint Helena Pound', '£'],
  ['FKP', 'Falkland Islands Pound', '£'],
  ['GIP', 'Gibraltar Pound', '£'],
  ['GGP', 'Guernsey Pound', '£'],
  ['IMP', 'Isle of Man Pound', '£'],
  ['JEP', 'Jersey Pound', '£'],
  ['FOK', 'Faroese Krona', 'kr'],
  ['ALL', 'Albanian Lek', 'L'],
  ['BAM', 'Bosnia-Herzegovina Mark', 'KM'],
  ['MKD', 'Macedonian Denar', 'ден'],
  ['MDL', 'Moldovan Leu', 'L'],
  ['GEL', 'Georgian Lari', '₾'],
  ['AMD', 'Armenian Dram', '֏'],
  ['AZN', 'Azerbaijani Manat', '₼'],
  ['BYN', 'Belarusian Ruble', 'Br'],
  ['KZT', 'Kazakhstani Tenge', '₸'],
  ['UZS', 'Uzbekistani Som', "so'm", 0],
  ['KGS', 'Kyrgystani Som', 'с'],
  ['TJS', 'Tajikistani Somoni', 'SM'],
  ['TMT', 'Turkmenistani Manat', 'm'],
  ['MNT', 'Mongolian Tugrik', '₮', 0],
  ['KHR', 'Cambodian Riel', '៛'],
  ['LAK', 'Laotian Kip', '₭', 0],
  ['MMK', 'Myanmar Kyat', 'K', 0],
  ['BND', 'Brunei Dollar', '$'],
  ['MOP', 'Macanese Pataca', 'MOP$'],
  ['CNH', 'Chinese Yuan (offshore)', '¥'],
  ['FJD', 'Fijian Dollar', '$'],
  ['PGK', 'Papua New Guinean Kina', 'K'],
  ['WST', 'Samoan Tala', 'T'],
  ['TOP', 'Tongan Paanga', 'T$'],
  ['VUV', 'Vanuatu Vatu', 'VT', 0],
  ['SBD', 'Solomon Islands Dollar', '$'],
  ['KID', 'Kiribati Dollar', '$'],
  ['TVD', 'Tuvaluan Dollar', '$'],
  ['CLF', 'Chilean Unit of Account', 'UF', 4],
  ['XDR', 'IMF Special Drawing Rights', 'SDR'],
];

/** Currency codes whose flag is not simply code.slice(0, 2). */
const FLAG_OVERRIDE: Record<string, string> = {
  EUR: '🇪🇺',
  XAF: '🇨🇲',
  XOF: '🇸🇳',
  XPF: '🇵🇫',
  XCD: '🇦🇬',
  XCG: '🇨🇼',
  ANG: '🇨🇼',
  XDR: '🏦',
  CLF: '🇨🇱',
  CNH: '🇨🇳',
  KID: '🇰🇮',
  TVD: '🇹🇻',
  SLL: '🇸🇱',
  ZWL: '🇿🇼',
  ZWG: '🇿🇼',
  SLE: '🇸🇱',
  MRU: '🇲🇷',
  STN: '🇸🇹',
  VES: '🇻🇪',
  BYN: '🇧🇾',
};

/** Turn a two-letter country code into its regional-indicator flag emoji. */
function flagFor(code: string): string {
  const override = FLAG_OVERRIDE[code];
  if (override) return override;
  const country = code.slice(0, 2).toUpperCase();
  return String.fromCodePoint(
    ...[...country].map((c) => 0x1f1e6 + (c.charCodeAt(0) - 65))
  );
}

export const CURRENCIES: Record<string, Currency> = {};
export const ALL_CODES: string[] = [];

for (const [code, name, symbol, decimals] of TABLE) {
  CURRENCIES[code] = {
    code,
    name,
    symbol,
    flag: flagFor(code),
    decimals: decimals ?? 2,
  };
  ALL_CODES.push(code);
}

/** Shown first in the picker — the codes people actually reach for. */
export const POPULAR = [
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY',
  'INR', 'MXN', 'BRL', 'KRW', 'SGD', 'HKD', 'NZD', 'AED',
  'THB', 'TRY', 'ZAR', 'SEK', 'NOK', 'PLN', 'PHP', 'VND',
];

/** Fallback for a code the feed publishes but this table does not describe. */
export function currency(code: string): Currency {
  return (
    CURRENCIES[code] ?? {
      code,
      name: code,
      symbol: code,
      flag: flagFor(code),
      decimals: 2,
    }
  );
}
