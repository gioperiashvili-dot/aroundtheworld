const rawLocations = [
  ["tbilisi-georgia", "თბილისი", "Tbilisi", "საქართველო", "Georgia", "TBS", ["tbi"]],
  ["batumi-georgia", "ბათუმი", "Batumi", "საქართველო", "Georgia", "BUS", []],
  ["kutaisi-georgia", "ქუთაისი", "Kutaisi", "საქართველო", "Georgia", "KUT", []],
  ["istanbul-turkey", "სტამბოლი", "Istanbul", "თურქეთი", "Turkey", "IST", ["constantinople"]],
  ["antalya-turkey", "ანტალია", "Antalya", "თურქეთი", "Turkey", "AYT", []],
  ["dubai-uae", "დუბაი", "Dubai", "არაბთა გაერთიანებული საამიროები", "United Arab Emirates", "DXB", ["uae", "emirates"]],
  ["abu-dhabi-uae", "აბუ-დაბი", "Abu Dhabi", "არაბთა გაერთიანებული საამიროები", "United Arab Emirates", "AUH", ["uae", "emirates", "abu dhabi"]],
  ["yerevan-armenia", "ერევანი", "Yerevan", "სომხეთი", "Armenia", "EVN", []],
  ["baku-azerbaijan", "ბაქო", "Baku", "აზერბაიჯანი", "Azerbaijan", "GYD", []],
  ["tel-aviv-israel", "თელ-ავივი", "Tel Aviv", "ისრაელი", "Israel", "TLV", ["telaviv", "yafo"]],
  ["jerusalem-israel", "იერუსალიმი", "Jerusalem", "ისრაელი", "Israel", "", ["jrs"]],
  ["athens-greece", "ათენი", "Athens", "საბერძნეთი", "Greece", "ATH", []],
  ["rome-italy", "რომი", "Rome", "იტალია", "Italy", "FCO", []],
  ["milan-italy", "მილანი", "Milan", "იტალია", "Italy", "MXP", []],
  ["paris-france", "პარიზი", "Paris", "საფრანგეთი", "France", "CDG", []],
  ["berlin-germany", "ბერლინი", "Berlin", "გერმანია", "Germany", "BER", []],
  ["munich-germany", "მიუნხენი", "Munich", "გერმანია", "Germany", "MUC", []],
  ["london-united-kingdom", "ლონდონი", "London", "დიდი ბრიტანეთი", "United Kingdom", "LHR", ["uk", "britain", "great britain"]],
  ["amsterdam-netherlands", "ამსტერდამი", "Amsterdam", "ნიდერლანდები", "Netherlands", "AMS", ["holland"]],
  ["madrid-spain", "მადრიდი", "Madrid", "ესპანეთი", "Spain", "MAD", []],
  ["barcelona-spain", "ბარსელონა", "Barcelona", "ესპანეთი", "Spain", "BCN", []],
  ["vienna-austria", "ვენა", "Vienna", "ავსტრია", "Austria", "VIE", []],
  ["prague-czech-republic", "პრაღა", "Prague", "ჩეხეთი", "Czech Republic", "PRG", ["czechia"]],
  ["warsaw-poland", "ვარშავა", "Warsaw", "პოლონეთი", "Poland", "WAW", []],
  ["toronto-canada", "ტორონტო", "Toronto", "კანადა", "Canada", "YYZ", []],
  ["vancouver-canada", "ვანკუვერი", "Vancouver", "კანადა", "Canada", "YVR", []],
  ["montreal-canada", "მონრეალი", "Montreal", "კანადა", "Canada", "YUL", ["montréal"]],
  ["new-york-united-states", "ნიუ-იორკი", "New York", "აშშ", "United States", "JFK", ["nyc", "usa", "america", "united states of america"]],
  ["los-angeles-united-states", "ლოს-ანჯელესი", "Los Angeles", "აშშ", "United States", "LAX", ["la", "usa", "america"]],
  ["miami-united-states", "მაიამი", "Miami", "აშშ", "United States", "MIA", ["usa", "america"]],
  ["chicago-united-states", "ჩიკაგო", "Chicago", "აშშ", "United States", "ORD", ["usa", "america"]],
  ["tokyo-japan", "ტოკიო", "Tokyo", "იაპონია", "Japan", "HND", []],
  ["seoul-south-korea", "სეული", "Seoul", "სამხრეთ კორეა", "South Korea", "ICN", ["korea"]],
  ["bangkok-thailand", "ბანგკოკი", "Bangkok", "ტაილანდი", "Thailand", "BKK", []],
  ["singapore-singapore", "სინგაპური", "Singapore", "სინგაპური", "Singapore", "SIN", []],
  ["doha-qatar", "დოჰა", "Doha", "ყატარი", "Qatar", "DOH", []],
  ["riyadh-saudi-arabia", "რიადი", "Riyadh", "საუდის არაბეთი", "Saudi Arabia", "RUH", []],
];

export const locations = rawLocations.map(
  ([id, cityKa, cityEn, countryKa, countryEn, code, aliases]) => ({
    id,
    cityKa,
    cityEn,
    ka: cityKa,
    en: cityEn,
    countryKa,
    countryEn,
    code,
    aliases: [
      cityKa,
      cityEn,
      countryKa,
      countryEn,
      code,
      ...(aliases || []),
    ].filter(Boolean),
    providerValue: cityEn,
    flightValue: code || cityEn,
  })
);

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s._-]+/g, "");
}

function getSearchValues(location) {
  return [
    location.id,
    location.code,
    location.cityKa,
    location.cityEn,
    location.ka,
    location.en,
    location.countryKa,
    location.countryEn,
    location.providerValue,
    location.flightValue,
    ...(location.aliases || []),
  ].filter(Boolean);
}

export function getLocationLabel(location, language = "ka") {
  if (!location) {
    return "";
  }

  return language === "en"
    ? location.cityEn || location.en || location.cityKa || location.ka || ""
    : location.cityKa || location.ka || location.cityEn || location.en || "";
}

export function getLocationCountry(location, language = "ka") {
  if (!location) {
    return "";
  }

  return language === "en"
    ? location.countryEn || location.countryKa || ""
    : location.countryKa || location.countryEn || "";
}

export function getLocationMeta(location, language = "ka") {
  const country = getLocationCountry(location, language);
  return [location?.code, country].filter(Boolean).join(" · ");
}

export function findLocation(value) {
  const normalizedValue = normalize(value);

  if (!normalizedValue) {
    return null;
  }

  return (
    locations.find((location) =>
      getSearchValues(location).some((entry) => normalize(entry) === normalizedValue)
    ) || null
  );
}

export function getLocationSuggestions(query, limit = 6) {
  const normalizedQuery = normalize(query);

  if (normalizedQuery.length < 2) {
    return [];
  }

  return locations
    .filter((location) =>
      getSearchValues(location).some((entry) => normalize(entry).includes(normalizedQuery))
    )
    .slice(0, limit);
}

export function getFlightSearchValue(location, fallbackValue = "") {
  return location?.flightValue || location?.code || fallbackValue.trim();
}

export function getCitySearchValue(location, fallbackValue = "") {
  return location?.providerValue || location?.cityEn || location?.en || fallbackValue.trim();
}
