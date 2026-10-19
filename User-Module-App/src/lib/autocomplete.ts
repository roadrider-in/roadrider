/**
 * Smart Autocomplete Engine for RoadRider
 * Features:
 * - Regional places dataset covering up to 250 km around Lucknow (central UP hubs)
 * - Typo correction with Levenshtein / edit-distance & token fuzzy matching
 * - Strict 250 km radius filtering with distance calculation
 * - Real-time suggestion scoring
 */

import { computeDistanceKm, DEFAULT_CENTER, type LatLng } from "./googleMaps";
import type { Place } from "../data/demo";

export interface AutocompletePlace {
  id: string;
  label: string;
  line: string;
  area: string;
  city: string;
  category: "transit" | "mall" | "landmark" | "hospital" | "hub" | "city";
  icon: "pin" | "home";
  coords: { lat: number; lng: number };
  aliases?: string[];
}

export interface AutocompleteResult {
  id: string;
  label: string;
  line: string;
  area: string;
  city: string;
  icon: "pin" | "home";
  coords: { lat: number; lng: number };
  distanceKm: number;
  score: number;
  isTypoCorrection: boolean;
  correctedWord?: string;
  category: string;
}

/**
 * Curated regional places within 250 km of Lucknow
 */
export const REGIONAL_PLACES: AutocompletePlace[] = [
  // --- Lucknow Transit Hubs ---
  {
    id: "hub-charbagh",
    label: "Charbagh Railway Station",
    line: "Station Road, Preeti Nagar",
    area: "Charbagh, Lucknow",
    city: "Lucknow",
    category: "transit",
    icon: "pin",
    coords: { lat: 26.8315, lng: 80.9238 },
    aliases: ["charbag", "charbagh railway", "lucknow junction", "lko station", "charbag railway station", "nr station"],
  },
  {
    id: "hub-airport",
    label: "Chaudhary Charan Singh Airport (Amausi)",
    line: "Terminal 2, Kanpur Road",
    area: "Amausi, Lucknow",
    city: "Lucknow",
    category: "transit",
    icon: "pin",
    coords: { lat: 26.7606, lng: 80.8893 },
    aliases: ["airpot", "lucknow airport", "ccs airport", "amausi airport", "domestic airport", "terminal 2", "flight"],
  },
  {
    id: "hub-alambagh-bus",
    label: "Alambagh ISBT Bus Terminal",
    line: "Kanpur Road, Alambagh",
    area: "Alambagh, Lucknow",
    city: "Lucknow",
    category: "transit",
    icon: "pin",
    coords: { lat: 26.8152, lng: 80.9023 },
    aliases: ["alambag", "alambagh bus stand", "isbt lucknow", "kanpur road bus depot"],
  },
  {
    id: "hub-kaisarbagh-bus",
    label: "Kaisarbagh Bus Stand",
    line: "Kaisarbagh Heritage Circle",
    area: "Kaisarbagh, Lucknow",
    city: "Lucknow",
    category: "transit",
    icon: "pin",
    coords: { lat: 26.8524, lng: 80.9329 },
    aliases: ["kaiserbagh", "kesarbagh", "kaisarbagh roadways"],
  },
  {
    id: "hub-gomti-nagar-stn",
    label: "Gomti Nagar Railway Station",
    line: "Vibhuti Khand",
    area: "Gomti Nagar, Lucknow",
    city: "Lucknow",
    category: "transit",
    icon: "pin",
    coords: { lat: 26.861, lng: 81.0112 },
    aliases: ["gomtinagr", "gomti nagar stn", "vibhuti khand station"],
  },
  {
    id: "hub-badshahnagar",
    label: "Badshahnagar Railway Station",
    line: "Mahanagar Railway Colony",
    area: "Mahanagar, Lucknow",
    city: "Lucknow",
    category: "transit",
    icon: "pin",
    coords: { lat: 26.8778, lng: 80.966 },
    aliases: ["badshanagar", "badshah nagar", "mahanagar station"],
  },

  // --- Shopping & Major Landmarks in Lucknow ---
  {
    id: "hub-palassio",
    label: "Phoenix Palassio Mall",
    line: "Sector 7, Amar Shaheed Path",
    area: "Gomti Nagar Extension, Lucknow",
    city: "Lucknow",
    category: "mall",
    icon: "pin",
    coords: { lat: 26.8123, lng: 81.0242 },
    aliases: ["palasio", "palacio", "phoenix palacio", "palassio mall", "shaheed path mall"],
  },
  {
    id: "hub-lulu-mall",
    label: "Lulu Mall Lucknow",
    line: "Amar Shaheed Path, Golf City",
    area: "Sushant Golf City, Lucknow",
    city: "Lucknow",
    category: "mall",
    icon: "pin",
    coords: { lat: 26.7725, lng: 81.0022 },
    aliases: ["lulu", "lulu hypermarket", "golf city mall"],
  },
  {
    id: "hub-hazratganj",
    label: "Hazratganj Metro & Market",
    line: "Mahatma Gandhi Marg",
    area: "Hazratganj, Lucknow",
    city: "Lucknow",
    category: "landmark",
    icon: "pin",
    coords: { lat: 26.8467, lng: 80.9462 },
    aliases: ["hazratgnj", "ganj", "hazrat ganj", "love lane", "janpath"],
  },
  {
    id: "hub-aminabad",
    label: "Aminabad Bazaar",
    line: "Old Lucknow Market Corridor",
    area: "Aminabad, Lucknow",
    city: "Lucknow",
    category: "landmark",
    icon: "pin",
    coords: { lat: 26.8437, lng: 80.9262 },
    aliases: ["aminabaad", "tunday kababi", "gadbadjhala", "old market"],
  },
  {
    id: "hub-wave-mall",
    label: "Wave Mall & Multiplex",
    line: "TC 54 Vibhuti Khand",
    area: "Gomti Nagar, Lucknow",
    city: "Lucknow",
    category: "mall",
    icon: "pin",
    coords: { lat: 26.8665, lng: 81.0063 },
    aliases: ["wave", "wave cinema", "wave gomti nagar"],
  },
  {
    id: "hub-phoenix-united",
    label: "Phoenix United Mall",
    line: "Sector B, Bargawan, Alambagh",
    area: "Alambagh, Lucknow",
    city: "Lucknow",
    category: "mall",
    icon: "pin",
    coords: { lat: 26.7971, lng: 80.8996 },
    aliases: ["phoenix alambagh", "united mall", "bargawan"],
  },
  {
    id: "hub-bara-imambara",
    label: "Bara Imambara & Bhool Bhulaiya",
    line: "Machchhi Bhavan Heritage Area",
    area: "Husainabad, Lucknow",
    city: "Lucknow",
    category: "landmark",
    icon: "pin",
    coords: { lat: 26.8693, lng: 80.913 },
    aliases: ["imambara", "bhool bhulaiya", "bada imambada", "asafi imambara"],
  },
  {
    id: "hub-chhota-imambara",
    label: "Chhota Imambara",
    line: "Tahsiganj, Husainabad",
    area: "Old Lucknow",
    city: "Lucknow",
    category: "landmark",
    icon: "pin",
    coords: { lat: 26.8738, lng: 80.9042 },
    aliases: ["chota imambada", "husainabad imambara"],
  },
  {
    id: "hub-janeshwar-mishra",
    label: "Janeshwar Mishra Park",
    line: "Gomti Nagar Extension",
    area: "Gomti Nagar, Lucknow",
    city: "Lucknow",
    category: "landmark",
    icon: "pin",
    coords: { lat: 26.837, lng: 81.0118 },
    aliases: ["janeshwar park", "mishra park", "asia largest park"],
  },
  {
    id: "hub-ambedkar-park",
    label: "Ambedkar Memorial Park",
    line: "Vipin Khand",
    area: "Gomti Nagar, Lucknow",
    city: "Lucknow",
    category: "landmark",
    icon: "pin",
    coords: { lat: 26.8519, lng: 80.9785 },
    aliases: ["ambedkar memorial", "vipin khand park"],
  },
  {
    id: "hub-chowk",
    label: "Chowk Heritage Market",
    line: "Victoria Street, Chowk",
    area: "Old Lucknow",
    city: "Lucknow",
    category: "landmark",
    icon: "pin",
    coords: { lat: 26.865, lng: 80.9015 },
    aliases: ["chouk", "chowk lucknow", "chikan market", "gol darwaza"],
  },
  {
    id: "hub-indira-nagar",
    label: "Indira Nagar Central Market",
    line: "Bhootnath Market Corridor",
    area: "Indira Nagar, Lucknow",
    city: "Lucknow",
    category: "hub",
    icon: "pin",
    coords: { lat: 26.884, lng: 80.995 },
    aliases: ["indiranagr", "bhootnath", "bhootnath market", "indira nagar metro"],
  },
  {
    id: "hub-jankipuram",
    label: "Jankipuram Extension",
    line: "Engineering College Chauraha",
    area: "Jankipuram, Lucknow",
    city: "Lucknow",
    category: "hub",
    icon: "pin",
    coords: { lat: 26.912, lng: 80.948 },
    aliases: ["janki puram", "iet chauraha", "aktu university"],
  },
  {
    id: "hub-iim-lucknow",
    label: "IIM Lucknow Campus",
    line: "Prabandh Nagar, IIM Road",
    area: "IIM Road, Lucknow",
    city: "Lucknow",
    category: "hub",
    icon: "pin",
    coords: { lat: 26.924, lng: 80.892 },
    aliases: ["iim", "iim road", "prabandh nagar"],
  },
  {
    id: "hub-medanta",
    label: "Medanta Hospital Lucknow",
    line: "Sector B, Pocket 1, Amar Shaheed Path",
    area: "Sushant Golf City, Lucknow",
    city: "Lucknow",
    category: "hospital",
    icon: "pin",
    coords: { lat: 26.786, lng: 81.012 },
    aliases: ["medanta", "medanta hospital"],
  },
  {
    id: "hub-sgpgi",
    label: "SGPGIMS Hospital (SGPGI)",
    line: "Raebareli Road",
    area: "Vrindavan Yojna, Lucknow",
    city: "Lucknow",
    category: "hospital",
    icon: "pin",
    coords: { lat: 26.745, lng: 80.939 },
    aliases: ["pgi", "sgpgi", "sanjay gandhi pgi"],
  },
  {
    id: "hub-kgmu",
    label: "King George's Medical University (KGMU)",
    line: "Shah Mina Road, Chowk",
    area: "Chowk, Lucknow",
    city: "Lucknow",
    category: "hospital",
    icon: "pin",
    coords: { lat: 26.868, lng: 80.919 },
    aliases: ["kgmu", "kgmc", "medical college lucknow"],
  },

  // --- Regional Cities & Hubs within 250 km Radius ---
  {
    id: "reg-barabanki",
    label: "Barabanki Junction & Market",
    line: "Faizabad Road Highway",
    area: "Barabanki, Uttar Pradesh",
    city: "Barabanki",
    category: "city",
    icon: "pin",
    coords: { lat: 26.9284, lng: 81.1852 },
    aliases: ["barabnki", "dewa sharif", "barabanki stn"],
  },
  {
    id: "reg-unnao",
    label: "Unnao Junction Railway Station",
    line: "Civil Lines, Station Road",
    area: "Unnao, Uttar Pradesh",
    city: "Unnao",
    category: "city",
    icon: "pin",
    coords: { lat: 26.5458, lng: 80.4878 },
    aliases: ["unao", "unnao stn", "shuklaganj"],
  },
  {
    id: "reg-kanpur-central",
    label: "Kanpur Central Railway Station",
    line: "Station Road, Cantonment",
    area: "Kanpur, Uttar Pradesh",
    city: "Kanpur",
    category: "city",
    icon: "pin",
    coords: { lat: 26.4539, lng: 80.3512 },
    aliases: ["kanpr", "kanpur", "kanpur central", "cnb", "ghanta ghar kanpur"],
  },
  {
    id: "reg-kanpur-mall",
    label: "Z Square Mall Kanpur",
    line: "Mall Road, Civil Lines",
    area: "Kanpur, Uttar Pradesh",
    city: "Kanpur",
    category: "mall",
    icon: "pin",
    coords: { lat: 26.472, lng: 80.354 },
    aliases: ["z square", "z-square", "kanpur mall road"],
  },
  {
    id: "reg-kanpur-iit",
    label: "IIT Kanpur Campus",
    line: "Kalyanpur, GT Road",
    area: "Kanpur, Uttar Pradesh",
    city: "Kanpur",
    category: "hub",
    icon: "pin",
    coords: { lat: 26.5123, lng: 80.2329 },
    aliases: ["iit kanpur", "kalyanpur"],
  },
  {
    id: "reg-sitapur",
    label: "Sitapur Junction & Eye Hospital",
    line: "Station Road, Civil Lines",
    area: "Sitapur, Uttar Pradesh",
    city: "Sitapur",
    category: "city",
    icon: "pin",
    coords: { lat: 27.568, lng: 80.682 },
    aliases: ["sitapr", "sitapur stn", "naimisharanya", "neemsar"],
  },
  {
    id: "reg-raebareli",
    label: "Raebareli Junction & AIIMS",
    line: "Station Road, Civil Lines",
    area: "Raebareli, Uttar Pradesh",
    city: "Raebareli",
    category: "city",
    icon: "pin",
    coords: { lat: 26.228, lng: 81.242 },
    aliases: ["raebareily", "rae bareli", "aiims raebareli"],
  },
  {
    id: "reg-hardoi",
    label: "Hardoi Railway Station",
    line: "Cinema Chauraha, Civil Lines",
    area: "Hardoi, Uttar Pradesh",
    city: "Hardoi",
    category: "city",
    icon: "pin",
    coords: { lat: 27.398, lng: 80.128 },
    aliases: ["hardoy", "sandila", "hardoi stn"],
  },
  {
    id: "reg-ayodhya-temple",
    label: "Shri Ram Janmabhoomi Mandir (Ayodhya)",
    line: "Ramkot, Ram Janmabhoomi Path",
    area: "Ayodhya, Uttar Pradesh",
    city: "Ayodhya",
    category: "landmark",
    icon: "pin",
    coords: { lat: 26.7956, lng: 82.1944 },
    aliases: ["ayodya", "ram mandir", "ayodhya dham", "hanumangarhi", "saryu ghat", "ram janmabhoomi"],
  },
  {
    id: "reg-ayodhya-stn",
    label: "Ayodhya Dham Junction & Airport",
    line: "Station Road, Dharmapath",
    area: "Ayodhya, Uttar Pradesh",
    city: "Ayodhya",
    category: "transit",
    icon: "pin",
    coords: { lat: 26.779, lng: 82.203 },
    aliases: ["ayodhya stn", "faizabad junction", "ayodhya airport", "valmiki airport"],
  },
  {
    id: "reg-sultanpur",
    label: "Sultanpur Junction Railway Station",
    line: "Civil Lines, Station Road",
    area: "Sultanpur, Uttar Pradesh",
    city: "Sultanpur",
    category: "city",
    icon: "pin",
    coords: { lat: 26.264, lng: 82.072 },
    aliases: ["sultanpr", "sultanpur stn", "knit sultanpur"],
  },
  {
    id: "reg-fatehpur",
    label: "Fatehpur Railway Station",
    line: "GT Road, Civil Lines",
    area: "Fatehpur, Uttar Pradesh",
    city: "Fatehpur",
    category: "city",
    icon: "pin",
    coords: { lat: 25.932, lng: 80.814 },
    aliases: ["fatehpr", "fatehpur stn"],
  },
  {
    id: "reg-lakhimpur",
    label: "Lakhimpur Kheri Junction",
    line: "Station Road, Civil Lines",
    area: "Lakhimpur, Uttar Pradesh",
    city: "Lakhimpur",
    category: "city",
    icon: "pin",
    coords: { lat: 27.948, lng: 80.776 },
    aliases: ["kheri", "lakhimpur kheri", "dudhwa gateway"],
  },
  {
    id: "reg-bahraich",
    label: "Bahraich Railway Station",
    line: "Station Road, Dargah Corridor",
    area: "Bahraich, Uttar Pradesh",
    city: "Bahraich",
    category: "city",
    icon: "pin",
    coords: { lat: 27.574, lng: 81.597 },
    aliases: ["bahraich stn", "dargah sharif bahraich"],
  },
  {
    id: "reg-gonda",
    label: "Gonda Junction Railway Station",
    line: "Station Road, Civil Lines",
    area: "Gonda, Uttar Pradesh",
    city: "Gonda",
    category: "city",
    icon: "pin",
    coords: { lat: 27.133, lng: 81.961 },
    aliases: ["gonda stn", "gonda junction"],
  },
  {
    id: "reg-kannauj",
    label: "Kannauj Perfume Hub & Station",
    line: "GT Road, Itr Market",
    area: "Kannauj, Uttar Pradesh",
    city: "Kannauj",
    category: "city",
    icon: "pin",
    coords: { lat: 27.052, lng: 79.914 },
    aliases: ["kanauj", "itr city", "perfume capital", "kannauj stn"],
  },
  {
    id: "reg-pratapgarh",
    label: "Pratapgarh Junction Railway Station",
    line: "Bela Pratapgarh, Station Road",
    area: "Pratapgarh, Uttar Pradesh",
    city: "Pratapgarh",
    category: "city",
    icon: "pin",
    coords: { lat: 25.901, lng: 81.996 },
    aliases: ["pratapgarh", "bela pratapgarh"],
  },
  {
    id: "reg-prayagraj-junction",
    label: "Prayagraj Junction (Allahabad)",
    line: "Leader Road, Civil Lines",
    area: "Prayagraj, Uttar Pradesh",
    city: "Prayagraj",
    category: "city",
    icon: "pin",
    coords: { lat: 25.4484, lng: 81.8333 },
    aliases: ["prayag", "allahabad", "alld", "prayagraj stn", "civil lines prayagraj", "high court allahabad"],
  },
  {
    id: "reg-prayagraj-sangam",
    label: "Triveni Sangam & Fort (Prayagraj)",
    line: "Daraganj, Sangam Ghat",
    area: "Prayagraj, Uttar Pradesh",
    city: "Prayagraj",
    category: "landmark",
    icon: "pin",
    coords: { lat: 25.428, lng: 81.884 },
    aliases: ["sangam", "kumbh ghat", "triveni sangam"],
  },
  {
    id: "reg-shahjahanpur",
    label: "Shahjahanpur Junction",
    line: "Station Road, Civil Lines",
    area: "Shahjahanpur, Uttar Pradesh",
    city: "Shahjahanpur",
    category: "city",
    icon: "pin",
    coords: { lat: 27.882, lng: 79.911 },
    aliases: ["shahjahanpr", "spn"],
  },
  {
    id: "reg-amethi",
    label: "Amethi & Gauriganj Station",
    line: "Station Road",
    area: "Amethi, Uttar Pradesh",
    city: "Amethi",
    category: "city",
    icon: "pin",
    coords: { lat: 26.152, lng: 81.815 },
    aliases: ["gauriganj", "amethi stn"],
  },
];

