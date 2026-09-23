import { LocationInfo } from "../types.js";
import { appCache } from "../cache.js";

export interface IGeocodingProvider {
  searchLocations(query: string, count?: number): Promise<LocationInfo[]>;
  resolveLocation(query: string): Promise<LocationInfo | null>;
}

// Common state/territory abbreviations for enhanced geocoding qualifier matching
export const STATE_ABBREVIATIONS: Record<string, string> = {
  // Indian States & Union Territories
  mp: "madhya pradesh",
  mh: "maharashtra",
  up: "uttar pradesh",
  dl: "delhi",
  rj: "rajasthan",
  gj: "gujarat",
  ka: "karnataka",
  tn: "tamil nadu",
  kl: "kerala",
  wb: "west bengal",
  pb: "punjab",
  hr: "haryana",
  ts: "telangana",
  tg: "telangana",
  ap: "andhra pradesh",
  br: "bihar",
  od: "odisha",
  or: "odisha",
  as: "assam",
  ga: "goa",
  hp: "himachal pradesh",
  jh: "jharkhand",
  cg: "chhattisgarh",
  ch: "chandigarh",
  uk: "uttarakhand",
  ut: "uttarakhand",
  jk: "jammu and kashmir",
  la: "ladakh",
  py: "puducherry",
  sk: "sikkim",
  tr: "tripura",
  ml: "meghalaya",
  mn: "manipur",
  nl: "nagaland",
  mz: "mizoram",
  ar: "arunachal pradesh",

  // US States & Territories
  al: "alabama", ak: "alaska", az: "arizona", ark: "arkansas", ca: "california",
  co: "colorado", ct: "connecticut", de: "delaware", fl: "florida", ga_us: "georgia",
  hi: "hawaii", id: "idaho", il: "illinois", in_us: "indiana", ia: "iowa",
  ks: "kansas", ky: "kentucky", la_us: "louisiana", me: "maine", md: "maryland",
  ma: "massachusetts", mi: "michigan", mn_us: "minnesota", ms: "mississippi", mo: "missouri",
  mt: "montana", ne: "nebraska", nv: "nevada", nh: "new hampshire", nj: "new jersey",
  nm: "new mexico", ny: "new york", nc: "north carolina", nd: "north dakota", oh: "ohio",
  ok: "oklahoma", or_us: "oregon", pa: "pennsylvania", ri: "rhode island", sc: "south carolina",
  sd: "south dakota", tenn: "tennessee", tx: "texas", utah: "utah", vt: "vermont",
  va: "virginia", wa: "washington", wv: "west virginia", wi: "wisconsin", wy: "wyoming",
  dc: "district of columbia",

  // Canadian Provinces
  on: "ontario", qc: "quebec", bc: "british columbia", ab: "alberta",
  mb: "manitoba", sask: "saskatchewan", ns: "nova scotia", nb: "new brunswick",

  // Australian States
  nsw: "new south wales", vic: "victoria", qld: "queensland",
  sa: "south australia", tas: "tasmania", act: "australian capital territory", nt: "northern territory",

  // Common country aliases
  uk_country: "united kingdom",
  usa: "united states",
  us: "united states",
  uae: "united arab emirates",
  ind: "india",
  in: "india",
};

// Common Indic script transliterations to English
const INDIC_CITY_TRANSLITERATIONS: Record<string, string> = {
  // Cities
  "भोपाल": "Bhopal",
  "मुंबई": "Mumbai",
  "बम्बई": "Mumbai",
  "दिल्ली": "Delhi",
  "नई दिल्ली": "New Delhi",
  "सतना": "Satna",
  "इंदौर": "Indore",
  "ग्वालियर": "Gwalior",
  "जबलपुर": "Jabalpur",
  "उज्जैन": "Ujjain",
  "अहमदाबाद": "Ahmedabad",
  "અમદાવાદ": "Ahmedabad",
  "सूरत": "Surat",
  "વડોદરા": "Vadodara",
  "पुणे": "Pune",
  "नागपुर": "Nagpur",
  "नासिक": "Nashik",
  "ठाणे": "Thane",
  "कोलकाता": "Kolkata",
  "चेन्नई": "Chennai",
  "बेंगलुरु": "Bengaluru",
  "बैंगलोर": "Bengaluru",
  "બેંગલુરુ": "Bengaluru",
  "हैदराबाद": "Hyderabad",
  "जयपुर": "Jaipur",
  "जोधपुर": "Jodhpur",
  "उदयपुर": "Udaipur",
  "लखनऊ": "Lucknow",
  "कानपुर": "Kanpur",
  "वाराणसी": "Varanasi",
  "काशी": "Varanasi",
  "बनारस": "Varanasi",
  "प्रयागराज": "Prayagraj",
  "इलाहाबाद": "Prayagraj",
  "आगरा": "Agra",
  "पटना": "Patna",
  "चंडीगढ़": "Chandigarh",
  "शिमला": "Shimla",
  "देहरादून": "Dehradun",
  "टोक्यो": "Tokyo",
  "लंदन": "London",
  "न्यूयॉर्क": "New York",
  "पेरिस": "Paris",
  // States
  "मध्य प्रदेश": "Madhya Pradesh",
  "मध्यप्रदेश": "Madhya Pradesh",
  "महाराष्ट्र": "Maharashtra",
  "उत्तर प्रदेश": "Uttar Pradesh",
  "उत्तरप्रदेश": "Uttar Pradesh",
  "राजस्थान": "Rajasthan",
  "गुजरात": "Gujarat",
  "ગુજરાત": "Gujarat",
  "कर्नाटक": "Karnataka",
  "तमिलनाडु": "Tamil Nadu",
  "केरल": "Kerala",
  "पंजाब": "Punjab",
  "हरियाणा": "Haryana",
  "बिहार": "Bihar",
  "पश्चिम बंगाल": "West Bengal",
  "ओडिशा": "Odisha",
  "उड़ीसा": "Odisha",
  "असम": "Assam",
  "गोवा": "Goa",
  "हिमाचल प्रदेश": "Himachal Pradesh",
  "उत्तराखंड": "Uttarakhand",
  "छत्तीसगढ़": "Chhattisgarh",
  "झारखंड": "Jharkhand",
  "तेलंगाना": "Telangana",
  "आंध्र प्रदेश": "Andhra Pradesh",
};

interface SupportedState {
  name: string;
  admin1: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  aliases: string[];
  topCities?: LocationInfo[];
}

