import { ActivityAnalysis, ComparisonAnalysis, CurrentWeatherData, DailyForecastItem, HourlyForecastItem, LocationInfo, TravelAnalysis, WeatherAdvisory, WeatherAnalysis } from "../types.js";
import { getLanguageConfig, LanguageCode, LANGUAGE_REGISTRY } from "../../src/languages.js";

export interface FallbackContext {
  userQuery: string;
  language: string;
  location?: LocationInfo;
  current?: CurrentWeatherData;
  hourly?: HourlyForecastItem[];
  daily?: DailyForecastItem[];
  analysis?: WeatherAnalysis;
  advisories?: WeatherAdvisory[];
  activity?: ActivityAnalysis;
  comparison?: ComparisonAnalysis;
  travel?: TravelAnalysis;
  failedLocations?: string[];
}

interface LocalizedPhrases {
  directAnswerSummary: (loc: string, cond: string, temp: number, feelsLike: number) => string;
  dryNowNotice: string;
  activeRainNotice: (rate: number) => string;
  rainProbabilityNotice: (prob: number) => string;
  windHumidityNotice: (speed: number, gusts: number, hum: string) => string;
  uvVisibilityNotice: (uv: number, vis: string) => string;
  recommendationHeader: string;
  practicalAdvice: (prob: number, temp: number, uv: number, wind: number, rainNow: boolean) => string;
  activityHeader: (act: string, score: number, suitable: boolean) => string;
  travelHeader: (origin: string, dest: string, mode: string, dist: number, dur: number) => string;
  travelDisclaimer: string;
  comparisonHeader: (cities: string[]) => string;
  advisoryHeader: string;
}