/**
 * Standard Damerau-Levenshtein / Levenshtein distance for typo correction
 */
export function levenshteinDistance(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const matrix: number[][] = [];
  for (let i = 0; i <= al; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= bl; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let min = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );

      // Transposition
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        min = Math.min(min, matrix[i - 2][j - 2] + 1);
      }

      matrix[i][j] = min;
    }
  }

  return matrix[al][bl];
}

/**
 * Normalize search string
 */
function cleanQuery(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Smart Autocomplete with Typo Correction & 250 km Radius check
 * @param query user typed string
 * @param referenceCoords base point (GPS or default center) to compute distance
 * @param maxRadiusKm default 250 km
 */
export function searchSmartPlaces(
  query: string,
  referenceCoords: LatLng = DEFAULT_CENTER,
  maxRadiusKm: number = 250
): AutocompleteResult[] {
  const q = cleanQuery(query);
  const qTokens = q.split(" ").filter((t) => t.length > 0);

  const results: AutocompleteResult[] = [];

  for (const place of REGIONAL_PLACES) {
    // 1. Calculate distance from reference center
    const distanceKm = computeDistanceKm(referenceCoords, place.coords);

    // 2. Strict 250 km Radius Constraint
    if (distanceKm > maxRadiusKm) {
      continue;
    }

    // If query is empty, return top regional places sorted by distance
    if (q.length === 0) {
      results.push({
        id: place.id,
        label: place.label,
        line: place.line,
        area: place.area,
        city: place.city,
        icon: place.icon,
        coords: place.coords,
        distanceKm,
        score: Math.max(10, 100 - distanceKm),
        isTypoCorrection: false,
        category: place.category,
      });
      continue;
    }

    // 3. String & Token matching against label, line, area, aliases
    const targetStrings = [
      cleanQuery(place.label),
      cleanQuery(place.area),
      cleanQuery(place.line),
      cleanQuery(place.city),
      ...(place.aliases || []).map(cleanQuery),
    ];

    let highestScore = 0;
    let isTypo = false;
    let matchedWord: string | undefined;

    // Check exact substring matches
    for (const target of targetStrings) {
      if (target.includes(q)) {
        // Starts with has higher boost
        const boost = target.startsWith(q) ? 50 : 20;
        const score = 100 + boost - Math.min(30, target.length - q.length);
        if (score > highestScore) {
          highestScore = score;
          isTypo = false;
        }
      }
    }

    // Check individual token matches
    for (const qTok of qTokens) {
      if (qTok.length < 2) continue;

      for (const target of targetStrings) {
        const targetWords = target.split(" ");
        for (const tWord of targetWords) {
          if (tWord.startsWith(qTok)) {
            const score = 80 + (qTok.length / tWord.length) * 20;
            if (score > highestScore) {
              highestScore = score;
              isTypo = false;
            }
          } else if (tWord.includes(qTok)) {
            const score = 60;
            if (score > highestScore) {
              highestScore = score;
              isTypo = false;
            }
          } else if (qTok.length >= 3) {
            // Typo-correction check via Levenshtein
            const maxAllowedDist = qTok.length <= 4 ? 1 : qTok.length <= 7 ? 2 : 3;
            const dist = levenshteinDistance(qTok, tWord);
            if (dist <= maxAllowedDist) {
              // Scaled typo score
              const score = 75 - dist * 15;
              if (score > highestScore) {
                highestScore = score;
                isTypo = true;
                matchedWord = tWord;
              }
            }
          }
        }
      }
    }

    // If query as a whole is >= 4 chars, check typo against full label words or aliases
    if (q.length >= 4 && highestScore < 50) {
      for (const target of targetStrings) {
        const dist = levenshteinDistance(q, target);
        const maxDist = Math.min(3, Math.floor(q.length / 2));
        if (dist <= maxDist) {
          const score = 70 - dist * 12;
          if (score > highestScore) {
            highestScore = score;
            isTypo = true;
            matchedWord = target;
          }
        }
      }
    }

    // If score passes threshold, add to results
    if (highestScore > 35) {
      // Slightly penalize very far locations in tiebreaking
      const finalScore = highestScore * 10 - distanceKm * 0.2;
      results.push({
        id: place.id,
        label: place.label,
        line: place.line,
        area: place.area,
        city: place.city,
        icon: place.icon,
        coords: place.coords,
        distanceKm,
        score: finalScore,
        isTypoCorrection: isTypo,
        correctedWord: isTypo ? matchedWord : undefined,
        category: place.category,
      });
    }
  }

  // Sort descending by score, tiebreak by distance
  results.sort((a, b) => {
    if (Math.abs(b.score - a.score) > 5) {
      return b.score - a.score;
    }
    return a.distanceKm - b.distanceKm;
  });

  return results.slice(0, 15);
}