// Curated supported states, territories, and provinces with accurate geographical coordinates
const SUPPORTED_STATES: SupportedState[] = [
  // --- Indian States and UTs ---
  {
    name: "Madhya Pradesh",
    admin1: "Madhya Pradesh",
    country: "India",
    countryCode: "IN",
    latitude: 23.4733,
    longitude: 77.9479,
    timezone: "Asia/Kolkata",
    aliases: ["mp", "madhya pradesh", "madhyapradesh", "mp state", "मध्य प्रदेश", "मध्यप्रदेश"],
    topCities: [
      { name: "Bhopal", admin1: "Madhya Pradesh", admin2: "Bhopal District", country: "India", countryCode: "IN", latitude: 23.2547, longitude: 77.4029, timezone: "Asia/Kolkata", population: 1798218 },
      { name: "Indore", admin1: "Madhya Pradesh", admin2: "Indore district", country: "India", countryCode: "IN", latitude: 22.7179, longitude: 75.8333, timezone: "Asia/Kolkata", population: 1994397 },
      { name: "Satna", admin1: "Madhya Pradesh", admin2: "Satna", country: "India", countryCode: "IN", latitude: 24.5773, longitude: 80.8272, timezone: "Asia/Kolkata", population: 282977 },
      { name: "Jabalpur", admin1: "Madhya Pradesh", admin2: "Jabalpur District", country: "India", countryCode: "IN", latitude: 23.1815, longitude: 79.9864, timezone: "Asia/Kolkata", population: 1267564 },
      { name: "Gwalior", admin1: "Madhya Pradesh", admin2: "Gwalior District", country: "India", countryCode: "IN", latitude: 26.2183, longitude: 78.1828, timezone: "Asia/Kolkata", population: 1069276 },
      { name: "Ujjain", admin1: "Madhya Pradesh", admin2: "Ujjain District", country: "India", countryCode: "IN", latitude: 23.1765, longitude: 75.7885, timezone: "Asia/Kolkata", population: 515215 },
    ],
  },
  {
    name: "Maharashtra",
    admin1: "Maharashtra",
    country: "India",
    countryCode: "IN",
    latitude: 19.7515,
    longitude: 75.7139,
    timezone: "Asia/Kolkata",
    aliases: ["mh", "maharashtra", "महाराष्ट्र"],
    topCities: [
      { name: "Mumbai", admin1: "Maharashtra", admin2: "Mumbai City", country: "India", countryCode: "IN", latitude: 19.0728, longitude: 72.8826, timezone: "Asia/Kolkata", population: 12691836 },
      { name: "Pune", admin1: "Maharashtra", admin2: "Pune District", country: "India", countryCode: "IN", latitude: 18.5204, longitude: 73.8567, timezone: "Asia/Kolkata", population: 3124458 },
      { name: "Nagpur", admin1: "Maharashtra", admin2: "Nagpur District", country: "India", countryCode: "IN", latitude: 21.1458, longitude: 79.0882, timezone: "Asia/Kolkata", population: 2405665 },
      { name: "Nashik", admin1: "Maharashtra", admin2: "Nashik District", country: "India", countryCode: "IN", latitude: 19.9975, longitude: 73.7898, timezone: "Asia/Kolkata", population: 1486053 },
      { name: "Thane", admin1: "Maharashtra", admin2: "Thane District", country: "India", countryCode: "IN", latitude: 19.2183, longitude: 72.9781, timezone: "Asia/Kolkata", population: 1841488 },
    ],
  },
  {
    name: "Delhi",
    admin1: "National Capital Territory of Delhi",
    country: "India",
    countryCode: "IN",
    latitude: 28.6139,
    longitude: 77.2090,
    timezone: "Asia/Kolkata",
    aliases: ["dl", "delhi", "nct of delhi", "national capital territory of delhi", "दिल्ली", "नई दिल्ली"],
    topCities: [
      { name: "Delhi", admin1: "National Capital Territory of Delhi", country: "India", countryCode: "IN", latitude: 28.6519, longitude: 77.2315, timezone: "Asia/Kolkata", population: 11034555 },
      { name: "New Delhi", admin1: "National Capital Territory of Delhi", country: "India", countryCode: "IN", latitude: 28.6139, longitude: 77.2090, timezone: "Asia/Kolkata", population: 249998 },
    ],
  },
  {
    name: "Uttar Pradesh",
    admin1: "Uttar Pradesh",
    country: "India",
    countryCode: "IN",
    latitude: 26.8467,
    longitude: 80.9462,
    timezone: "Asia/Kolkata",
    aliases: ["up", "uttar pradesh", "uttarpradesh", "उत्तर प्रदेश", "उत्तरप्रदेश"],
    topCities: [
      { name: "Lucknow", admin1: "Uttar Pradesh", country: "India", countryCode: "IN", latitude: 26.8467, longitude: 80.9462, timezone: "Asia/Kolkata", population: 2817105 },
      { name: "Kanpur", admin1: "Uttar Pradesh", country: "India", countryCode: "IN", latitude: 26.4499, longitude: 80.3319, timezone: "Asia/Kolkata", population: 2767031 },
      { name: "Varanasi", admin1: "Uttar Pradesh", country: "India", countryCode: "IN", latitude: 25.3176, longitude: 82.9739, timezone: "Asia/Kolkata", population: 1201815 },
      { name: "Agra", admin1: "Uttar Pradesh", country: "India", countryCode: "IN", latitude: 27.1767, longitude: 78.0081, timezone: "Asia/Kolkata", population: 1585704 },
      { name: "Prayagraj", admin1: "Uttar Pradesh", country: "India", countryCode: "IN", latitude: 25.4358, longitude: 81.8463, timezone: "Asia/Kolkata", population: 1168385 },
      { name: "Noida", admin1: "Uttar Pradesh", country: "India", countryCode: "IN", latitude: 28.5355, longitude: 77.3910, timezone: "Asia/Kolkata", population: 637272 },
    ],
  },
  {
    name: "Rajasthan",
    admin1: "Rajasthan",
    country: "India",
    countryCode: "IN",
    latitude: 27.0238,
    longitude: 74.2179,
    timezone: "Asia/Kolkata",
    aliases: ["rj", "rajasthan", "राजस्थान"],
    topCities: [
      { name: "Jaipur", admin1: "Rajasthan", country: "India", countryCode: "IN", latitude: 26.9124, longitude: 75.7873, timezone: "Asia/Kolkata", population: 3046163 },
      { name: "Jodhpur", admin1: "Rajasthan", country: "India", countryCode: "IN", latitude: 26.2389, longitude: 73.0243, timezone: "Asia/Kolkata", population: 1033756 },
      { name: "Udaipur", admin1: "Rajasthan", country: "India", countryCode: "IN", latitude: 24.5854, longitude: 73.7125, timezone: "Asia/Kolkata", population: 451100 },
      { name: "Kota", admin1: "Rajasthan", country: "India", countryCode: "IN", latitude: 25.2138, longitude: 75.8648, timezone: "Asia/Kolkata", population: 1001694 },
    ],
  },
  {
    name: "Gujarat",
    admin1: "Gujarat",
    country: "India",
    countryCode: "IN",
    latitude: 22.2587,
    longitude: 71.1924,
    timezone: "Asia/Kolkata",
    aliases: ["gj", "gujarat", "gujrat", "गुजरात", "ગુજરાત"],
    topCities: [
      { name: "Ahmedabad", admin1: "Gujarat", country: "India", countryCode: "IN", latitude: 23.0225, longitude: 72.5714, timezone: "Asia/Kolkata", population: 5577940 },
      { name: "Surat", admin1: "Gujarat", country: "India", countryCode: "IN", latitude: 21.1702, longitude: 72.8311, timezone: "Asia/Kolkata", population: 4467797 },
      { name: "Vadodara", admin1: "Gujarat", country: "India", countryCode: "IN", latitude: 22.3072, longitude: 73.1812, timezone: "Asia/Kolkata", population: 1670806 },
      { name: "Rajkot", admin1: "Gujarat", country: "India", countryCode: "IN", latitude: 22.3039, longitude: 70.8022, timezone: "Asia/Kolkata", population: 1286678 },
      { name: "Gandhinagar", admin1: "Gujarat", country: "India", countryCode: "IN", latitude: 23.2156, longitude: 72.6369, timezone: "Asia/Kolkata", population: 292797 },
    ],
  },
  {
    name: "Karnataka",
    admin1: "Karnataka",
    country: "India",
    countryCode: "IN",
    latitude: 15.3173,
    longitude: 75.7139,
    timezone: "Asia/Kolkata",
    aliases: ["ka", "karnataka", "कर्नाटक"],
    topCities: [
      { name: "Bengaluru", admin1: "Karnataka", country: "India", countryCode: "IN", latitude: 12.9716, longitude: 77.5946, timezone: "Asia/Kolkata", population: 8443675 },
      { name: "Mysuru", admin1: "Karnataka", country: "India", countryCode: "IN", latitude: 12.2958, longitude: 76.6394, timezone: "Asia/Kolkata", population: 920550 },
      { name: "Hubballi", admin1: "Karnataka", country: "India", countryCode: "IN", latitude: 15.3647, longitude: 75.1240, timezone: "Asia/Kolkata", population: 943788 },
      { name: "Mangaluru", admin1: "Karnataka", country: "India", countryCode: "IN", latitude: 12.9141, longitude: 74.8560, timezone: "Asia/Kolkata", population: 499487 },
    ],
  },
  {
    name: "Tamil Nadu",
    admin1: "Tamil Nadu",
    country: "India",
    countryCode: "IN",
    latitude: 11.1271,
    longitude: 78.6569,
    timezone: "Asia/Kolkata",
    aliases: ["tn", "tamil nadu", "tamilnadu", "तमिलनाडु"],
    topCities: [
      { name: "Chennai", admin1: "Tamil Nadu", country: "India", countryCode: "IN", latitude: 13.0827, longitude: 80.2707, timezone: "Asia/Kolkata", population: 4681087 },
      { name: "Coimbatore", admin1: "Tamil Nadu", country: "India", countryCode: "IN", latitude: 11.0168, longitude: 76.9558, timezone: "Asia/Kolkata", population: 1050721 },
      { name: "Madurai", admin1: "Tamil Nadu", country: "India", countryCode: "IN", latitude: 9.9252, longitude: 78.1198, timezone: "Asia/Kolkata", population: 1017865 },
      { name: "Tiruchirappalli", admin1: "Tamil Nadu", country: "India", countryCode: "IN", latitude: 10.7905, longitude: 78.7047, timezone: "Asia/Kolkata", population: 847387 },
    ],
  },
  {
    name: "Kerala",
    admin1: "Kerala",
    country: "India",
    countryCode: "IN",
    latitude: 10.8505,
    longitude: 76.2711,
    timezone: "Asia/Kolkata",
    aliases: ["kl", "kerala", "केरल"],
    topCities: [
      { name: "Thiruvananthapuram", admin1: "Kerala", country: "India", countryCode: "IN", latitude: 8.5241, longitude: 76.9366, timezone: "Asia/Kolkata", population: 743691 },
      { name: "Kochi", admin1: "Kerala", country: "India", countryCode: "IN", latitude: 9.9312, longitude: 76.2673, timezone: "Asia/Kolkata", population: 602046 },
      { name: "Kozhikode", admin1: "Kerala", country: "India", countryCode: "IN", latitude: 11.2588, longitude: 75.7804, timezone: "Asia/Kolkata", population: 550440 },
    ],
  },
  {
    name: "Punjab",
    admin1: "Punjab",
    country: "India",
    countryCode: "IN",
    latitude: 31.1471,
    longitude: 75.3412,
    timezone: "Asia/Kolkata",
    aliases: ["pb", "punjab", "पंजाब"],
    topCities: [
      { name: "Ludhiana", admin1: "Punjab", country: "India", countryCode: "IN", latitude: 30.9010, longitude: 75.8573, timezone: "Asia/Kolkata", population: 1618879 },
      { name: "Amritsar", admin1: "Punjab", country: "India", countryCode: "IN", latitude: 31.6340, longitude: 74.8723, timezone: "Asia/Kolkata", population: 1132383 },
      { name: "Jalandhar", admin1: "Punjab", country: "India", countryCode: "IN", latitude: 31.3260, longitude: 75.5762, timezone: "Asia/Kolkata", population: 862886 },
    ],
  },
  {
    name: "Haryana",
    admin1: "Haryana",
    country: "India",
    countryCode: "IN",
    latitude: 29.0588,
    longitude: 76.0856,
    timezone: "Asia/Kolkata",
    aliases: ["hr", "haryana", "हरियाणा"],
    topCities: [
      { name: "Gurugram", admin1: "Haryana", country: "India", countryCode: "IN", latitude: 28.4595, longitude: 77.0266, timezone: "Asia/Kolkata", population: 876969 },
      { name: "Faridabad", admin1: "Haryana", country: "India", countryCode: "IN", latitude: 28.4089, longitude: 77.3178, timezone: "Asia/Kolkata", population: 1414050 },
    ],
  },
  {
    name: "Bihar",
    admin1: "Bihar",
    country: "India",
    countryCode: "IN",
    latitude: 25.0961,
    longitude: 85.3131,
    timezone: "Asia/Kolkata",
    aliases: ["br", "bihar", "बिहार"],
    topCities: [
      { name: "Patna", admin1: "Bihar", country: "India", countryCode: "IN", latitude: 25.5941, longitude: 85.1376, timezone: "Asia/Kolkata", population: 1684222 },
      { name: "Gaya", admin1: "Bihar", country: "India", countryCode: "IN", latitude: 24.7914, longitude: 85.0002, timezone: "Asia/Kolkata", population: 468614 },
    ],
  },
  {
    name: "West Bengal",
    admin1: "West Bengal",
    country: "India",
    countryCode: "IN",
    latitude: 22.9868,
    longitude: 87.8550,
    timezone: "Asia/Kolkata",
    aliases: ["wb", "west bengal", "westbengal", "पश्चिम बंगाल"],
    topCities: [
      { name: "Kolkata", admin1: "West Bengal", country: "India", countryCode: "IN", latitude: 22.5726, longitude: 88.3639, timezone: "Asia/Kolkata", population: 4496694 },
      { name: "Howrah", admin1: "West Bengal", country: "India", countryCode: "IN", latitude: 22.5958, longitude: 88.2636, timezone: "Asia/Kolkata", population: 1077070 },
      { name: "Siliguri", admin1: "West Bengal", country: "India", countryCode: "IN", latitude: 26.7271, longitude: 88.3953, timezone: "Asia/Kolkata", population: 515550 },
    ],
  },
  {
    name: "Telangana",
    admin1: "Telangana",
    country: "India",
    countryCode: "IN",
    latitude: 18.1124,
    longitude: 79.0193,
    timezone: "Asia/Kolkata",
    aliases: ["ts", "tg", "telangana", "तेलंगाना"],
    topCities: [
      { name: "Hyderabad", admin1: "Telangana", country: "India", countryCode: "IN", latitude: 17.3850, longitude: 78.4867, timezone: "Asia/Kolkata", population: 6809970 },
      { name: "Warangal", admin1: "Telangana", country: "India", countryCode: "IN", latitude: 17.9784, longitude: 79.5941, timezone: "Asia/Kolkata", population: 615998 },
    ],
  },
  {
    name: "Andhra Pradesh",
    admin1: "Andhra Pradesh",
    country: "India",
    countryCode: "IN",
    latitude: 15.9129,
    longitude: 79.7400,
    timezone: "Asia/Kolkata",
    aliases: ["ap", "andhra pradesh", "andhra", "आंध्र प्रदेश"],
    topCities: [
      { name: "Visakhapatnam", admin1: "Andhra Pradesh", country: "India", countryCode: "IN", latitude: 17.6868, longitude: 83.2185, timezone: "Asia/Kolkata", population: 1728128 },
      { name: "Vijayawada", admin1: "Andhra Pradesh", country: "India", countryCode: "IN", latitude: 16.5062, longitude: 80.6480, timezone: "Asia/Kolkata", population: 1034358 },
    ],
  },
  {
    name: "Odisha",
    admin1: "Odisha",
    country: "India",
    countryCode: "IN",
    latitude: 20.9517,
    longitude: 85.0985,
    timezone: "Asia/Kolkata",
    aliases: ["od", "or", "odisha", "orissa", "ओडिशा", "उड़ीसा"],
    topCities: [
      { name: "Bhubaneswar", admin1: "Odisha", country: "India", countryCode: "IN", latitude: 20.2961, longitude: 85.8245, timezone: "Asia/Kolkata", population: 843402 },
      { name: "Cuttack", admin1: "Odisha", country: "India", countryCode: "IN", latitude: 20.4625, longitude: 85.8828, timezone: "Asia/Kolkata", population: 610189 },
    ],
  },
  {
    name: "Assam",
    admin1: "Assam",
    country: "India",
    countryCode: "IN",
    latitude: 26.2006,
    longitude: 92.9376,
    timezone: "Asia/Kolkata",
    aliases: ["as", "assam", "असम"],
    topCities: [
      { name: "Guwahati", admin1: "Assam", country: "India", countryCode: "IN", latitude: 26.1445, longitude: 91.7362, timezone: "Asia/Kolkata", population: 957352 },
    ],
  },
  {
    name: "Goa",
    admin1: "Goa",
    country: "India",
    countryCode: "IN",
    latitude: 15.2993,
    longitude: 74.1240,
    timezone: "Asia/Kolkata",
    aliases: ["ga", "goa", "गोवा"],
    topCities: [
      { name: "Panaji", admin1: "Goa", country: "India", countryCode: "IN", latitude: 15.4909, longitude: 73.8278, timezone: "Asia/Kolkata", population: 114405 },
      { name: "Margao", admin1: "Goa", country: "India", countryCode: "IN", latitude: 15.2700, longitude: 73.9500, timezone: "Asia/Kolkata", population: 87650 },
    ],
  },
  {
    name: "Himachal Pradesh",
    admin1: "Himachal Pradesh",
    country: "India",
    countryCode: "IN",
    latitude: 31.1048,
    longitude: 77.1734,
    timezone: "Asia/Kolkata",
    aliases: ["hp", "himachal pradesh", "himachal", "हिमाचल प्रदेश"],
    topCities: [
      { name: "Shimla", admin1: "Himachal Pradesh", country: "India", countryCode: "IN", latitude: 31.1048, longitude: 77.1734, timezone: "Asia/Kolkata", population: 169578 },
      { name: "Dharamshala", admin1: "Himachal Pradesh", country: "India", countryCode: "IN", latitude: 32.2190, longitude: 76.3234, timezone: "Asia/Kolkata", population: 53543 },
      { name: "Manali", admin1: "Himachal Pradesh", country: "India", countryCode: "IN", latitude: 32.2396, longitude: 77.1887, timezone: "Asia/Kolkata", population: 8096 },
    ],
  },
  {
    name: "Uttarakhand",
    admin1: "Uttarakhand",
    country: "India",
    countryCode: "IN",
    latitude: 30.0668,
    longitude: 79.0193,
    timezone: "Asia/Kolkata",
    aliases: ["uk", "ut", "uttarakhand", "uttaranchal", "उत्तराखंड"],
    topCities: [
      { name: "Dehradun", admin1: "Uttarakhand", country: "India", countryCode: "IN", latitude: 30.3165, longitude: 78.0322, timezone: "Asia/Kolkata", population: 574840 },
      { name: "Haridwar", admin1: "Uttarakhand", country: "India", countryCode: "IN", latitude: 29.9457, longitude: 78.1642, timezone: "Asia/Kolkata", population: 228832 },
      { name: "Rishikesh", admin1: "Uttarakhand", country: "India", countryCode: "IN", latitude: 30.0869, longitude: 78.2676, timezone: "Asia/Kolkata", population: 102138 },
    ],
  },
  {
    name: "Chhattisgarh",
    admin1: "Chhattisgarh",
    country: "India",
    countryCode: "IN",
    latitude: 21.2787,
    longitude: 81.8661,
    timezone: "Asia/Kolkata",
    aliases: ["cg", "chhattisgarh", "chattisgarh", "छत्तीसगढ़"],
    topCities: [
      { name: "Raipur", admin1: "Chhattisgarh", country: "India", countryCode: "IN", latitude: 21.2514, longitude: 81.6296, timezone: "Asia/Kolkata", population: 1010087 },
      { name: "Bhilai", admin1: "Chhattisgarh", country: "India", countryCode: "IN", latitude: 21.1938, longitude: 81.3509, timezone: "Asia/Kolkata", population: 625700 },
    ],
  },
  {
    name: "Jharkhand",
    admin1: "Jharkhand",
    country: "India",
    countryCode: "IN",
    latitude: 23.6102,
    longitude: 85.2799,
    timezone: "Asia/Kolkata",
    aliases: ["jh", "jharkhand", "झारखंड"],
    topCities: [
      { name: "Ranchi", admin1: "Jharkhand", country: "India", countryCode: "IN", latitude: 23.3441, longitude: 85.3096, timezone: "Asia/Kolkata", population: 1073427 },
      { name: "Jamshedpur", admin1: "Jharkhand", country: "India", countryCode: "IN", latitude: 22.8046, longitude: 86.2029, timezone: "Asia/Kolkata", population: 1339000 },
    ],
  },
  {
    name: "Jammu and Kashmir",
    admin1: "Jammu and Kashmir",
    country: "India",
    countryCode: "IN",
    latitude: 33.7782,
    longitude: 76.5762,
    timezone: "Asia/Kolkata",
    aliases: ["jk", "jammu and kashmir", "kashmir", "जम्मू और कश्मीर"],
    topCities: [
      { name: "Srinagar", admin1: "Jammu and Kashmir", country: "India", countryCode: "IN", latitude: 34.0837, longitude: 74.7973, timezone: "Asia/Kolkata", population: 1180570 },
      { name: "Jammu", admin1: "Jammu and Kashmir", country: "India", countryCode: "IN", latitude: 32.7266, longitude: 74.8570, timezone: "Asia/Kolkata", population: 502197 },
    ],
  },
  {
    name: "Ladakh",
    admin1: "Ladakh",
    country: "India",
    countryCode: "IN",
    latitude: 34.1526,
    longitude: 77.5771,
    timezone: "Asia/Kolkata",
    aliases: ["la", "ladakh", "लद्दाख"],
    topCities: [
      { name: "Leh", admin1: "Ladakh", country: "India", countryCode: "IN", latitude: 34.1526, longitude: 77.5771, timezone: "Asia/Kolkata", population: 30870 },
    ],
  },

  // --- Major US States ---
  {
    name: "California",
    admin1: "California",
    country: "United States",
    countryCode: "US",
    latitude: 36.7783,
    longitude: -119.4179,
    timezone: "America/Los_Angeles",
    aliases: ["ca", "california", "california state"],
    topCities: [
      { name: "Los Angeles", admin1: "California", country: "United States", countryCode: "US", latitude: 34.0522, longitude: -118.2437, timezone: "America/Los_Angeles", population: 3898747 },
      { name: "San Francisco", admin1: "California", country: "United States", countryCode: "US", latitude: 37.7749, longitude: -122.4194, timezone: "America/Los_Angeles", population: 873965 },
      { name: "San Diego", admin1: "California", country: "United States", countryCode: "US", latitude: 32.7157, longitude: -117.1611, timezone: "America/Los_Angeles", population: 1386932 },
      { name: "San Jose", admin1: "California", country: "United States", countryCode: "US", latitude: 37.3382, longitude: -121.8863, timezone: "America/Los_Angeles", population: 1013240 },
      { name: "Sacramento", admin1: "California", country: "United States", countryCode: "US", latitude: 38.5816, longitude: -121.4944, timezone: "America/Los_Angeles", population: 524943 },
    ],
  },
  {
    name: "Texas",
    admin1: "Texas",
    country: "United States",
    countryCode: "US",
    latitude: 31.9686,
    longitude: -99.9018,
    timezone: "America/Chicago",
    aliases: ["tx", "texas", "texas state"],
    topCities: [
      { name: "Houston", admin1: "Texas", country: "United States", countryCode: "US", latitude: 29.7604, longitude: -95.3698, timezone: "America/Chicago", population: 2304580 },
      { name: "Austin", admin1: "Texas", country: "United States", countryCode: "US", latitude: 30.2672, longitude: -97.7431, timezone: "America/Chicago", population: 961855 },
      { name: "Dallas", admin1: "Texas", country: "United States", countryCode: "US", latitude: 32.7767, longitude: -96.7970, timezone: "America/Chicago", population: 1304379 },
      { name: "San Antonio", admin1: "Texas", country: "United States", countryCode: "US", latitude: 29.4241, longitude: -98.4936, timezone: "America/Chicago", population: 1434625 },
    ],
  },
  {
    name: "Florida",
    admin1: "Florida",
    country: "United States",
    countryCode: "US",
    latitude: 27.6648,
    longitude: -81.5158,
    timezone: "America/New_York",
    aliases: ["fl", "florida", "florida state"],
    topCities: [
      { name: "Miami", admin1: "Florida", country: "United States", countryCode: "US", latitude: 25.7617, longitude: -80.1918, timezone: "America/New_York", population: 442241 },
      { name: "Orlando", admin1: "Florida", country: "United States", countryCode: "US", latitude: 28.5383, longitude: -81.3792, timezone: "America/New_York", population: 307573 },
      { name: "Tampa", admin1: "Florida", country: "United States", countryCode: "US", latitude: 27.9506, longitude: -82.4572, timezone: "America/New_York", population: 384959 },
    ],
  },
  {
    name: "New York",
    admin1: "New York",
    country: "United States",
    countryCode: "US",
    latitude: 40.7128,
    longitude: -74.0060,
    timezone: "America/New_York",
    aliases: ["ny", "new york state", "ny state"],
    topCities: [
      { name: "New York", admin1: "New York", country: "United States", countryCode: "US", latitude: 40.7128, longitude: -74.0060, timezone: "America/New_York", population: 8804190 },
      { name: "Buffalo", admin1: "New York", country: "United States", countryCode: "US", latitude: 42.8864, longitude: -78.8784, timezone: "America/New_York", population: 278349 },
      { name: "Albany", admin1: "New York", country: "United States", countryCode: "US", latitude: 42.6526, longitude: -73.7562, timezone: "America/New_York", population: 99224 },
    ],
  },
  {
    name: "Washington",
    admin1: "Washington",
    country: "United States",
    countryCode: "US",
    latitude: 47.7511,
    longitude: -120.7401,
    timezone: "America/Los_Angeles",
    aliases: ["wa", "washington state", "wa state"],
    topCities: [
      { name: "Seattle", admin1: "Washington", country: "United States", countryCode: "US", latitude: 47.6062, longitude: -122.3321, timezone: "America/Los_Angeles", population: 737015 },
      { name: "Spokane", admin1: "Washington", country: "United States", countryCode: "US", latitude: 47.6588, longitude: -117.4260, timezone: "America/Los_Angeles", population: 228989 },
    ],
  },
  {
    name: "Illinois",
    admin1: "Illinois",
    country: "United States",
    countryCode: "US",
    latitude: 40.6331,
    longitude: -89.3985,
    timezone: "America/Chicago",
    aliases: ["il", "illinois", "illinois state"],
    topCities: [
      { name: "Chicago", admin1: "Illinois", country: "United States", countryCode: "US", latitude: 41.8781, longitude: -87.6298, timezone: "America/Chicago", population: 2746388 },
    ],
  },
  {
    name: "Pennsylvania",
    admin1: "Pennsylvania",
    country: "United States",
    countryCode: "US",
    latitude: 41.2033,
    longitude: -77.1945,
    timezone: "America/New_York",
    aliases: ["pa", "pennsylvania"],
    topCities: [
      { name: "Philadelphia", admin1: "Pennsylvania", country: "United States", countryCode: "US", latitude: 39.9526, longitude: -75.1652, timezone: "America/New_York", population: 1603797 },
      { name: "Pittsburgh", admin1: "Pennsylvania", country: "United States", countryCode: "US", latitude: 40.4406, longitude: -79.9959, timezone: "America/New_York", population: 302971 },
    ],
  },
  {
    name: "Ohio",
    admin1: "Ohio",
    country: "United States",
    countryCode: "US",
    latitude: 40.4173,
    longitude: -82.9071,
    timezone: "America/New_York",
    aliases: ["oh", "ohio"],
    topCities: [
      { name: "Columbus", admin1: "Ohio", country: "United States", countryCode: "US", latitude: 39.9612, longitude: -82.9988, timezone: "America/New_York", population: 905748 },
      { name: "Cleveland", admin1: "Ohio", country: "United States", countryCode: "US", latitude: 41.4993, longitude: -81.6944, timezone: "America/New_York", population: 372624 },
    ],
  },
  {
    name: "Georgia",
    admin1: "Georgia",
    country: "United States",
    countryCode: "US",
    latitude: 32.1656,
    longitude: -82.9001,
    timezone: "America/New_York",
    aliases: ["georgia state", "georgia us"],
    topCities: [
      { name: "Atlanta", admin1: "Georgia", country: "United States", countryCode: "US", latitude: 33.7490, longitude: -84.3880, timezone: "America/New_York", population: 498715 },
    ],
  },

  // --- Major Canadian Provinces ---
  {
    name: "Ontario",
    admin1: "Ontario",
    country: "Canada",
    countryCode: "CA",
    latitude: 51.2538,
    longitude: -85.3232,
    timezone: "America/Toronto",
    aliases: ["on", "ontario"],
    topCities: [
      { name: "Toronto", admin1: "Ontario", country: "Canada", countryCode: "CA", latitude: 43.6532, longitude: -79.3832, timezone: "America/Toronto", population: 2794356 },
      { name: "Ottawa", admin1: "Ontario", country: "Canada", countryCode: "CA", latitude: 45.4215, longitude: -75.6972, timezone: "America/Toronto", population: 1017449 },
    ],
  },
  {
    name: "British Columbia",
    admin1: "British Columbia",
    country: "Canada",
    countryCode: "CA",
    latitude: 53.7267,
    longitude: -127.6476,
    timezone: "America/Vancouver",
    aliases: ["bc", "british columbia"],
    topCities: [
      { name: "Vancouver", admin1: "British Columbia", country: "Canada", countryCode: "CA", latitude: 49.2827, longitude: -123.1207, timezone: "America/Vancouver", population: 662248 },
      { name: "Victoria", admin1: "British Columbia", country: "Canada", countryCode: "CA", latitude: 48.4284, longitude: -123.3656, timezone: "America/Vancouver", population: 91861 },
    ],
  },

  // --- Major Australian States ---
  {
    name: "New South Wales",
    admin1: "New South Wales",
    country: "Australia",
    countryCode: "AU",
    latitude: -31.8402,
    longitude: 145.6128,
    timezone: "Australia/Sydney",
    aliases: ["nsw", "new south wales"],
    topCities: [
      { name: "Sydney", admin1: "New South Wales", country: "Australia", countryCode: "AU", latitude: -33.8688, longitude: 151.2093, timezone: "Australia/Sydney", population: 5312163 },
    ],
  },
  {
    name: "Victoria",
    admin1: "Victoria",
    country: "Australia",
    countryCode: "AU",
    latitude: -37.4713,
    longitude: 144.7852,
    timezone: "Australia/Melbourne",
    aliases: ["vic", "victoria"],
    topCities: [
      { name: "Melbourne", admin1: "Victoria", country: "Australia", countryCode: "AU", latitude: -37.8136, longitude: 144.9631, timezone: "Australia/Melbourne", population: 5078193 },
    ],
  },
  {
    name: "Queensland",
    admin1: "Queensland",
    country: "Australia",
    countryCode: "AU",
    latitude: -20.9176,
    longitude: 142.7028,
    timezone: "Australia/Brisbane",
    aliases: ["qld", "queensland"],
    topCities: [
      { name: "Brisbane", admin1: "Queensland", country: "Australia", countryCode: "AU", latitude: -27.4698, longitude: 153.0251, timezone: "Australia/Brisbane", population: 2560700 },
    ],
  },

  // --- Major European Regions ---
  {
    name: "Bavaria",
    admin1: "Bavaria",
    country: "Germany",
    countryCode: "DE",
    latitude: 48.7904,
    longitude: 11.4979,
    timezone: "Europe/Berlin",
    aliases: ["bavaria", "bayern"],
    topCities: [
      { name: "Munich", admin1: "Bavaria", country: "Germany", countryCode: "DE", latitude: 48.1351, longitude: 11.5820, timezone: "Europe/Berlin", population: 1471508 },
      { name: "Nuremberg", admin1: "Bavaria", country: "Germany", countryCode: "DE", latitude: 49.4521, longitude: 11.0767, timezone: "Europe/Berlin", population: 518365 },
    ],
  },
];