// Localized vocabulary dictionary for major language groups
const LOCALIZED_DICTIONARY: Partial<Record<string, Partial<LocalizedPhrases>>> = {
  hi: {
    directAnswerSummary: (loc, cond, temp, feels) =>
      `वर्तमान में ${loc} में मौसम ${cond} है। तापमान ${temp}°C है (महसूस: ${feels}°C)।`,
    dryNowNotice: "वर्तमान में बारिश नहीं हो रही है (बाहर का मौसम सूखा है)।",
    activeRainNotice: (rate) => `वर्तमान में सक्रिय बारिश हो रही है (${rate} मिमी/घंटा)।`,
    rainProbabilityNotice: (prob) => `आगे बारिश की संभावना ${prob}% है।`,
    windHumidityNotice: (speed, gusts, hum) => `हवा की गति: ${speed} किमी/घंटा (झोंके: ${gusts} किमी/घंटा), आर्द्रता: ${hum}।`,
    uvVisibilityNotice: (uv, vis) => `यूवी इंडेक्स: ${uv}, दृश्यता: ${vis} किमी।`,
    recommendationHeader: "दैनिक जीवन परामर्श व सुझाव",
    practicalAdvice: (prob, temp, uv, wind, rainNow) => {
      const tips: string[] = [];
      if (rainNow || prob >= 60) {
        tips.push("बाहर निकलते समय छाता या रेनकोट अवश्य साथ रखें। गीली सड़कों पर यात्रा के दौरान अतिरिक्त सावधानी बरतें।");
      } else if (prob >= 30) {
        tips.push("हल्की बूंदाबांदी संभव है, शाम की बाहरी योजनाओं में लचीलापन रखें।");
      } else {
        tips.push("मौसम सूखा रहने की संभावना है, बाहरी गतिविधियों के लिए अनुकूल समय है।");
      }
      if (temp >= 35) {
        tips.push("गर्मी अधिक है, पर्याप्त पानी पिएं और दोपहर की धूप से बचें।");
      } else if (temp <= 12) {
        tips.push("मौसम ठंडा है, गर्म कपड़े पहनें।");
      }
      if (uv >= 6) {
        tips.push("धूप तेज है, सनग्लासेस और सनस्क्रीन का प्रयोग करें।");
      }
      return tips.join(" ");
    },
    activityHeader: (act, score, suitable) =>
      `गतिविधि मूल्यांकन: ${act} (अनुकूलता स्कोर: ${score}/100 — ${suitable ? "अनुकूल" : "सावधानी अपेक्षित"})`,
    travelHeader: (o, d, m, dist, dur) =>
      `यात्रा मार्ग मौसम (${o} से ${d}, माध्यम: ${m}, दूरी: ${dist} किमी, समय: लगभग ${dur} मिनट)`,
    travelDisclaimer: "*(नोट: यह यात्रा सुझाव वायुमंडलीय मौसम स्थिति पर आधारित है। वास्तविक सड़क जाम, दुर्घटनाएं या वाहन की गति का सीधा सेंसर डेटा इसमें शामिल नहीं है।)*",
    comparisonHeader: (cities) => `मौसम तुलना: ${cities.join(" बनाम ")}`,
    advisoryHeader: "मौसम चेतावनी व अलर्ट",
  },
  hinglish: {
    directAnswerSummary: (loc, cond, temp, feels) =>
      `Filhal ${loc} me weather ${cond} hai. Current temperature ${temp}°C hai (feels like ${feels}°C).`,
    dryNowNotice: "Abhi active rain nahi ho rahi hai (outdoor conditions dry hain).",
    activeRainNotice: (rate) => `Right now active rain ho rahi hai (${rate} mm/hr).`,
    rainProbabilityNotice: (prob) => `Aage precipitation / rain probability ${prob}% hai.`,
    windHumidityNotice: (speed, gusts, hum) => `Wind speed: ${speed} km/h (gusts ${gusts} km/h), Humidity: ${hum}.`,
    uvVisibilityNotice: (uv, vis) => `UV Index: ${uv}, Visibility: ${vis} km.`,
    recommendationHeader: "Practical Daily Recommendations",
    practicalAdvice: (prob, temp, uv, wind, rainNow) => {
      const tips: string[] = [];
      if (rainNow || prob >= 60) {
        tips.push("Bahar jate waqt umbrella ya raincoat zaroor carry karein. Barish ya thunderstorm ke asaar hone par travel ke liye extra time allow karein aur rain protection sath rakhein.");
      } else if (prob >= 30) {
        tips.push("Thodi boondabandi ke chances hain, evening plans me lightweight jacket ya umbrella backup rakhna safe rahega.");
      } else {
        tips.push("Outdoor activities aur workouts ke liye dry and comfortable weather hai.");
      }
      if (temp >= 35) {
        tips.push("Dhoop aur garmi zyada hai, hydrated rahein aur direct afternoon sun avoid karein.");
      } else if (temp <= 12) {
        tips.push("Thand hai, warm layers wear karein.");
      }
      if (uv >= 6) {
        tips.push("UV index high hai, sunglasses use karein.");
      }
      return tips.join(" ");
    },
    activityHeader: (act, score, suitable) =>
      `Activity Analysis: ${act} (Score: ${score}/100 — ${suitable ? "Suitable" : "Caution Recommended"})`,
    travelHeader: (o, d, m, dist, dur) =>
      `Route Weather Analysis (${o} to ${d}, Mode: ${m}, Distance: ${dist} km, Approx: ${dur} mins)`,
    travelDisclaimer: "*(Note: Travel advice atmospheric weather par based hai; live traffic jams, accidents aur transit telemetry monitored nahi hai).* ",
    comparisonHeader: (cities) => `Weather Comparison: ${cities.join(" vs ")}`,
    advisoryHeader: "Active Weather Advisories",
  },
  bn: {
    directAnswerSummary: (loc, cond, temp, feels) =>
      `বর্তমানে ${loc}-এ আবহাওয়া ${cond}। তাপমাত্রা ${temp}°C (অনুভূত হচ্ছে: ${feels}°C)।`,
    dryNowNotice: "বর্তমানে বৃষ্টি হচ্ছে না (বাইরের পরিবেশ শুষ্ক)।",
    activeRainNotice: (rate) => `বর্তমানে বৃষ্টিপাত হচ্ছে (${rate} মিমি/ঘণ্টা)।`,
    rainProbabilityNotice: (prob) => `পরবর্তী সময়ে বৃষ্টির সম্ভাবনা ${prob}%।`,
    windHumidityNotice: (speed, gusts, hum) => `বাতাসের গতি: ${speed} কিমি/ঘণ্টা, আর্দ্রতা: ${hum}।`,
    uvVisibilityNotice: (uv, vis) => `ইউভি সূচক: ${uv}, দৃশ্যমানতা: ${vis} কিমি।`,
    recommendationHeader: "দৈনন্দিন পরামর্শ ও সতর্কতা",
    practicalAdvice: (prob, temp, uv, wind, rainNow) => {
      const tips: string[] = [];
      if (rainNow || prob >= 60) {
        tips.push("বাইরে বের হলে ছাতা বা রেইনকোট সাথে রাখুন। ভেজা রাস্তায় চলাচলে সতর্কতা অবলম্বন করুন।");
      } else if (prob >= 30) {
        tips.push("হালকা বৃষ্টির সম্ভাবনা রয়েছে, সান্ধ্যকালীন কাজে ছাতা সাথে রাখা ভালো।");
      } else {
        tips.push("আবহাওয়া শুষ্ক থাকার সম্ভাবনা রয়েছে, বহিরঙ্গন কাজের জন্য উপযুক্ত।");
      }
      if (temp >= 35) {
        tips.push("তীব্র গরমে পর্যাপ্ত পানি পান করুন।");
      }
      return tips.join(" ");
    },
    activityHeader: (act, score, suitable) =>
      `কার্যকলাপ মূল্যায়ন: ${act} (স্কোর: ${score}/100 — ${suitable ? "উপযুক্ত" : "সতর্কতা প্রয়োজন"})`,
    travelHeader: (o, d, m, dist, dur) =>
      `ভ্রমণ আবহাওয়া (${o} থেকে ${d}, মাধ্যম: ${m}, দূরত্ব: ${dist} কিমি, আনুমানিক সময়: ${dur} মিনিট)`,
    travelDisclaimer: "*(নোট: ভ্রমণ পরামর্শ বিশুদ্ধ আবহাওয়া তথ্যের উপর নির্ভরশীল; ট্রাফিক জ্যাম বা যানজট পর্যবেক্ষণের আওতাভুক্ত নয়।)*",
    comparisonHeader: (cities) => `আবহাওয়া তুলনা: ${cities.join(" বনাম ")}`,
    advisoryHeader: "সতর্কবার্তা ও পূর্বাভাস",
  },
  te: {
    directAnswerSummary: (loc, cond, temp, feels) =>
      `ప్రస్తుతం ${loc} లో వాతావరణం ${cond}గా ఉంది. ఉష్ణోగ్రత ${temp}°C (అనిపించేది: ${feels}°C).`,
    dryNowNotice: "ప్రస్తుతం వర్షం పడటం లేదు (వాతావరణం పొడిగా ఉంది).",
    activeRainNotice: (rate) => `ప్రస్తుతం వర్షం కురుస్తోంది (${rate} మి.మీ/గంట).`,
    rainProbabilityNotice: (prob) => `వర్షం పడే అవకాశం ${prob}%.`,
    windHumidityNotice: (speed, gusts, hum) => `గాలి వేగం: ${speed} కి.మీ/గం, తేమ: ${hum}.`,
    uvVisibilityNotice: (uv, vis) => `UV సూచిక: ${uv}, దృశ్యత: ${vis} కి.మీ.`,
    recommendationHeader: "ఆచరణాత్మక సిఫార్సులు",
    practicalAdvice: (prob, temp) => {
      if (prob >= 60) {
        return "బయటకు వెళ్లేటప్పుడు గొడుగు లేదా రెయిన్‌కోట్ తీసుకెళ్లండి. తడి రోడ్లపై ప్రయాణించేటప్పుడు జాగ్రత్త వహించండి.";
      }
      if (prob >= 30) {
        return "తేలికపాటి జల్లులు పడే అవకాశం ఉంది, గొడుగు దగ్గర ఉంచుకోవడం మంచిది.";
      }
      return "వాతావరణం అనుకూలంగా ఉంది, బహిరంగ కార్యకలాపాలకు సురక్షితమైన సమయం.";
    },
    activityHeader: (act, score, suitable) =>
      `కార్యకలాప విశ్లేషణ: ${act} (స్కోరు: ${score}/100 — ${suitable ? "అనుకూలం" : "జాగ్రత్త అవసరం"})`,
    travelHeader: (o, d, m, dist, dur) =>
      `ప్రయాణ వాతావరణం (${o} నుండి ${d}, దూరం: ${dist} కి.మీ, సమయం: సుమారు ${dur} నిమిషాలు)`,
    travelDisclaimer: "*(గమనిక: ఈ సలహా వాతావరణ పరిస్థితులపై ఆధారపడి ఉంటుంది; లైవ్ ట్రాఫిక్ లేదా రోడ్డు రద్దీ పర్యవేక్షించబడదు).*",
    comparisonHeader: (cities) => `వాతావరణ పోలిక: ${cities.join(" vs ")}`,
    advisoryHeader: "వాతావరణ హెచ్చరికలు",
  },
  ta: {
    directAnswerSummary: (loc, cond, temp, feels) =>
      `தற்போது ${loc} வானிலை ${cond} ஆக உள்ளது. வெப்பநிலை ${temp}°C (உணரப்படுவது: ${feels}°C).`,
    dryNowNotice: "தற்போது மழை பெய்யவில்லை (வறண்ட வானிலை).",
    activeRainNotice: (rate) => `தற்போது மழை பெய்து கொண்டிருக்கிறது (${rate} மி.மீ/மணி).`,
    rainProbabilityNotice: (prob) => `மழைக்கான வாய்ப்பு ${prob}%.`,
    windHumidityNotice: (speed, gusts, hum) => `காற்று வேகம்: ${speed} கி.மீ/மணி, ஈரப்பதம்: ${hum}.`,
    uvVisibilityNotice: (uv, vis) => `UV குறியீடு: ${uv}, தெரிவுநிலை: ${vis} கி.மீ.`,
    recommendationHeader: "பயனுள்ள பரிந்துரைகள்",
    practicalAdvice: (prob) => {
      if (prob >= 60) return "வெளியே செல்லும்போது குடை அல்லது மழைக்கோட் எடுத்துச் செல்லவும். ஈரமான சாலைகளில் கவனமாக வாகனம் ஓட்டவும்.";
      if (prob >= 30) return "லேசான மழை பெய்ய வாய்ப்புள்ளது, குடையை உடன் வைத்திருப்பது நல்லது.";
      return "வானிலை சிறப்பாக உள்ளது, வெளிப்புற நடவடிக்கைகளுக்கு உகந்த நேரம்.";
    },
    activityHeader: (act, score, suitable) =>
      `செயல்பாடு மதிப்பீடு: ${act} (மதிப்பெண்: ${score}/100 — ${suitable ? "ஏற்றது" : "கவனம் தேவை"})`,
    travelHeader: (o, d, m, dist, dur) =>
      `பயண வானிலை (${o} to ${d}, தூரம்: ${dist} கி.மீ, நேரம்: சுமார் ${dur} நிமிடங்கள்)`,
    travelDisclaimer: "*(குறிப்பு: பயண ஆலோசனை வளிமண்டல வானிலையை அடிப்படையாகக் கொண்டது; நேரடி போக்குவரத்து நெரிசல் கண்காணிக்கப்படவில்லை).*",
    comparisonHeader: (cities) => `வானிலை ஒப்பீடு: ${cities.join(" vs ")}`,
    advisoryHeader: "வானிலை எச்சரிக்கைகள்",
  },
  mr: {
    directAnswerSummary: (loc, cond, temp, feels) =>
      `सध्या ${loc} मध्ये हवामान ${cond} आहे. तापमान ${temp}°C आहे (जाणवणारे तापमान: ${feels}°C).`,
    dryNowNotice: "सध्या पाऊस पडत नाहीये (बाहेर हवामान कोरडे आहे).",
    activeRainNotice: (rate) => `सध्या पाऊस पडत आहे (${rate} मिमी/तास).`,
    rainProbabilityNotice: (prob) => `पुढे पावसाची शक्यता ${prob}% आहे.`,
    windHumidityNotice: (speed, gusts, hum) => `वाऱ्याचा वेग: ${speed} किमी/तास, आर्द्रता: ${hum}।`,
    uvVisibilityNotice: (uv, vis) => `यूव्ही इंडेक्स: ${uv}, दृश्यमानता: ${vis} किमी।`,
    recommendationHeader: "दैनंदिन उपयुक्त सल्ला व मार्गदर्शन",
    practicalAdvice: (prob, temp) => {
      if (prob >= 60) return "बाहेर पडताना छत्री किंवा रेनकोट सोबत ठेवा. ओल्या रस्त्यांवर वाहने सावकाश चालवा.";
      if (prob >= 30) return "हलक्या सरींची शक्यता आहे, सोबत छत्री ठेवणे सोयीचे ठरेल.";
      return "हवामान कोरडे राहण्याची शक्यता आहे, मैदानी कामांसाठी अनुकूल वेळ.";
    },
    activityHeader: (act, score, suitable) =>
      `क्रियाकलाप विश्लेषण: ${act} (गुण: ${score}/100 — ${suitable ? "अनुकूल" : "सावधगिरी आवश्यक"})`,
    travelHeader: (o, d, m, dist, dur) =>
      `प्रवास मार्ग हवामान (${o} ते ${d}, अंतर: ${dist} किमी, वेळ: सुमारे ${dur} मिनिटे)`,
    travelDisclaimer: "*(टीप: हा सल्ला हवामान स्थितीवर आधारित आहे; थेट ट्रॅफिक जाम किंवा रस्त्यांवरील गर्दीची माहिती यात समाविष्ट नाही).*",
    comparisonHeader: (cities) => `हवामान तुलना: ${cities.join(" विरुद्ध ")}`,
    advisoryHeader: "हवामान इशारे व सूचना",
  },
  es: {
    directAnswerSummary: (loc, cond, temp, feels) =>
      `Actualmente en ${loc} el tiempo está ${cond}. La temperatura es de ${temp}°C (sensación térmica: ${feels}°C).`,
    dryNowNotice: "Actualmente no llueve (condiciones secas en este momento).",
    activeRainNotice: (rate) => `Actualmente se registran precipitaciones activas (${rate} mm/h).`,
    rainProbabilityNotice: (prob) => `La probabilidad de lluvia es del ${prob}%.`,
    windHumidityNotice: (speed, gusts, hum) => `Viento: ${speed} km/h (ráfagas de ${gusts} km/h), Humedad: ${hum}.`,
    uvVisibilityNotice: (uv, vis) => `Índice UV: ${uv}, Visibilidad: ${vis} km.`,
    recommendationHeader: "Recomendaciones prácticas",
    practicalAdvice: (prob, temp) => {
      const tips: string[] = [];
      if (prob >= 60) {
        tips.push("Lleve un paraguas o impermeable al salir. Conduzca con precaución por pavimento mojado.");
      } else if (prob >= 30) {
        tips.push("Existe probabilidad de chubascos dispersos; conviene tener un paraguas a mano.");
      } else {
        tips.push("Condiciones secas y favorables para actividades al aire libre.");
      }
      if (temp >= 32) tips.push("Manténgase hidratado y evite la exposición solar prolongada.");
      return tips.join(" ");
    },
    activityHeader: (act, score, suitable) =>
      `Análisis de actividad: ${act} (Puntuación: ${score}/100 — ${suitable ? "Favorable" : "Precaución"})`,
    travelHeader: (o, d, m, dist, dur) =>
      `Meteorología de la ruta (${o} a ${d}, Modo: ${m}, Distancia: ${dist} km, Aprox: ${dur} min)`,
    travelDisclaimer: "*(Nota: La orientación de viaje se basa exclusivamente en factores meteorológicos; no supervisa atascos de tráfico en tiempo real).*",
    comparisonHeader: (cities) => `Comparativa meteorológica: ${cities.join(" vs ")}`,
    advisoryHeader: "Avisos meteorológicos activos",
  },
  fr: {
    directAnswerSummary: (loc, cond, temp, feels) =>
      `Actuellement à ${loc}, le temps est ${cond}. La température est de ${temp}°C (ressentie : ${feels}°C).`,
    dryNowNotice: "Il ne pleut pas actuellement (conditions sèches pour le moment).",
    activeRainNotice: (rate) => `Précipitations actives en cours (${rate} mm/h).`,
    rainProbabilityNotice: (prob) => `La probabilité de pluie est de ${prob}%.`,
    windHumidityNotice: (speed, gusts, hum) => `Vent : ${speed} km/h (rafales à ${gusts} km/h), Humidité : ${hum}.`,
    uvVisibilityNotice: (uv, vis) => `Indice UV : ${uv}, Visibilité : ${vis} km.`,
    recommendationHeader: "Recommandations pratiques",
    practicalAdvice: (prob) => {
      if (prob >= 60) return "Prenez un parapluie ou un imperméable. Restez vigilant sur les routes mouillées.";
      if (prob >= 30) return "Risque d'averses légères ; prévoyez une protection en cas de sortie prolongée.";
      return "Temps sec et agréable pour vos activités en plein air.";
    },
    activityHeader: (act, score, suitable) =>
      `Évaluation d'activité : ${act} (Score : ${score}/100 — ${suitable ? "Favorable" : "Vigilance"})`,
    travelHeader: (o, d, m, dist, dur) =>
      `Météo de l'itinéraire (${o} vers ${d}, Mode : ${m}, Distance : ${dist} km, env. ${dur} min)`,
    travelDisclaimer: "*(Remarque : Les conseils sont basés sur les conditions météorologiques ; les embouteillages en temps réel ne sont pas surveillés).*",
    comparisonHeader: (cities) => `Comparaison météo : ${cities.join(" vs ")}`,
    advisoryHeader: "Alertes météorologiques",
  },
  de: {
    directAnswerSummary: (loc, cond, temp, feels) =>
      `Aktuell in ${loc} ist das Wetter ${cond}. Die Temperatur beträgt ${temp}°C (gefühlt: ${feels}°C).`,
    dryNowNotice: "Zurzeit fällt kein Regen (aktuell trockene Bedingungen).",
    activeRainNotice: (rate) => `Aktiver Niederschlag fällt derzeit (${rate} mm/h).`,
    rainProbabilityNotice: (prob) => `Die Regenwahrscheinlichkeit liegt bei ${prob}%.`,
    windHumidityNotice: (speed, gusts, hum) => `Wind: ${speed} km/h (Böen bis ${gusts} km/h), Luftfeuchtigkeit: ${hum}.`,
    uvVisibilityNotice: (uv, vis) => `UV-Index: ${uv}, Sichtweite: ${vis} km.`,
    recommendationHeader: "Praktische Empfehlungen",
    practicalAdvice: (prob) => {
      if (prob >= 60) return "Regenschirm oder wetterfeste Kleidung mitnehmen. Vorsicht bei nassen Straßenverhältnissen.";
      if (prob >= 30) return "Leichte Schauer möglich; ein kleiner Schirm im Gepäck ist ratsam.";
      return "Trockene Bedingungen, gut geeignet für Unternehmungen im Freien.";
    },
    activityHeader: (act, score, suitable) =>
      `Aktivitätsanalyse: ${act} (Punktzahl: ${score}/100 — ${suitable ? "Geeignet" : "Einschränkung"})`,
    travelHeader: (o, d, m, dist, dur) =>
      `Routenwetter (${o} nach ${d}, Verkehrsmittel: ${m}, Distanz: ${dist} km, ca. ${dur} Min.)`,
    travelDisclaimer: "*(Hinweis: Reiseempfehlungen basieren rein auf meteorologischen Bedingungen; Stau- und Verkehrsdaten werden nicht überwacht).*",
    comparisonHeader: (cities) => `Wettervergleich: ${cities.join(" vs. ")}`,
    advisoryHeader: "Wetterwarnungen",
  },
  gu: {
    directAnswerSummary: (loc, cond, temp, feels) =>
      `હાલમાં ${loc} માં હવામાન ${cond} છે. તાપમાન ${temp}°C છે (અનુભવાતું તાપમાન: ${feels}°C).`,
    dryNowNotice: "હાલમાં વરસાદ પડી રહ્યો નથી (બહાર વાતાવરણ સૂકું છે).",
    activeRainNotice: (rate) => `હાલમાં સક્રિય વરસાદ પડી રહ્યો છે (${rate} મીમી/કલાક).`,
    rainProbabilityNotice: (prob) => `આગામી વરસાદની શક્યતા ${prob}% છે.`,
    windHumidityNotice: (speed, gusts, hum) => `પવનની ગતિ: ${speed} કિમી/કલાક (ઝોંકા: ${gusts} કિમી/કલાક), ભેજ: ${hum}.`,
    uvVisibilityNotice: (uv, vis) => `યુવી ઇન્ડેક્સ: ${uv}, દ્રશ્યતા: ${vis} કિમી.`,
    recommendationHeader: "દૈનિક જીવન માટે વ્યવહારુ સલાહ",
    practicalAdvice: (prob, temp, uv, wind, rainNow) => {
      const tips: string[] = [];
      if (rainNow || prob >= 60) {
        tips.push("વરસાદની શક્યતા વધુ છે, તેથી બહાર જતી વખતે છત્રી અથવા રેઈનકોટ સાથે રાખો. ભીના રસ્તાઓ પર સાવચેતીથી વાહન ચલાવો.");
      } else if (prob >= 30) {
        tips.push("હળવા ઝાપટાં પડી શકે છે, સાથે છત્રી રાખવી અનુકૂળ રહેશે.");
      } else {
        tips.push("હવામાન સૂકું રહેવાની ધારણા છે, બહારની પ્રવૃત્તિઓ માટે સારો સમય છે.");
      }
      if (temp >= 34) tips.push("ગરમી વધુ છે; પૂરતું પાણી પીતા રહો અને બપોરના તડકામાં જવાનું ટાળો.");
      else if (temp <= 14) tips.push("વાતાવરણ ઠંડું છે; ગરમ કપડાં પહેરવા સલાહભર્યું છે.");
      if (uv >= 6) tips.push("સૂર્યનો યુવી ઇન્ડેક્સ વધારે છે; સનગ્લાસ અને સનસ્ક્રીન વાપરો.");
      return tips.join(" ");
    },
    activityHeader: (act, score, suitable) =>
      `પ્રવૃત્તિ વિશ્લેષણ: ${act} (અનુકૂળતા સ્કોર: ${score}/100 — ${suitable ? "અનુકૂળ" : "સાવચેતી"})`,
    travelHeader: (o, d, m, dist, dur) =>
      `મુસાફરી હવામાન વિશ્લેષણ (${o} થી ${d}, સાધન: ${m}, અંતર: ${dist} કિમી, સમય: આશરે ${dur} મિનિટ)`,
    travelDisclaimer: "*(નોંધ: આ સલાહ હવામાન પર આધારિત છે; ટ્રાફિક જામ અથવા રસ્તાની સ્થિતિનો સમાવેશ નથી).*",
    comparisonHeader: (cities) => `હવામાન સરખામણી: ${cities.join(" વિરુદ્ધ ")}`,
    advisoryHeader: "સક્રિય હવામાન ચેતવણીઓ",
  },
  kn: {
    directAnswerSummary: (loc, cond, temp, feels) =>
      `ಪ್ರಸ್ತುತ ${loc} ನಲ್ಲಿ ಹವಾಮಾನ ${cond} ಆಗಿದೆ. ತಾಪಮಾನ ${temp}°C ಆಗಿದೆ (ಅನುಭವ: ${feels}°C).`,
    dryNowNotice: "ಪ್ರಸ್ತುತ ಮಳೆ ಬೀಳುತ್ತಿಲ್ಲ (ಒಣ ವಾತಾವರಣ).",
    activeRainNotice: (rate) => `ಪ್ರಸ್ತುತ ಮಳೆ ಬೀಳುತ್ತಿದೆ (${rate} ಮಿಮೀ/ಗಂಟೆ).`,
    rainProbabilityNotice: (prob) => `ಮುಂದಿನ ಮಳೆಯ ಸಂಭವನೀಯತೆ ${prob}%.`,
    windHumidityNotice: (speed, gusts, hum) => `ಗಾಳಿಯ ವೇಗ: ${speed} ಕಿಮೀ/ಗಂ (ಬಿರುಗಾಳಿ: ${gusts} ಕಿಮೀ/ಗಂ), ತೇವಾಂಶ: ${hum}.`,
    uvVisibilityNotice: (uv, vis) => `ಯುವಿ ಸೂಚ್ಯಂಕ: ${uv}, ಗೋಚರತೆ: ${vis} ಕಿಮೀ.`,
    recommendationHeader: "ದೈನಂದಿನ ಜೀವನದ ಪ್ರಾಯೋಗಿಕ ಸಲಹೆಗಳು",
    practicalAdvice: (prob) => {
      if (prob >= 60) return "ಮಳೆಯ ಸಾಧ್ಯತೆ ಹೆಚ್ಚಿದೆ, ಛತ್ರಿ ಅಥವಾ ರೈನ್‌ಕೋಟ್ ಜೊತೆಯಲ್ಲಿ ಇಟ್ಟುಕೊಳ್ಳಿ.";
      if (prob >= 30) return "ಲಘು ಮಳೆಯಾಗುವ ಸಾಧ್ಯತೆ ಇದೆ, ಛತ್ರಿ ತೆಗೆದುಕೊಂಡು ಹೋಗುವುದು ಸೂಕ್ತ.";
      return "ಒಣ ವಾತಾವರಣ ನಿರೀಕ್ಷಿಸಲಾಗಿದೆ, ಹೊರಾಂಗಣ ಚಟುವಟಿಕೆಗಳಿಗೆ ಅನುಕೂಲಕರವಾಗಿದೆ.";
    },
    activityHeader: (act, score, suitable) =>
      `ಚಟುವಟಿಕೆ ವಿಶ್ಲೇಷಣೆ: ${act} (ಅಂಕ: ${score}/100 — ${suitable ? "ಅನುಕೂಲಕರ" : "ಎಚ್ಚರಿಕೆ"})`,
    travelHeader: (o, d, m, dist, dur) =>
      `ಪ್ರಯಾಣ ಹವಾಮಾನ ವಿಶ್ಲೇಷಣೆ (${o} ರಿಂದ ${d}, ವಾಹನ: ${m}, ದೂರ: ${dist} ಕಿಮೀ, ಅಂದಾಜು: ${dur} ನಿಮಿಷ)`,
    travelDisclaimer: "*(ಗಮನಿಸಿ: ಈ ಸಲಹೆಯು ಹವಾಮಾನ ಪರಿಸ್ಥಿತಿಗಳನ್ನು ಆಧರಿಸಿದೆ; ಲೈವ್ ಟ್ರಾಫಿಕ್ ಮಾಹಿತಿಯನ್ನು ಒಳಗೊಂಡಿಲ್ಲ).*",
    comparisonHeader: (cities) => `ಹವಾಮಾನ ಹೋಲಿಕೆ: ${cities.join(" ವಿರುದ್ಧ ")}`,
    advisoryHeader: "ಹವಾಮಾನ ಎಚ್ಚರಿಕೆಗಳು",
  },
  ml: {
    directAnswerSummary: (loc, cond, temp, feels) =>
      `നിലവിൽ ${loc} ൽ കാലാവസ്ഥ ${cond} ആണ്. താപനില ${temp}°C ആണ് (തോന്നുന്ന താപനില: ${feels}°C).`,
    dryNowNotice: "നിലവിൽ മഴ പെയ്യുന്നില്ല (വരണ്ട അന്തരീക്ഷം).",
    activeRainNotice: (rate) => `നിലവിൽ മഴ പെയ്യുന്നുണ്ട് (${rate} മിമീ/മണിക്കൂർ).`,
    rainProbabilityNotice: (prob) => `മഴ പെയ്യാനുള്ള സാധ്യത ${prob}%.`,
    windHumidityNotice: (speed, gusts, hum) => `കാറ്റിന്റെ വേഗത: ${speed} കിമീ/മണിക്കൂർ, ഈർപ്പം: ${hum}.`,
    uvVisibilityNotice: (uv, vis) => `യുവി സൂചിക: ${uv}, ദൃശ്യപരത: ${vis} കിമീ.`,
    recommendationHeader: "പ്രായോഗിക നിർദ്ദേശങ്ങൾ",
    practicalAdvice: (prob) => {
      if (prob >= 60) return "മഴയ്ക്ക് സാധ്യതയുള്ളതിനാൽ കുടയോ റെയിൻകോട്ടോ കരുതുക.";
      if (prob >= 30) return "ചെറിയ ചാറ്റൽമഴയ്ക്ക് സാധ്യതയുണ്ട്; കുട കരുതുന്നത് നല്ലതാണ്.";
      return "വരണ്ട കാലാവസ്ഥയാണ് പ്രതീക്ഷിക്കുന്നത്, ഔട്ട്ഡോർ പ്രവർത്തനങ്ങൾക്ക് അനുയോജ്യമാണ്.";
    },
    activityHeader: (act, score, suitable) =>
      `പ്രവർത്തന വിലയിരുത്തൽ: ${act} (സ്കോർ: ${score}/100 — ${suitable ? "അനുയോജ്യം" : "ശ്രദ്ധിക്കുക"})`,
    travelHeader: (o, d, m, dist, dur) =>
      `യാത്രാ കാലാവസ്ഥ (${o} മുതൽ ${d} വരെ, വാഹനം: ${m}, ദൂരം: ${dist} കിമീ, സമയം: ${dur} മിനിറ്റ്)`,
    travelDisclaimer: "*(ശ്രദ്ധിക്കുക: ഇത് കാലാവസ്ഥയെ അടിസ്ഥാനമാക്കിയുള്ളതാണ്; ട്രാഫിക് വിവരങ്ങൾ ഉൾപ്പെടുത്തിയിട്ടില്ല).*",
    comparisonHeader: (cities) => `കാലാവസ്ഥ താരതമ്യം: ${cities.join(" vs ")}`,
    advisoryHeader: "കാലാവസ്ഥാ മുന്നറിയിപ്പുകൾ",
  },
  pa: {
    directAnswerSummary: (loc, cond, temp, feels) =>
      `ਮੌਜੂਦਾ ਸਮੇਂ ${loc} ਵਿੱਚ ਮੌਸਮ ${cond} ਹੈ। ਤਾਪਮਾਨ ${temp}°C ਹੈ (ਮਹਿਸੂਸ: ${feels}°C)।`,
    dryNowNotice: "ਇਸ ਵੇਲੇ ਮੀਂਹ ਨਹੀਂ ਪੈ ਰਿਹਾ (ਸੁੱਕਾ ਮੌਸਮ ਹੈ)।",
    activeRainNotice: (rate) => `ਇਸ ਵੇਲੇ ਮੀਂਹ ਪੈ ਰਿਹਾ ਹੈ (${rate} ਮਿਲੀਮੀਟਰ/ਘੰਟਾ)।`,
    rainProbabilityNotice: (prob) => `ਅਗਲੇ ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ ${prob}% ਹੈ।`,
    windHumidityNotice: (speed, gusts, hum) => `ਹਵਾ ਦੀ ਰਫ਼ਤਾਰ: ${speed} ਕਿਲੋਮੀਟਰ/ਘੰਟਾ, ਨਮੀ: ${hum}।`,
    uvVisibilityNotice: (uv, vis) => `ਯੂਵੀ ਇੰਡੈਕਸ: ${uv}, ਦਿੱਖ: ${vis} ਕਿਲੋਮੀਟਰ।`,
    recommendationHeader: "ਰੋਜ਼ਾਨਾ ਜੀਵਨ ਲਈ ਵਿਹਾਰਕ ਸਲਾਹ",
    practicalAdvice: (prob) => {
      if (prob >= 60) return "ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ ਹੈ, ਬਾਹਰ ਜਾਂਦੇ ਸਮੇਂ ਛਤਰੀ ਜਾਂ ਰੇਨਕੋਟ ਨਾਲ ਰੱਖੋ।";
      if (prob >= 30) return "ਹਲਕੀ ਬਾਰਿਸ਼ ਹੋ ਸਕਦੀ ਹੈ, ਛਤਰੀ ਕੋਲ ਰੱਖਣਾ ਚੰਗਾ ਰਹੇਗਾ।";
      return "ਮੌਸਮ ਸਾਫ਼ ਰਹਿਣ ਦੀ ਉਮੀਦ ਹੈ, ਬਾਹਰਲੇ ਕੰਮਾਂ ਲਈ ਵਧੀਆ ਸਮਾਂ ਹੈ।";
    },
    activityHeader: (act, score, suitable) =>
      `ਗਤੀਵਿਧੀ ਵਿਸ਼ਲੇਸ਼ਣ: ${act} (ਸਕੋਰ: ${score}/100 — ${suitable ? "ਅਨੁਕੂਲ" : "ਸਾਵਧਾਨੀ"})`,
    travelHeader: (o, d, m, dist, dur) =>
      `ਸਫ਼ਰ ਮੌਸਮ ਵਿਸ਼ਲੇਸ਼ਣ (${o} ਤੋਂ ${d}, ਸਾਧਨ: ${m}, ਦੂਰੀ: ${dist} ਕਿਲੋਮੀਟਰ, ਸਮਾਂ: ${dur} ਮਿੰਟ)`,
    travelDisclaimer: "*(ਨੋਟ: ਇਹ ਸਲਾਹ ਮੌਸਮ ਦੇ ਆਧਾਰ 'ਤੇ ਹੈ; ਟ੍ਰੈਫਿਕ ਜਾਮ ਸ਼ਾਮਲ ਨਹੀਂ ਹੈ)।*",
    comparisonHeader: (cities) => `ਮੌਸਮ ਤੁਲਨਾ: ${cities.join(" ਬਨਾਮ ")}`,
    advisoryHeader: "ਮੌਸਮ ਚੇਤਾਵਨੀਆਂ",
  },
  or: {
    directAnswerSummary: (loc, cond, temp, feels) =>
      `ବର୍ତ୍ତମାନ ${loc} ରେ ପାଗ ${cond} ଅଛି। ତାପମାତ୍ରା ${temp}°C (ଅନୁଭବ: ${feels}°C)।`,
    dryNowNotice: "ବର୍ତ୍ତମାନ ବର୍ଷା ହେଉନାହିଁ (ଶୁଖିଲା ପାଗ)।",
    activeRainNotice: (rate) => `ବର୍ତ୍ତମାନ ବର୍ଷା ହେଉଛି (${rate} ମିମି/ଘଣ୍ଟା)।`,
    rainProbabilityNotice: (prob) => `ଆଗାମୀ ବର୍ଷାର ସମ୍ଭାବନା ${prob}%।`,
    windHumidityNotice: (speed, gusts, hum) => `ପବନ ବେଗ: ${speed} କିମି/ଘଣ୍ଟା, ଆର୍ଦ୍ରତା: ${hum}।`,
    uvVisibilityNotice: (uv, vis) => `ୟୁଭି ଇଣ୍ଡେକ୍ସ: ${uv}, ଦୃଶ୍ୟମାନତା: ${vis} କିମି।`,
    recommendationHeader: "ଦୈନନ୍ଦିନ ଜୀବନ ପାଇଁ ବ୍ୟବହାରିକ ପରାମର୍ଶ",
    practicalAdvice: (prob) => {
      if (prob >= 60) return "ବର୍ଷାର ସମ୍ଭାବନା ଅଛି, ବାହାରକୁ ଯିବା ସମୟରେ ଛତା ସାଙ୍ଗରେ ରଖନ୍ତୁ।";
      return "ପାଗ ଶୁଖିଲା ରହିବାର ଆଶା ଅଛି, ବାହାର କାମ ପାଇଁ ଅନୁକୂଳ।";
    },
    activityHeader: (act, score, suitable) =>
      `କାର୍ଯ୍ୟକଳାପ ବିଶ୍ଳେଷଣ: ${act} (ସ୍କୋର: ${score}/100 — ${suitable ? "ଅନୁକୂଳ" : "ସତର୍କତା"})`,
    travelHeader: (o, d, m, dist, dur) =>
      `ଯାତ୍ରା ପାଗ ବିଶ୍ଳେଷଣ (${o} ରୁ ${d}, ଯାନ: ${m}, ଦୂରତା: ${dist} କିମି, ସମୟ: ${dur} ମିନିଟ୍)`,
    travelDisclaimer: "*(ସୂଚନା: ଏହି ପରାମର୍ଶ ପାଗ ଉପରେ ଆଧାରିତ; ଟ୍ରାଫିକ୍ ତଥ୍ୟ ଅନ୍ତର୍ଭୁକ୍ତ ନୁହେଁ)।*",
    comparisonHeader: (cities) => `ପାଗ ତୁଳନା: ${cities.join(" ବନାମ ")}`,
    advisoryHeader: "ପାଣିପାଗ ସତର୍କତା",
  },
  ur: {
    directAnswerSummary: (loc, cond, temp, feels) =>
      `اس وقت ${loc} میں موسم ${cond} ہے۔ درجہ حرارت ${temp}°C ہے (محسوس: ${feels}°C)۔`,
    dryNowNotice: "فی الحال بارش نہیں ہو رہی ہے (خشک موسم ہے)۔",
    activeRainNotice: (rate) => `فی الحال بارش ہو رہی ہے (${rate} ملی میٹر فی گھنٹہ)۔`,
    rainProbabilityNotice: (prob) => `آئندہ بارش کا امکان ${prob}% ہے۔`,
    windHumidityNotice: (speed, gusts, hum) => `ہوا کی رفتار: ${speed} کلومیٹر فی گھنٹہ، نمی: ${hum}۔`,
    uvVisibilityNotice: (uv, vis) => `یو وی انڈیکس: ${uv}، حد نگاہ: ${vis} کلومیٹر۔`,
    recommendationHeader: "روزمرہ زندگی کے لیے مفید تجاویز",
    practicalAdvice: (prob) => {
      if (prob >= 60) return "بارش کا امکان ہے، باہر جاتے وقت چھتری ساتھ رکھیں۔";
      return "خشک موسم متوقع ہے، بیرونی سرگرمیوں کے لیے سازگار ہے۔";
    },
    activityHeader: (act, score, suitable) =>
      `سرگرمی کا جائزہ: ${act} (اسکور: ${score}/100 — ${suitable ? "سازگار" : "احتیاط"})`,
    travelHeader: (o, d, m, dist, dur) =>
      `سفر کا موسم (${o} تا ${d}، ذریعہ: ${m}، فاصلہ: ${dist} کلومیٹر، وقت: ${dur} منٹ)`,
    travelDisclaimer: "*(نوٹ: یہ مشورہ موسمی حالات پر مبنی ہے؛ ٹریفک کی معلومات شامل نہیں ہیں)*۔",
    comparisonHeader: (cities) => `موسم کا موازنہ: ${cities.join(" بمقابلہ ")}`,
    advisoryHeader: "موسمی انتباہات",
  },
};

