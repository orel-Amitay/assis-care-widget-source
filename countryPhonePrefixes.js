import { allCountries } from 'country-telephone-data';

const PLACEHOLDERS = {
  IL: '050-000-0000',
  US: '555-123-4567',
  GB: '07123 456789',
  FR: '06 12 34 56 78',
  DE: '01512 3456789',
  CA: '555-123-4567',
  AU: '0412 345 678',
};

function getCountrySortName(name) {
  if (!name || typeof name !== 'string') return '';
  return name.includes('(') ? name.split('(')[0].trim() : name;
}

export function countryCodeToFlag(iso) {
  if (!iso || typeof iso !== 'string' || iso.length !== 2) return '';
  const code = iso.toUpperCase();
  return String.fromCodePoint(
    ...[...code].map((char) => 0x1f1e6 - 65 + char.charCodeAt(0)),
  );
}

function normalizeCountry(raw) {
  const iso = raw.iso2.toUpperCase();
  return {
    iso,
    name: raw.name,
    dialCode: raw.dialCode,
    placeholder: PLACEHOLDERS[iso] || 'XX-XXX-XXXX',
  };
}

export const COUNTRY_PHONE_PREFIXES = allCountries
  .map(normalizeCountry)
  .sort((a, b) => getCountrySortName(a.name).localeCompare(getCountrySortName(b.name)));

export function findCountryByDialCode(dialCode) {
  const code = String(dialCode || '').replace(/\D/g, '');
  if (!code) return null;

  const exact = COUNTRY_PHONE_PREFIXES.find((country) => country.dialCode === code);
  if (exact) return exact;

  return [...COUNTRY_PHONE_PREFIXES]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((country) => code.startsWith(country.dialCode)) || null;
}

export function findCountryFromPhone(phone) {
  if (!phone || typeof phone !== 'string') return null;

  const trimmed = phone.trim();
  if (!trimmed.startsWith('+')) return null;

  const digits = trimmed.slice(1).replace(/\D/g, '');
  if (!digits) return null;

  return [...COUNTRY_PHONE_PREFIXES]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((country) => digits.startsWith(country.dialCode)) || null;
}