export const BLOCKED_GEOCODE_TERMS = new Set([
  // Pronouns & articles & demonstratives
  "my", "me", "i", "we", "us", "our", "ours", "you", "your", "yours",
  "he", "him", "his", "she", "her", "hers", "it", "its", "they", "them", "their", "theirs",
  "this", "that", "these", "those", "the", "a", "an",
  // Common prepositions & conjunctions
  "in", "at", "to", "for", "from", "by", "on", "with", "about", "into", "through",
  "and", "or", "but", "so", "if", "as", "of",
  // Question words & auxiliary verbs
  "what", "which", "who", "whom", "whose", "where", "when", "why", "how",
  "is", "am", "are", "was", "were", "be", "been", "being",
  "do", "does", "did", "have", "has", "had", "will", "would", "shall", "should", "can", "could", "may", "might", "must",
  // Generic place nouns
  "city", "town", "village", "place", "location", "area", "region", "zone",
  "district", "state", "country", "vicinity", "neighborhood", "neighbourhood",
  "local", "locality", "home", "work", "office", "school", "house",
  "current", "here", "there", "nearby", "near", "outside", "indoor", "indoors", "outdoors",
  "anywhere", "somewhere", "everywhere", "nowhere",
  "my city", "my location", "my area", "my town", "my place", "my village",
  "current location", "current city", "device location", "local area", "local weather",
  // Time and weather keywords
  "today", "tomorrow", "tonight", "yesterday", "morning", "afternoon", "evening", "night",
  "now", "currently", "weekend", "week", "hour", "hours", "day", "days",
  "weather", "forecast", "climate", "temperature", "temp", "rain", "raining", "rainy",
  "precipitation", "drizzle", "shower", "storm", "thunderstorm", "snow", "wind", "windy",
  "humidity", "clouds", "cloudy", "sun", "sunny", "clear", "condition", "conditions",
  "status", "report", "details", "info", "overview", "advisory", "warning", "alert",
  // Generic action words
  "tell", "show", "give", "send", "check", "see", "find", "get", "help", "please",
  // Hindi & Hinglish stopwords and generic place words
  "aaj", "kal", "parso", "subah", "dophar", "shaam", "raat", "ghar", "kaisa", "kaisi", "kaise",
  "hoga", "hogi", "batao", "bataiye", "dikhao", "dekh", "kya", "hai", "hain", "tha", "thi", "the",
  "karna", "jana", "jaana", "safar", "yatra", "gadi", "chale", "chalna", "tapman", "mausam",
  "barish", "barsat", "hawa", "dhoop", "garmi", "sardi", "thand", "kuch", "shehar", "shahar",
  "jagah", "gam", "gaam", "sthan", "apna", "apne", "apni", "mera", "meri", "mere", "tera", "teri",
  "tere", "humara", "humari", "humare", "yahan", "vahan", "kripya", "bhi", "dono", "sab",
  // Regional script generic terms (Hindi / Gujarati / Marathi)
  "आज", "कल", "परसों", "सुबह", "दोपहर", "शाम", "रात", "अभी", "कैसा", "कैसी", "कैसे",
  "होगा", "होगी", "है", "हैं", "था", "थी", "थे", "बताओ", "बताइए", "दिखाओ", "देख", "क्या",
  "तापमान", "मौसम", "बारिश", "बरसात", "हवा", "धूप", "गर्मी", "सर्दी", "ठंड", "शहर", "जगह", "स्थान",
  "मेरा", "मेरी", "मेरे", "यहाँ", "वहाँ", "कृपया",
  "આજે", "કાલે", "પરમ દિવસે", "સવાર", "બપોર", "સાંજ", "રાત", "હવે", "કેવું", "કેવી", "કેવો", "કેવા",
  "હશે", "છે", "હતું", "હતી", "હતા", "જણાવો", "કહો", "બતાવો", "જુઓ", "શું", "કેમ", "ક્યારે", "ક્યાં",
  "તાપમાન", "હવામાન", "વરસાદ", "પવન", "તડકો", "ગરમી", "ઠંડી", "શહેર", "સ્થળ", "જગ્યા", "મારું", "મારી",
  "મારો", "અહીં", "ત્યાં", "કૃપા કરીને",
  // Null / invalid literals
  "unknown", "null", "undefined", "n/a", "none"
]);