const CONDITION_NAME_MAP: Record<string, Record<string, string>> = {
  gu: {
    "Clear Sky": "ચોખ્ખું આકાશ",
    "Mainly Clear": "મોટાભાગે સ્વચ્છ આકાશ",
    "Partly Cloudy": "આંશિક વાદળછાયું",
    "Overcast": "વાદળછાયું",
    "Fog": "ધુમ્મસ",
    "Light Drizzle": "હળવી ઝરમર",
    "Moderate Rain": "મધ્યમ વરસાદ",
    "Heavy Rain": "ભારે વરસાદ",
    "Thunderstorm": "ગાજવીજ સાથે વાવાઝોડું",
  },
  hi: {
    "Clear Sky": "साफ आसमान",
    "Mainly Clear": "अधिकांशतः साफ",
    "Partly Cloudy": "आंशिक रूप से बादल",
    "Overcast": "घने बादल",
    "Fog": "कोहरा",
    "Light Drizzle": "हल्की बूंदाबांदी",
    "Moderate Rain": "मध्यम बारिश",
    "Heavy Rain": "भारी बारिश",
    "Thunderstorm": "गरज-चमक के साथ तूफान",
  },
  mr: {
    "Clear Sky": "निरभ्र आकाश",
    "Mainly Clear": "बहुतांश निरभ्र",
    "Partly Cloudy": "अंशतः ढगाळ",
    "Overcast": "ढगाळ वातावरण",
    "Fog": "धुके",
    "Light Drizzle": "हलकी रिमझिम",
    "Moderate Rain": "मध्यम पाऊस",
    "Heavy Rain": "मुसळधार पाऊस",
    "Thunderstorm": "वादळी पाऊस",
  },
  bn: {
    "Clear Sky": "পরিষ্কার আকাশ",
    "Mainly Clear": "প্রধানত পরিষ্কার আকাশ",
    "Partly Cloudy": "আংশিক মেঘলা",
    "Overcast": "মেঘলা",
    "Fog": "কুয়াশা",
    "Light Drizzle": "হালকা গুঁড়ি গুঁড়ি বৃষ্টি",
    "Moderate Rain": "মাঝারি বৃষ্টি",
    "Heavy Rain": "ভারী বৃষ্টি",
    "Thunderstorm": "বজ্রপাতসহ ঝড়",
  },
  te: {
    "Clear Sky": "నిర్మలమైన ఆకాశం",
    "Partly Cloudy": "పాక్షికంగా మేఘావృతం",
    "Overcast": "దట్టమైన మేఘాలు",
    "Fog": "మంచు",
    "Light Drizzle": "తేలికపాటి జల్లులు",
    "Moderate Rain": "మోస్తరు వర్షం",
    "Heavy Rain": "భారీ వర్షం",
    "Thunderstorm": "ఉరుములతో కూడిన వర్షం",
  },
  ta: {
    "Clear Sky": "தெளிவான வானம்",
    "Partly Cloudy": "பகுதி மேகமூட்டம்",
    "Overcast": "முழு மேகமூட்டம்",
    "Fog": "பனிமூட்டம்",
    "Light Drizzle": "லேசான தூறல்",
    "Moderate Rain": "மிதமான மழை",
    "Heavy Rain": "கனமழை",
    "Thunderstorm": "இடியுடன் கூடிய மழை",
  },
};

