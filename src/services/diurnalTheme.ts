import { NavSection } from "../components/Sidebar.js";

export type DiurnalPhase = "dawn" | "day" | "golden_hour" | "dusk" | "night";

export interface PageBackgroundConfig {
  photoUrl: string;
  photoAlt: string;
  caption: string;
}

export interface DiurnalPhaseConfig {
  id: DiurnalPhase;
  name: string;
  solarStatusBadge: string;
  stationTelemetrySub: string;
  surfaceTelemetrySubtitle: string;
  accentColor: string;
  accentColorHover: string;
  accentGlow: string;
  iconName: "sunrise" | "sun" | "sunset" | "sparkles" | "moon";
  backgrounds: Record<NavSection, PageBackgroundConfig>;
  darkTheme: {
    overlay: string;
    ambientGlow: string;
    bodyBase: string;
    cardBg: string;
    borderTone: string;
  };
  lightTheme: {
    overlay: string;
    ambientGlow: string;
    bodyBase: string;
    cardBg: string;
    borderTone: string;
  };
}

export function parseMinutes(isoOrTime?: string): number | null {
  if (!isoOrTime) return null;
  const match = isoOrTime.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

export function determineDiurnalPhase(
  timeStr?: string,
  sunriseStr?: string,
  sunsetStr?: string,
  isDay?: boolean
): DiurnalPhase {
  const curMin = parseMinutes(timeStr);
  const riseMin = parseMinutes(sunriseStr);
  const setMin = parseMinutes(sunsetStr);

  if (curMin !== null && riseMin !== null && setMin !== null) {
    // Dawn: 35 minutes before sunrise up to 45 minutes after sunrise
    if (curMin >= riseMin - 35 && curMin <= riseMin + 45) {
      return "dawn";
    }
    // Golden hour: 60 minutes before sunset up to 15 minutes after sunset
    if (curMin >= setMin - 60 && curMin <= setMin + 15) {
      return "golden_hour";
    }
    // Dusk: 15 minutes after sunset up to 75 minutes after sunset
    if (curMin > setMin + 15 && curMin <= setMin + 75) {
      return "dusk";
    }
    // General daytime
    if (curMin > riseMin + 45 && curMin < setMin - 60) {
      return "day";
    }
    // Otherwise nocturnal night
    return "night";
  }

  // Fallback heuristic if sunrise or sunset string is unavailable
  if (isDay) {
    if (curMin !== null && curMin < 9 * 60) return "dawn";
    if (curMin !== null && curMin >= 17 * 60) return "golden_hour";
    return "day";
  } else {
    if (curMin !== null && curMin >= 18 * 60 && curMin < 20 * 60) return "dusk";
    return "night";
  }
}

export const DIURNAL_PHASE_CONFIGS: Record<DiurnalPhase, DiurnalPhaseConfig> = {
  dawn: {
    id: "dawn",
    name: "Dawn & Alpenglow",
    solarStatusBadge: "FIRST LIGHT",
    stationTelemetrySub: "DAWN SOLAR PASS",
    surfaceTelemetrySubtitle: "Atmospheric Telemetry • Morning Dew & Visibility Window",
    accentColor: "#E76F51",
    accentColorHover: "#F4A261",
    accentGlow: "rgba(231, 111, 81, 0.25)",
    iconName: "sunrise",
    backgrounds: {
      home: {
        photoUrl: "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Misty mountain ridge bathed in soft rose dawn light",
        caption: "First light cresting alpine ridgeline",
      },
      forecast: {
        photoUrl: "https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Cirrus cloud ceiling illuminated by dawn colors",
        caption: "Early morning high-altitude cirrus formation",
      },
      insights: {
        photoUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Dew covered mountain trail at sunrise",
        caption: "Wilderness trailhead at daybreak",
      },
      travel: {
        photoUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Winding scenic mountain road at dawn",
        caption: "Morning transit corridor through pass",
      },
      voice: {
        photoUrl: "https://images.unsplash.com/photo-1439853941329-a99ce04a507a?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Quiet mirror lake at early morning twilight",
        caption: "Still acoustic lake at daybreak",
      },
      explore: {
        photoUrl: "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "City skyline silhouettes against soft pink dawn",
        caption: "Global metropolitan skyline at first light",
      },
      history: {
        photoUrl: "https://images.unsplash.com/photo-1502134249126-9f3755a50d78?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Astronomical telemetry instruments at sunrise",
        caption: "Meteorological station morning record",
      },
      settings: {
        photoUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Minimalist dawn landscape horizon",
        caption: "System calibration atmosphere",
      },
      auth: {
        photoUrl: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Golden and rose light breaking through woodland",
        caption: "Secure authentication threshold",
      },
    },
    darkTheme: {
      overlay: "linear-gradient(180deg, rgba(32, 14, 20, 0.45) 0%, rgba(18, 16, 26, 0.68) 50%, rgba(12, 13, 20, 0.88) 100%)",
      ambientGlow: "radial-gradient(circle at 50% -10%, rgba(231, 111, 81, 0.45) 0%, rgba(244, 162, 97, 0.20) 45%, transparent 70%)",
      bodyBase: "#140E14",
      cardBg: "rgba(26, 20, 28, 0.78)",
      borderTone: "rgba(231, 111, 81, 0.35)",
    },
    lightTheme: {
      overlay: "linear-gradient(180deg, rgba(255, 230, 222, 0.45) 0%, rgba(255, 244, 240, 0.75) 50%, rgba(246, 248, 252, 0.92) 100%)",
      ambientGlow: "radial-gradient(circle at 50% -10%, rgba(231, 111, 81, 0.35) 0%, transparent 60%)",
      bodyBase: "#FBF5F2",
      cardBg: "rgba(255, 255, 255, 0.88)",
      borderTone: "rgba(231, 111, 81, 0.40)",
    },
  },
  day: {
    id: "day",
    name: "Solar Apex / Midday",
    solarStatusBadge: "SOLAR APEX",
    stationTelemetrySub: "DIURNAL SOLAR PEAK",
    surfaceTelemetrySubtitle: "Atmospheric Telemetry • Solar Radiation & Thermal Apex",
    accentColor: "#38BDF8",
    accentColorHover: "#60A5FA",
    accentGlow: "rgba(56, 189, 248, 0.30)",
    iconName: "sun",
    backgrounds: {
      home: {
        photoUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Crisp sunlit alpine mountain peaks under clear blue sky",
        caption: "Direct solar apex over alpine summits",
      },
      forecast: {
        photoUrl: "https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Expansive azure sky with scattered cumulus clouds",
        caption: "Midday tropospheric cumulus development",
      },
      insights: {
        photoUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Sunlit open mountain trail and ridge",
        caption: "Peak solar conditions for outdoor expeditions",
      },
      travel: {
        photoUrl: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Sunny highway corridor stretching to horizon",
        caption: "Clear visibility along major transit corridor",
      },
      voice: {
        photoUrl: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Sunlit panoramic green mountain valley",
        caption: "Open valley acoustic panorama",
      },
      explore: {
        photoUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Modern global architecture under direct daylight",
        caption: "Global urban hubs in clear daylight",
      },
      history: {
        photoUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Orbital earth observation and cloud telemetry",
        caption: "Satellite solar observation array",
      },
      settings: {
        photoUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Clean daylit mountain landscape",
        caption: "Solar telemetry configuration",
      },
      auth: {
        photoUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Pristine sunlit mountain summits",
        caption: "Secure daylight authentication",
      },
    },
    darkTheme: {
      overlay: "linear-gradient(180deg, rgba(12, 28, 48, 0.45) 0%, rgba(10, 20, 32, 0.68) 50%, rgba(8, 14, 24, 0.88) 100%)",
      ambientGlow: "radial-gradient(circle at 50% -10%, rgba(56, 189, 248, 0.45) 0%, rgba(96, 165, 250, 0.20) 45%, transparent 70%)",
      bodyBase: "#0B1522",
      cardBg: "rgba(16, 26, 40, 0.78)",
      borderTone: "rgba(56, 189, 248, 0.35)",
    },
    lightTheme: {
      overlay: "linear-gradient(180deg, rgba(215, 238, 255, 0.45) 0%, rgba(235, 246, 255, 0.75) 50%, rgba(246, 248, 252, 0.92) 100%)",
      ambientGlow: "radial-gradient(circle at 50% -10%, rgba(56, 189, 248, 0.35) 0%, transparent 60%)",
      bodyBase: "#EEF6FC",
      cardBg: "rgba(255, 255, 255, 0.88)",
      borderTone: "rgba(56, 189, 248, 0.40)",
    },
  },
  golden_hour: {
    id: "golden_hour",
    name: "Golden Hour",
    solarStatusBadge: "GOLDEN HOUR",
    stationTelemetrySub: "GOLDEN HOUR TRANSITION",
    surfaceTelemetrySubtitle: "Atmospheric Telemetry • Evening Sunburst & Optical Horizon",
    accentColor: "#F4A261",
    accentColorHover: "#E76F51",
    accentGlow: "rgba(244, 162, 97, 0.35)",
    iconName: "sunset",
    backgrounds: {
      home: {
        photoUrl: "https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Warm mountain sunset with glowing golden radiance",
        caption: "Golden hour sunburst illuminating ridge peaks",
      },
      forecast: {
        photoUrl: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Fiery orange and amber clouds at sunset",
        caption: "Evening optical horizon and stratospheric glow",
      },
      insights: {
        photoUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Golden light bathing coastal trail",
        caption: "Prime evening window for low-UV recreation",
      },
      travel: {
        photoUrl: "https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Highway toward setting golden sun",
        caption: "Sunset road transition and evening glare index",
      },
      voice: {
        photoUrl: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Golden sunlight filtering through forest canopy",
        caption: "Resonant evening acoustic landscape",
      },
      explore: {
        photoUrl: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Glowing golden hour over metropolis bridges",
        caption: "International hubs in evening radiance",
      },
      history: {
        photoUrl: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Atmospheric solar limb of earth from space",
        caption: "Orbital sunset synoptic record",
      },
      settings: {
        photoUrl: "https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Golden sunset horizon",
        caption: "Warm calibration perspective",
      },
      auth: {
        photoUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Golden coastal sunset",
        caption: "Secure evening portal",
      },
    },
    darkTheme: {
      overlay: "linear-gradient(180deg, rgba(46, 24, 12, 0.48) 0%, rgba(26, 18, 18, 0.68) 50%, rgba(14, 12, 18, 0.88) 100%)",
      ambientGlow: "radial-gradient(circle at 50% -10%, rgba(244, 162, 97, 0.50) 0%, rgba(231, 111, 81, 0.25) 45%, transparent 70%)",
      bodyBase: "#1A110E",
      cardBg: "rgba(32, 22, 20, 0.78)",
      borderTone: "rgba(244, 162, 97, 0.40)",
    },
    lightTheme: {
      overlay: "linear-gradient(180deg, rgba(255, 236, 210, 0.45) 0%, rgba(255, 248, 238, 0.75) 50%, rgba(246, 248, 252, 0.92) 100%)",
      ambientGlow: "radial-gradient(circle at 50% -10%, rgba(244, 162, 97, 0.35) 0%, transparent 60%)",
      bodyBase: "#FCF6ED",
      cardBg: "rgba(255, 255, 255, 0.88)",
      borderTone: "rgba(244, 162, 97, 0.45)",
    },
  },
  dusk: {
    id: "dusk",
    name: "Nautical Dusk & Twilight",
    solarStatusBadge: "CIVIL DUSK",
    stationTelemetrySub: "TWILIGHT HORIZON PASS",
    surfaceTelemetrySubtitle: "Atmospheric Telemetry • Twilight Cooling & Barometric Shift",
    accentColor: "#C084FC",
    accentColorHover: "#E879F9",
    accentGlow: "rgba(192, 132, 252, 0.35)",
    iconName: "sparkles",
    backgrounds: {
      home: {
        photoUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Alpine twilight silhouette with deep violet and indigo gradient",
        caption: "Nautical twilight settling over mountain ranges",
      },
      forecast: {
        photoUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Indigo dusk clouds with purple twilight horizon",
        caption: "Post-sunset barometric boundary shift",
      },
      insights: {
        photoUrl: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Twilight mountain valley with cool dusk atmosphere",
        caption: "Evening wind shifts and radiative cooling",
      },
      travel: {
        photoUrl: "https://images.unsplash.com/photo-1494783367193-149034c05e8f?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Winding highway with illuminated vehicles at twilight",
        caption: "Nightfall road transit conditions",
      },
      voice: {
        photoUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Ethereal twilight horizon with faint stars",
        caption: "Twilight acoustic calm",
      },
      explore: {
        photoUrl: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "City skyline at twilight with reflections on bay",
        caption: "Metropolitan nightfall and civil dusk",
      },
      history: {
        photoUrl: "https://images.unsplash.com/photo-1447433589675-4aaa569f3e05?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Twilight ionosphere and satellite horizon",
        caption: "Civil dusk atmospheric record",
      },
      settings: {
        photoUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Deep violet dusk mountain ridges",
        caption: "Twilight calibration palette",
      },
      auth: {
        photoUrl: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Twilight city reflection",
        caption: "Secure dusk portal",
      },
    },
    darkTheme: {
      overlay: "linear-gradient(180deg, rgba(32, 14, 46, 0.50) 0%, rgba(18, 14, 32, 0.68) 50%, rgba(10, 10, 22, 0.88) 100%)",
      ambientGlow: "radial-gradient(circle at 50% -10%, rgba(192, 132, 252, 0.45) 0%, rgba(147, 51, 234, 0.20) 45%, transparent 70%)",
      bodyBase: "#130C1E",
      cardBg: "rgba(24, 16, 36, 0.78)",
      borderTone: "rgba(192, 132, 252, 0.35)",
    },
    lightTheme: {
      overlay: "linear-gradient(180deg, rgba(242, 226, 255, 0.45) 0%, rgba(248, 242, 255, 0.75) 50%, rgba(246, 248, 252, 0.92) 100%)",
      ambientGlow: "radial-gradient(circle at 50% -10%, rgba(192, 132, 252, 0.35) 0%, transparent 60%)",
      bodyBase: "#FAF4FD",
      cardBg: "rgba(255, 255, 255, 0.88)",
      borderTone: "rgba(192, 132, 252, 0.40)",
    },
  },
  night: {
    id: "night",
    name: "Starlight Night",
    solarStatusBadge: "NIGHT HORIZON",
    stationTelemetrySub: "NOCTURNAL OBSERVATION",
    surfaceTelemetrySubtitle: "Atmospheric Telemetry • Nocturnal Radiative Cooling & Starlight",
    accentColor: "#8ECAE6",
    accentColorHover: "#A5D8FF",
    accentGlow: "rgba(142, 202, 230, 0.30)",
    iconName: "moon",
    backgrounds: {
      home: {
        photoUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Deep nocturnal starfield and nebula above mountain ridges",
        caption: "Nocturnal starlight and alpine horizon",
      },
      forecast: {
        photoUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Moonlit night sky with illuminated cloud silhouettes",
        caption: "Nocturnal radiative cooling forecast model",
      },
      insights: {
        photoUrl: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Starry sky above quiet mountain camp",
        caption: "Starlight astronomy and nocturnal trail suitability",
      },
      travel: {
        photoUrl: "https://images.unsplash.com/photo-1502481851512-e9e2529bfbf9?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Nocturnal highway beneath brilliant Milky Way",
        caption: "Night transit visibility & road surface freeze detection",
      },
      voice: {
        photoUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Quiet cosmic night sky",
        caption: "Nocturnal voice ambient space",
      },
      explore: {
        photoUrl: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Glittering midnight skyline with starry sky",
        caption: "Global urban nocturnal telemetry",
      },
      history: {
        photoUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Deep space nebula and earth limb",
        caption: "Cosmic historical atmospheric records",
      },
      settings: {
        photoUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Cosmic starfield horizon",
        caption: "Nocturnal calibration parameters",
      },
      auth: {
        photoUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=2000&q=85",
        photoAlt: "Starlit mountain gateway",
        caption: "Secure nocturnal session entrance",
      },
    },
    darkTheme: {
      overlay: "linear-gradient(180deg, rgba(8, 14, 28, 0.40) 0%, rgba(6, 10, 20, 0.68) 50%, rgba(4, 7, 14, 0.88) 100%)",
      ambientGlow: "radial-gradient(circle at 50% -10%, rgba(142, 202, 230, 0.40) 0%, rgba(56, 189, 248, 0.15) 45%, transparent 70%)",
      bodyBase: "#060A12",
      cardBg: "rgba(12, 18, 28, 0.78)",
      borderTone: "rgba(142, 202, 230, 0.30)",
    },
    lightTheme: {
      overlay: "linear-gradient(180deg, rgba(215, 228, 245, 0.45) 0%, rgba(232, 240, 250, 0.75) 50%, rgba(246, 248, 252, 0.92) 100%)",
      ambientGlow: "radial-gradient(circle at 50% -10%, rgba(142, 202, 230, 0.35) 0%, transparent 60%)",
      bodyBase: "#EFF4FA",
      cardBg: "rgba(255, 255, 255, 0.88)",
      borderTone: "rgba(142, 202, 230, 0.40)",
    },
  },
};