export function isBlockedGeocodeQuery(query: string): boolean {
  const trimmed = query.trim().toLowerCase().replace(/^[^\w\u0900-\u0D7F]+|[^\w\u0900-\u0D7F]+$/g, "");
  if (!trimmed) return true;
  if (BLOCKED_GEOCODE_TERMS.has(trimmed)) return true;
  // If query is an allowed 2-letter state code (e.g. mp, mh, up, dl, ca, tx), do not block
  if (trimmed.length < 3 && !STATE_ABBREVIATIONS[trimmed]) return true;
  const tokens = trimmed.split(/\s+/);
  if (tokens.every((t) => BLOCKED_GEOCODE_TERMS.has(t))) return true;
  return false;
}

export class OpenMeteoGeocodingProvider implements IGeocodingProvider {
  private baseUrl = "https://geocoding-api.open-meteo.com/v1/search";

  private parseApiResults(results: any[]): LocationInfo[] {
    if (!Array.isArray(results)) return [];
    return results.map((item: any) => ({
      name: item.name,
      country: item.country || "",
      countryCode: item.country_code ? String(item.country_code).toUpperCase() : undefined,
      admin1: item.admin1 || "",
      admin2: item.admin2 || "",
      latitude: item.latitude,
      longitude: item.longitude,
      timezone: item.timezone || "UTC",
      elevation: item.elevation,
      postcodes: Array.isArray(item.postcodes) ? item.postcodes : [],
      population: item.population,
      featureCode: item.feature_code,
    }));
  }