/**
 * Fallback builder for any of the 30 supported languages
 */
export function buildMultilingualDeterministicFallback(context: FallbackContext): string {
  const { language, location, current, analysis, activity, travel, comparison, advisories } = context;
  const langConfig = getLanguageConfig(language);
  const t = langConfig.translations;
  const locName = location?.name || "Local Area";

  const phrases: LocalizedPhrases = {
    directAnswerSummary: (loc, cond, temp, feels) =>
      `Currently in ${loc}, the weather is ${cond}. The temperature is ${temp}°C (feels like ${feels}°C).`,
    dryNowNotice: "No rain is currently falling (dry conditions right now).",
    activeRainNotice: (rate) => `Active rain is currently falling (${rate} mm/h).`,
    rainProbabilityNotice: (prob) => `Upcoming precipitation probability is ${prob}%.`,
    windHumidityNotice: (speed, gusts, hum) => `Wind speed: ${speed} km/h (gusts ${gusts} km/h), Humidity: ${hum}.`,
    uvVisibilityNotice: (uv, vis) => `UV Index: ${uv}, Visibility: ${vis} km.`,
    recommendationHeader: "Practical Human-Centric Recommendations",
    practicalAdvice: (prob, temp, uv, wind, rainNow) => {
      const tips: string[] = [];
      if (rainNow || prob >= 60) {
        tips.push("Rain and thunderstorms are likely, so allow extra travel time and consider carrying rain protection.");
      } else if (prob >= 30) {
        tips.push("Isolated sprinkles or light showers are possible; keeping an umbrella nearby is recommended.");
      } else {
        tips.push("Dry conditions are expected, favorable for outdoor activities.");
      }
      if (temp >= 34) tips.push("Hot temperatures; stay hydrated and minimize strenuous exertion in direct sunlight.");
      else if (temp <= 12) tips.push("Cool conditions; dressing in warm layers is advisable.");
      if (uv >= 6) tips.push("High solar UV intensity; eye protection and sunscreen are advised.");
      return tips.join(" ");
    },
    activityHeader: (act, score, suitable) =>
      `Activity Analysis: ${act} (Suitability Score: ${score}/100 — ${suitable ? "Favorable" : "Caution"})`,
    travelHeader: (o, d, m, dist, dur) =>
      `Route Weather Analysis (${o} → ${d}, Mode: ${m}, Distance: ${dist} km, Approx: ${dur} min)`,
    travelDisclaimer: "*(Note: Travel advice is based purely on atmospheric weather conditions; live traffic congestion, accidents, and transit delays are not monitored).* ",
    comparisonHeader: (cities) => `Weather Comparison: ${cities.join(" vs ")}`,
    advisoryHeader: t.advisories || "Active Advisories",
    ...(LOCALIZED_DICTIONARY[language] || {}),
  };

  const failedLocationNote =
    context.failedLocations && context.failedLocations.length > 0
      ? `\n\n*(Note: Verified weather data could not be retrieved for ${context.failedLocations.join(", ")} because the location could not be resolved).*`
      : "";

  // 1. ROUTE / TRAVEL QUERY
  if (travel) {
    const o = travel.origin.name;
    const d = travel.destination.name;
    const oCond = travel.originWeather?.condition || "Moderate";
    const dCond = travel.destinationWeather?.condition || "Moderate";
    const oRain = travel.originWeather?.precipitationProbability ?? 0;
    const dRain = travel.destinationWeather?.precipitationProbability ?? 0;

    return `🚗 **${phrases.travelHeader(o, d, travel.mode, travel.totalDistanceKm, travel.estimatedDurationMinutes)}**

• **Origin (${o})**: ${travel.originWeather?.temperature}°C, ${oCond} (Precipitation: ${oRain}%).
• **Destination (${d})**: ${travel.destinationWeather?.temperature}°C, ${dCond} (Precipitation: ${dRain}%).
• **Atmospheric Corridor Risk**: ${travel.weatherRiskLevel.toUpperCase()}
• **Weather-Related Travel Guidance**: ${travel.recommendations?.join(" ") || phrases.practicalAdvice(Math.max(oRain, dRain), travel.originWeather?.temperature || 25, 4, 10, false)}

${phrases.travelDisclaimer}`;
  }

  // 2. COMPARISON QUERY
  if (comparison && comparison.locations.length >= 2) {
    const cityNames = comparison.locations.map((l) => l.location.name);
    const bullets = comparison.locations
      .map((l) => {
        if (l.targetForecast) {
          const tf = l.targetForecast;
          const stormNote = tf.isThunderstorm ? " | ⚡ Thunderstorms likely" : "";
          return `• **${l.location.name} (${tf.targetDay.toUpperCase()})**: High ${tf.tempMax}°C / Low ${tf.tempMin}°C, ${tf.condition}${stormNote}, Rain: ${tf.precipitationProbability}%, Expected Rain: ${tf.rainSum} mm, Wind: ${tf.windSpeedMax} km/h.`;
        }
        return `• **${l.location.name}**: ${l.current.temperature}°C (${t.feelsLike}: ${l.current.feelsLike}°C), ${l.current.condition}, ${t.precipitation}: ${l.current.precipitationProbability}%, Wind: ${l.current.windSpeed} km/h.`;
      })
      .join("\n");

    const failedNote =
      comparison.failedLocations && comparison.failedLocations.length > 0
        ? `\n\n*(Note: Weather data could not be retrieved for: ${comparison.failedLocations.join(", ")}).*`
        : "";

    return `📊 **${phrases.comparisonHeader(cityNames)}**

${bullets}

• **Comparison**: ${comparison.comparativeSummary}
• **Recommendation**: ${comparison.recommendation}${failedNote}`;
  }

  // 3. ACTIVITY QUERY
  if (activity && current) {
    const isSuitable = activity.suitability === "excellent" || activity.suitability === "good";
    const actName = activity.activityName || activity.activity;
    const score = activity.suitabilityScore;

    return `🎯 **${phrases.activityHeader(actName, score, isSuitable)}** in **${locName}**

• **Current Weather**: ${current.temperature}°C, ${current.condition}.
• **Rain Probability**: ${current.precipitationProbability}%, Wind: ${current.windSpeed} km/h.
• **Assessment**: ${activity.primaryReasons?.join(" ") || (isSuitable ? "Conditions are favorable." : "Weather poses some challenges.")}
• **Advice**: ${activity.bestTimeWindow || activity.tips?.join(" ") || phrases.practicalAdvice(current.precipitationProbability, current.temperature, current.uvIndex, current.windSpeed, current.rain > 0)}`;
  }

  // 4. GENERAL WEATHER QUERY
  if (current) {
    const rainNow = (current.rain || 0) > 0 || (current.precipitation || 0) > 0;
    const rainNowText = rainNow ? phrases.activeRainNotice(current.rain || current.precipitation || 0) : phrases.dryNowNotice;
    const humStr = current.humidity !== null ? `${current.humidity}%` : "Unavailable";
    const visStr = current.visibility !== null && current.visibility !== undefined ? (current.visibility / 1000).toFixed(1) : "N/A";

    const displayCond = CONDITION_NAME_MAP[language]?.[current.condition] || current.condition;
    const directAns = phrases.directAnswerSummary(locName, displayCond, current.temperature, current.feelsLike);
    const rainProb = phrases.rainProbabilityNotice(current.precipitationProbability);
    const windHum = phrases.windHumidityNotice(current.windSpeed, current.windGusts, humStr);
    const uvVis = phrases.uvVisibilityNotice(current.uvIndex, visStr);
    const advice = phrases.practicalAdvice(current.precipitationProbability, current.temperature, current.uvIndex, current.windSpeed, rainNow);

    const advBlock = advisories && advisories.length > 0
      ? `\n\n⚠️ **${phrases.advisoryHeader}**: ${advisories[0].title} — ${advisories[0].description} (${advisories[0].recommendation})`
      : "";

    return `${directAns}

${rainNowText} ${rainProb}
${windHum}
${uvVis}

💡 **${phrases.recommendationHeader}**:
${advice}${advBlock}${failedLocationNote}`;
  }

  if (!location && !travel && !comparison) {
    return getLocalizedLocationRequiredMessage(language);
  }

  return `Meteorological observations for ${locName} are currently unavailable. Please verify connection.${failedLocationNote}`;
}

