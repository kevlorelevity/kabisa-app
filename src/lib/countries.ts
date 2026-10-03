// Countries offered at sign-up, with the Swahili name used in the lessons
// ("Ninatoka Ujerumani") and a home city that replaces "Kampala" in the
// scripts (e.g. "Wako Berlin na nyanya yao"). Kenya uses Kisumu, because the
// lessons are set in Nairobi.

export interface Country {
  code: string;
  flag: string;
  en: string;
  sw: string;
  city: string;
}

export const COUNTRIES: Country[] = [
  { code: 'KE', flag: '🇰🇪', en: 'Kenya', sw: 'Kenya', city: 'Kisumu' },
  { code: 'UG', flag: '🇺🇬', en: 'Uganda', sw: 'Uganda', city: 'Kampala' },
  { code: 'TZ', flag: '🇹🇿', en: 'Tanzania', sw: 'Tanzania', city: 'Dar es Salaam' },
  { code: 'RW', flag: '🇷🇼', en: 'Rwanda', sw: 'Rwanda', city: 'Kigali' },
  { code: 'BI', flag: '🇧🇮', en: 'Burundi', sw: 'Burundi', city: 'Bujumbura' },
  { code: 'ET', flag: '🇪🇹', en: 'Ethiopia', sw: 'Ethiopia', city: 'Addis Ababa' },
  { code: 'SS', flag: '🇸🇸', en: 'South Sudan', sw: 'Sudan Kusini', city: 'Juba' },
  { code: 'SO', flag: '🇸🇴', en: 'Somalia', sw: 'Somalia', city: 'Mogadishu' },
  { code: 'CD', flag: '🇨🇩', en: 'DR Congo', sw: 'Kongo', city: 'Kinshasa' },
  { code: 'NG', flag: '🇳🇬', en: 'Nigeria', sw: 'Nigeria', city: 'Lagos' },
  { code: 'GH', flag: '🇬🇭', en: 'Ghana', sw: 'Ghana', city: 'Accra' },
  { code: 'ZA', flag: '🇿🇦', en: 'South Africa', sw: 'Afrika Kusini', city: 'Johannesburg' },
  { code: 'ZM', flag: '🇿🇲', en: 'Zambia', sw: 'Zambia', city: 'Lusaka' },
  { code: 'ZW', flag: '🇿🇼', en: 'Zimbabwe', sw: 'Zimbabwe', city: 'Harare' },
  { code: 'MW', flag: '🇲🇼', en: 'Malawi', sw: 'Malawi', city: 'Lilongwe' },
  { code: 'EG', flag: '🇪🇬', en: 'Egypt', sw: 'Misri', city: 'Cairo' },
  { code: 'MA', flag: '🇲🇦', en: 'Morocco', sw: 'Moroko', city: 'Casablanca' },
  { code: 'US', flag: '🇺🇸', en: 'United States', sw: 'Marekani', city: 'New York' },
  { code: 'CA', flag: '🇨🇦', en: 'Canada', sw: 'Kanada', city: 'Toronto' },
  { code: 'MX', flag: '🇲🇽', en: 'Mexico', sw: 'Meksiko', city: 'Mexico City' },
  { code: 'BR', flag: '🇧🇷', en: 'Brazil', sw: 'Brazili', city: 'São Paulo' },
  { code: 'AR', flag: '🇦🇷', en: 'Argentina', sw: 'Ajentina', city: 'Buenos Aires' },
  { code: 'GB', flag: '🇬🇧', en: 'United Kingdom', sw: 'Uingereza', city: 'London' },
  { code: 'IE', flag: '🇮🇪', en: 'Ireland', sw: 'Ayalandi', city: 'Dublin' },
  { code: 'DE', flag: '🇩🇪', en: 'Germany', sw: 'Ujerumani', city: 'Berlin' },
  { code: 'AT', flag: '🇦🇹', en: 'Austria', sw: 'Austria', city: 'Vienna' },
  { code: 'CH', flag: '🇨🇭', en: 'Switzerland', sw: 'Uswisi', city: 'Zurich' },
  { code: 'FR', flag: '🇫🇷', en: 'France', sw: 'Ufaransa', city: 'Paris' },
  { code: 'BE', flag: '🇧🇪', en: 'Belgium', sw: 'Ubelgiji', city: 'Brussels' },
  { code: 'NL', flag: '🇳🇱', en: 'Netherlands', sw: 'Uholanzi', city: 'Amsterdam' },
  { code: 'ES', flag: '🇪🇸', en: 'Spain', sw: 'Uhispania', city: 'Madrid' },
  { code: 'PT', flag: '🇵🇹', en: 'Portugal', sw: 'Ureno', city: 'Lisbon' },
  { code: 'IT', flag: '🇮🇹', en: 'Italy', sw: 'Italia', city: 'Rome' },
  { code: 'SE', flag: '🇸🇪', en: 'Sweden', sw: 'Uswidi', city: 'Stockholm' },
  { code: 'NO', flag: '🇳🇴', en: 'Norway', sw: 'Norwei', city: 'Oslo' },
  { code: 'DK', flag: '🇩🇰', en: 'Denmark', sw: 'Denmaki', city: 'Copenhagen' },
  { code: 'FI', flag: '🇫🇮', en: 'Finland', sw: 'Ufini', city: 'Helsinki' },
  { code: 'PL', flag: '🇵🇱', en: 'Poland', sw: 'Polandi', city: 'Warsaw' },
  { code: 'GR', flag: '🇬🇷', en: 'Greece', sw: 'Ugiriki', city: 'Athens' },
  { code: 'TR', flag: '🇹🇷', en: 'Turkey', sw: 'Uturuki', city: 'Istanbul' },
  { code: 'RU', flag: '🇷🇺', en: 'Russia', sw: 'Urusi', city: 'Moscow' },
  { code: 'UA', flag: '🇺🇦', en: 'Ukraine', sw: 'Ukraini', city: 'Kyiv' },
  { code: 'IL', flag: '🇮🇱', en: 'Israel', sw: 'Israeli', city: 'Tel Aviv' },
  { code: 'AE', flag: '🇦🇪', en: 'United Arab Emirates', sw: 'Falme za Kiarabu', city: 'Dubai' },
  { code: 'SA', flag: '🇸🇦', en: 'Saudi Arabia', sw: 'Saudia', city: 'Riyadh' },
  { code: 'IN', flag: '🇮🇳', en: 'India', sw: 'India', city: 'Mumbai' },
  { code: 'PK', flag: '🇵🇰', en: 'Pakistan', sw: 'Pakistani', city: 'Karachi' },
  { code: 'CN', flag: '🇨🇳', en: 'China', sw: 'Uchina', city: 'Beijing' },
  { code: 'JP', flag: '🇯🇵', en: 'Japan', sw: 'Japani', city: 'Tokyo' },
  { code: 'KR', flag: '🇰🇷', en: 'South Korea', sw: 'Korea Kusini', city: 'Seoul' },
  { code: 'AU', flag: '🇦🇺', en: 'Australia', sw: 'Australia', city: 'Sydney' },
  { code: 'NZ', flag: '🇳🇿', en: 'New Zealand', sw: 'Nyuzilandi', city: 'Auckland' },
];

const byCode = new Map(COUNTRIES.map((c) => [c.code, c]));

export function getCountry(code: string | null | undefined): Country | undefined {
  return code ? byCode.get(code) : undefined;
}

/** Countries sorted by English name, for the sign-up picker. */
export function sortedCountries(): Country[] {
  return [...COUNTRIES].sort((a, b) => a.en.localeCompare(b.en));
}