  private async fetchFromOpenMeteo(searchTerm: string, count: number, lang?: string): Promise<LocationInfo[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
      const languageParam = lang ? `&language=${lang}` : "&language=en";
      const url = `${this.baseUrl}?name=${encodeURIComponent(searchTerm)}&count=${count}${languageParam}&format=json`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Open-Meteo Geocoding API returned status ${res.status}`);
      }

      const data = await res.json();
      if (!data || !data.results) {
        return [];
      }

      return this.parseApiResults(data.results);
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        throw new Error("Geocoding request timed out. Please try again.");
      }
      throw err;
    }
  }

  /**
   * Search for locations worldwide using Open-Meteo Geocoding API.
   * Handles:
   * - Cities, towns, and places (e.g. "Bhopal", "Mumbai", "Delhi", "Satna", "Indore", "London", "Tokyo")
   * - States, regions, and territories (e.g. "Madhya Pradesh", "California", "Maharashtra", "Texas", "MP", "MH")
   * - City + State / Country qualifiers (e.g. "Satna, MP", "Bhopal, MP", "Paris, Texas", "London, UK")
   * - Postal codes (e.g. "90210", "462001")
   * - Multilingual / Indic scripts (e.g. "भोपाल", "मुंबई", "दिल्ली", "सतना", "इंदौर", "मध्य प्रदेश")
   */
  async searchLocations(query: string, count: number = 10): Promise<LocationInfo[]> {
    const rawTrimmed = query.trim();
    if (!rawTrimmed || isBlockedGeocodeQuery(rawTrimmed)) {
      return [];
    }

    const cacheKey = `geo_dyn_${rawTrimmed.toLowerCase()}_${count}`;
    const cached = appCache.get<LocationInfo[]>(cacheKey);
    if (cached) return cached;

    const lowerQuery = rawTrimmed.toLowerCase();
    const normalizedQuery = lowerQuery.replace(/^[^\w\u0900-\u0D7F]+|[^\w\u0900-\u0D7F]+$/g, "");

    // Check for Indic script transliteration
    const transliterated = INDIC_CITY_TRANSLITERATIONS[rawTrimmed] || INDIC_CITY_TRANSLITERATIONS[normalizedQuery];
    const effectiveSearchTerm = transliterated || rawTrimmed;
    const effectiveLower = effectiveSearchTerm.toLowerCase();

    const results: LocationInfo[] = [];

    // Helper: deduplicate locations by geographical proximity (within ~2km / 0.02 deg) and name
    const addDeduplicated = (loc: LocationInfo) => {
      const exists = results.some((existing) => {
        const sameName = existing.name.toLowerCase() === loc.name.toLowerCase();
        const closeDist =
          Math.abs(existing.latitude - loc.latitude) < 0.05 &&
          Math.abs(existing.longitude - loc.longitude) < 0.05;
        return sameName || closeDist;
      });
      if (!exists && results.length < count) {
        results.push(loc);
      }
    };

    // 1. Check for supported states, provinces, or territories (e.g. "Madhya Pradesh", "California", "Texas", "Maharashtra", "MP", "MH")
    const matchedState = SUPPORTED_STATES.find((st) => {
      return (
        st.name.toLowerCase() === effectiveLower ||
        st.aliases.some((alias) => alias.toLowerCase() === effectiveLower || alias.toLowerCase() === normalizedQuery)
      );
    });

    if (matchedState) {
      // Add the state itself as primary location
      addDeduplicated({
        name: matchedState.name,
        admin1: matchedState.admin1,
        country: matchedState.country,
        countryCode: matchedState.countryCode,
        latitude: matchedState.latitude,
        longitude: matchedState.longitude,
        timezone: matchedState.timezone,
        featureCode: "ADM1",
      });

      // Include top representative cities for that state
      if (matchedState.topCities) {
        for (const city of matchedState.topCities) {
          if (results.length >= count) break;
          addDeduplicated(city);
        }
      }

      // If we found a direct state match, return results immediately
      if (results.length > 0) {
        appCache.set(cacheKey, results, 3600);
        return results;
      }
    }

    // Helper to filter out accidental matches on generic/blocked terms
    const filterAccidentalMatches = (list: LocationInfo[]): LocationInfo[] => {
      return list.filter((loc) => {
        const locNameLower = loc.name?.toLowerCase().trim() || "";
        if (BLOCKED_GEOCODE_TERMS.has(locNameLower)) {
          const qLower = effectiveLower;
          const countryLower = (loc.country || "").toLowerCase();
          const admin1Lower = (loc.admin1 || "").toLowerCase();
          const hasQualifier =
            (countryLower && qLower.includes(countryLower)) ||
            (admin1Lower && qLower.includes(admin1Lower)) ||
            (loc.countryCode && qLower.includes(loc.countryCode.toLowerCase()));
          return Boolean(hasQualifier);
        }
        return true;
      });
    };

    // 2. Direct query to Open-Meteo Geocoding API with primary term
    let apiMatches: LocationInfo[] = [];
    try {
      apiMatches = await this.fetchFromOpenMeteo(effectiveSearchTerm, Math.max(count, 10));
    } catch {
      apiMatches = [];
    }

    // If transliterated and raw query is Indic, also fetch with Hindi language tag if not already found
    if (apiMatches.length === 0 && effectiveSearchTerm !== rawTrimmed) {
      try {
        apiMatches = await this.fetchFromOpenMeteo(rawTrimmed, Math.max(count, 10), "hi");
      } catch {
        // Ignore fallback error
      }
    }

    apiMatches = filterAccidentalMatches(apiMatches);

    // Sort API matches: exact name matches rank first, then by population
    apiMatches.sort((a, b) => {
      const aExact = a.name.toLowerCase() === effectiveLower;
      const bExact = b.name.toLowerCase() === effectiveLower;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return (b.population || 0) - (a.population || 0);
    });

    for (const match of apiMatches) {
      addDeduplicated(match);
      if (results.length >= count) break;
    }

    // 3. If query contains a comma or separator (e.g., "Satna, MP", "Bhopal, MP", "Paris, Texas", "London, UK", "Delhi, DL")
    if (results.length === 0 && (rawTrimmed.includes(",") || rawTrimmed.includes("-"))) {
      const separator = rawTrimmed.includes(",") ? "," : "-";
      const segments = rawTrimmed.split(separator).map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (segments.length >= 2) {
        const placeName = segments[0];
        const rawQualifier = segments.slice(1).join(" ").trim();
        const resolvedQualifier = STATE_ABBREVIATIONS[rawQualifier] || rawQualifier;

        const effectivePlace = INDIC_CITY_TRANSLITERATIONS[placeName] || placeName;
        if (!BLOCKED_GEOCODE_TERMS.has(effectivePlace) && effectivePlace.length >= 2) {
          const rawMatches = await this.fetchFromOpenMeteo(effectivePlace, Math.max(count, 15));

          const matched = rawMatches.filter((item) => {
            const admin1 = (item.admin1 || "").toLowerCase();
            const admin2 = (item.admin2 || "").toLowerCase();
            const country = (item.country || "").toLowerCase();
            const countryCode = (item.countryCode || "").toLowerCase();

            return (
              admin1.includes(rawQualifier) ||
              admin1.includes(resolvedQualifier) ||
              admin2.includes(rawQualifier) ||
              country.includes(rawQualifier) ||
              country.includes(resolvedQualifier) ||
              countryCode === rawQualifier ||
              countryCode === resolvedQualifier
            );
          });

          const prioritized = matched.length > 0 ? matched : rawMatches;
          for (const loc of prioritized) {
            addDeduplicated(loc);
            if (results.length >= count) break;
          }
        }
      }
    }

    // 4. If still no results and query has multiple words (e.g., "Paris Texas" or "London Canada")
    if (results.length === 0 && rawTrimmed.includes(" ")) {
      const parts = rawTrimmed.split(/\s+/);
      if (parts.length >= 2) {
        const placeName = parts[0];
        const qualifier = parts.slice(1).join(" ").toLowerCase();
        const resolvedQualifier = STATE_ABBREVIATIONS[qualifier] || qualifier;

        if (!BLOCKED_GEOCODE_TERMS.has(placeName.toLowerCase()) && placeName.length >= 3) {
          const rawMatches = await this.fetchFromOpenMeteo(placeName, Math.max(count, 15));
          const matched = rawMatches.filter((item) => {
            const admin1 = (item.admin1 || "").toLowerCase();
            const country = (item.country || "").toLowerCase();
            const countryCode = (item.countryCode || "").toLowerCase();
            return (
              admin1.includes(qualifier) ||
              admin1.includes(resolvedQualifier) ||
              country.includes(qualifier) ||
              country.includes(resolvedQualifier) ||
              countryCode === qualifier ||
              countryCode === resolvedQualifier
            );
          });

          for (const loc of matched) {
            addDeduplicated(loc);
            if (results.length >= count) break;
          }
        }
      }
    }

    // Cache successful dynamic results for 1 hour (3600s)
    if (results.length > 0) {
      appCache.set(cacheKey, results, 3600);
    }

    return results;
  }

  /**
   * Resolves a single location dynamically using Open-Meteo Geocoding API.
   * Returns the best match or null if not found.
   */
  async resolveLocation(query: string): Promise<LocationInfo | null> {
    const trimmed = query.trim();
    if (!trimmed || isBlockedGeocodeQuery(trimmed)) return null;

    const results = await this.searchLocations(trimmed, 5);
    return results.length > 0 ? results[0] : null;
  }
}

export const geocodingProvider: IGeocodingProvider = new OpenMeteoGeocodingProvider();