const LOCALIZED_LOCATION_PROMPTS: Record<string, string> = {
  en: "Please specify a city or location to check the weather (for example, 'Weather in Mumbai' or 'Will it rain in London?').",
  hi: "कृपया मौसम की जानकारी के लिए किसी शहर या स्थान का नाम बताएं (जैसे, 'दिल्ली में मौसम कैसा है?').",
  hinglish: "Kripya weather check karne ke liye kisi city ya location ka naam batayein (jaise, 'Delhi me mausam kaisa hai?').",
  gu: "કૃપા કરીને હવામાન જોવા માટે કોઈ શહેર કે સ્થળ જણાવો (ઉદાહરણ તરીકે, 'અમદાવાદમાં હવામાન કેવું છે?').",
  bn: "আবহাওয়ার তথ্য জানতে দয়া করে কোনো শহর বা স্থানের নাম উল্লেখ করুন (যেমন, 'কলকাতায় আবহাওয়া কেমন?').",
  mr: "हवामानाची माहिती जाणून घेण्यासाठी कृपया शहराचे किंवा ठिकाणाचे नाव सांगा (उदा. 'पुण्यात हवामान कसे आहे?').",
  te: "వాతావరణ సమాచారం కోసం దయచేసి నగరం లేదా ప్రదేశం పేరు పేర్కొనండి (ఉదాహరణకు, 'హైదరాబాద్‌లో వాతావరణం ఎలా ఉంది?').",
  ta: "வானிலை தகவல்களை அறிய தயவுசெய்து ஒரு நகரம் அல்லது இடத்தின் பெயரைக் குறிப்பிடவும் (எ.கா. 'சென்னையில் வானிலை எப்படி இருக்கிறது?').",
  kn: "ಹವಾಮಾನ ಮಾಹಿತಿಗಾಗಿ ದಯವಿಟ್ಟು ನಗರ ಅಥವಾ ಸ್ಥಳದ ಹೆಸರನ್ನು ತಿಳಿಸಿ (ಉದಾಹರಣೆಗೆ, 'ಬೆಂಗಳೂರಿನಲ್ಲಿ ಹವಾಮಾನ ಹೇಗಿದೆ?').",
  ml: "കാലാവസ്ഥാ വിവരങ്ങൾക്ക് ദയവായി ഒരു നഗരത്തിന്റെയോ സ്ഥലത്തിന്റെയോ പേര് നൽകുക (ഉദാഹരണത്തിന്, 'കൊച്ചിയിൽ കാലാവസ്ഥ എങ്ങനെയുണ്ട്?').",
  pa: "ਮੌਸਮ ਦੀ ਜਾਣਕਾਰੀ ਲਈ ਕਿਰਪਾ ਕਰਕੇ ਕਿਸੇ ਸ਼ਹਿਰ ਜਾਂ ਸਥਾਨ ਦਾ ਨਾਮ ਦੱਸੋ (ਜਿਵੇਂ, 'ਅੰਮ੍ਰਿਤਸਰ ਵਿੱਚ ਮੌਸਮ ਕਿਹੋ ਜਿਹਾ ਹੈ?').",
  or: "ପାଣିପାଗ ସୂଚନା ପାଇଁ ଦୟାକରି ଏକ ସହର କିମ୍ବା ସ୍ଥାନର ନାମ ଉଲ୍ଲେଖ କରନ୍ତୁ (ଯଥା, 'ଭୁବନେଶ୍ୱରରେ ପାଣିପାଗ କିପରି ଅଛି?').",
  as: "বতৰৰ তথ্য জানিবলৈ অনুগ্ৰহ কৰি এখন চহৰ বা স্থানৰ নাম উল্লেখ কৰক (যেনে, 'গুৱাহাটীত বতৰ কেনেকুৱা?').",
  ur: "موسم کی معلومات حاصل کرنے کے لیے براہ کرم کسی شہر یا مقام کا نام بتائیں (مثلاً، 'لاہور میں موسم کیسا ہے؟')۔",
  es: "Por favor, especifica una ciudad o ubicación para ver el clima (por ejemplo, 'Clima en Madrid').",
  fr: "Veuillez préciser une ville ou un lieu pour consulter la météo (par exemple, 'Météo à Paris').",
  de: "Bitte gib eine Stadt oder einen Ort an, um das Wetter abzufragen (z. B. 'Wetter in Berlin').",
  ja: "天気を調べるには、都市名または場所を指定してください（例: 「東京の天気」）。",
  ko: "날씨를 확인하려면 도시나 위치를 지정해 주세요 (예: '서울 날씨').",
  ru: "Пожалуйста, укажите город или место для проверки погоды (например, 'Погода в Москве').",
};

export function getLocalizedLocationRequiredMessage(language: string): string {
  const normLang = language ? language.toLowerCase().trim() : "en";
  return LOCALIZED_LOCATION_PROMPTS[normLang] || LOCALIZED_LOCATION_PROMPTS.en;
}
