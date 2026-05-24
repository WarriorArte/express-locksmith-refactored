// Catálogo de países con código ISO, bandera, prefijo telefónico y símbolo monetario.
// Fuente local (sin dependencia de API externa) — permite elegir un país y autocompletar
// el símbolo de moneda y prefijo telefónico de forma offline.

export interface CountryInfo {
  code: string;        // ISO 3166-1 alpha-2
  name: string;
  flag: string;
  dial: string;        // Prefijo telefónico (E.164)
  currencyCode: string;
  currencySymbol: string;
}

export const COUNTRIES: CountryInfo[] = [
  { code: "MX", name: "México",              flag: "🇲🇽", dial: "+52",  currencyCode: "MXN", currencySymbol: "$" },
  { code: "US", name: "Estados Unidos",      flag: "🇺🇸", dial: "+1",   currencyCode: "USD", currencySymbol: "$" },
  { code: "CA", name: "Canadá",              flag: "🇨🇦", dial: "+1",   currencyCode: "CAD", currencySymbol: "$" },
  { code: "GT", name: "Guatemala",           flag: "🇬🇹", dial: "+502", currencyCode: "GTQ", currencySymbol: "Q" },
  { code: "SV", name: "El Salvador",         flag: "🇸🇻", dial: "+503", currencyCode: "USD", currencySymbol: "$" },
  { code: "HN", name: "Honduras",            flag: "🇭🇳", dial: "+504", currencyCode: "HNL", currencySymbol: "L" },
  { code: "NI", name: "Nicaragua",           flag: "🇳🇮", dial: "+505", currencyCode: "NIO", currencySymbol: "C$" },
  { code: "CR", name: "Costa Rica",          flag: "🇨🇷", dial: "+506", currencyCode: "CRC", currencySymbol: "₡" },
  { code: "PA", name: "Panamá",              flag: "🇵🇦", dial: "+507", currencyCode: "PAB", currencySymbol: "B/." },
  { code: "DO", name: "República Dominicana",flag: "🇩🇴", dial: "+1",   currencyCode: "DOP", currencySymbol: "RD$" },
  { code: "CU", name: "Cuba",                flag: "🇨🇺", dial: "+53",  currencyCode: "CUP", currencySymbol: "$" },
  { code: "PR", name: "Puerto Rico",         flag: "🇵🇷", dial: "+1",   currencyCode: "USD", currencySymbol: "$" },
  { code: "CO", name: "Colombia",            flag: "🇨🇴", dial: "+57",  currencyCode: "COP", currencySymbol: "$" },
  { code: "VE", name: "Venezuela",           flag: "🇻🇪", dial: "+58",  currencyCode: "VES", currencySymbol: "Bs" },
  { code: "EC", name: "Ecuador",             flag: "🇪🇨", dial: "+593", currencyCode: "USD", currencySymbol: "$" },
  { code: "PE", name: "Perú",                flag: "🇵🇪", dial: "+51",  currencyCode: "PEN", currencySymbol: "S/." },
  { code: "BO", name: "Bolivia",             flag: "🇧🇴", dial: "+591", currencyCode: "BOB", currencySymbol: "Bs" },
  { code: "CL", name: "Chile",               flag: "🇨🇱", dial: "+56",  currencyCode: "CLP", currencySymbol: "$" },
  { code: "AR", name: "Argentina",           flag: "🇦🇷", dial: "+54",  currencyCode: "ARS", currencySymbol: "$" },
  { code: "PY", name: "Paraguay",            flag: "🇵🇾", dial: "+595", currencyCode: "PYG", currencySymbol: "₲" },
  { code: "UY", name: "Uruguay",             flag: "🇺🇾", dial: "+598", currencyCode: "UYU", currencySymbol: "$U" },
  { code: "BR", name: "Brasil",              flag: "🇧🇷", dial: "+55",  currencyCode: "BRL", currencySymbol: "R$" },
  { code: "GY", name: "Guyana",              flag: "🇬🇾", dial: "+592", currencyCode: "GYD", currencySymbol: "$" },
  { code: "ES", name: "España",              flag: "🇪🇸", dial: "+34",  currencyCode: "EUR", currencySymbol: "€" },
  { code: "PT", name: "Portugal",            flag: "🇵🇹", dial: "+351", currencyCode: "EUR", currencySymbol: "€" },
  { code: "FR", name: "Francia",             flag: "🇫🇷", dial: "+33",  currencyCode: "EUR", currencySymbol: "€" },
  { code: "DE", name: "Alemania",            flag: "🇩🇪", dial: "+49",  currencyCode: "EUR", currencySymbol: "€" },
  { code: "IT", name: "Italia",              flag: "🇮🇹", dial: "+39",  currencyCode: "EUR", currencySymbol: "€" },
  { code: "GB", name: "Reino Unido",         flag: "🇬🇧", dial: "+44",  currencyCode: "GBP", currencySymbol: "£" },
  { code: "JP", name: "Japón",               flag: "🇯🇵", dial: "+81",  currencyCode: "JPY", currencySymbol: "¥" },
  { code: "CN", name: "China",               flag: "🇨🇳", dial: "+86",  currencyCode: "CNY", currencySymbol: "¥" },
  { code: "IN", name: "India",               flag: "🇮🇳", dial: "+91",  currencyCode: "INR", currencySymbol: "₹" },
  { code: "AU", name: "Australia",           flag: "🇦🇺", dial: "+61",  currencyCode: "AUD", currencySymbol: "$" },
];

export function getCountryByCode(code?: string | null): CountryInfo | undefined {
  if (!code) return undefined;
  return COUNTRIES.find((c) => c.code === code.toUpperCase());
}

/** Infiere el ISO a partir de prefijo + símbolo (para registros previos sin country_code). */
export function inferCountryCode(dial?: string | null, symbol?: string | null): string | undefined {
  if (!dial) return undefined;
  const matches = COUNTRIES.filter((c) => c.dial === dial);
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0].code;
  if (symbol) {
    const exact = matches.find((c) => c.currencySymbol === symbol);
    if (exact) return exact.code;
  }
  return matches[0].code;
}
