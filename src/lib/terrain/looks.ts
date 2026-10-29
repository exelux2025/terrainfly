export const LOOK_IDS = [
  "alpine",
  "satellite",
  "dawn",
  "golden",
  "night",
  "city",
] as const;

export type TerrainLookId = (typeof LOOK_IDS)[number];
/** @deprecated Use TerrainLookId */
export type TerrainStyleId = TerrainLookId;

export const ROUTE_COLOR_IDS = ["ember", "volt", "ice", "gold", "flare"] as const;
export type RouteColorId = (typeof ROUTE_COLOR_IDS)[number];

export type LightPreset = "day" | "dawn" | "dusk" | "night";

export type RoutePalette = {
  id: RouteColorId;
  label: string;
  line: string;
  casing: string;
  ghost: string;
  start: string;
  finish: string;
  position: string;
};

export type TerrainLook = {
  id: TerrainLookId;
  label: string;
  hint: string;
  swatch: string;
  styleUrl: string;
  kind: "classic" | "standard";
  lightPreset: LightPreset;
  exaggeration: number;
  brightness: number;
  sun: { direction: [number, number]; color: string; intensity: number };
  ambient: { color: string; intensity: number };
  fog: {
    range: [number, number];
    color: string;
    highColor: string;
    spaceColor: string;
    horizonBlend: number;
    starIntensity: number;
  };
  hillshade: {
    exaggeration: number;
    highlight: string;
    shadow: string;
    accent: string;
  };
  sky: {
    sun: [number, number];
    sunIntensity: number;
    atmosphere: string;
    halo: string;
  };
  vegetation?: {
    wood: string;
    grass: string;
    scrub: string;
    crop: string;
    land: string;
    park: string;
  };
  showMapLabels: boolean;
};

export const MIN_EXAGGERATION = 1;
export const MAX_EXAGGERATION = 3.2;
export const MIN_BRIGHTNESS = 0.28;
export const MAX_BRIGHTNESS = 1;

const STANDARD_STYLE =
  process.env.NEXT_PUBLIC_MAPBOX_STYLE_STANDARD ?? "mapbox://styles/mapbox/standard";
const SATELLITE_STYLE =
  process.env.NEXT_PUBLIC_MAPBOX_STYLE_SATELLITE ??
  "mapbox://styles/mapbox/satellite-streets-v12";
const OUTDOORS_STYLE = "mapbox://styles/mapbox/outdoors-v12";
const STREETS_STYLE = "mapbox://styles/mapbox/streets-v12";

export const ROUTE_PALETTES: Record<RouteColorId, RoutePalette> = {
  ember: {
    id: "ember",
    label: "Ember",
    line: "#ff5a2a",
    casing: "#1a120c",
    ghost: "#ffb199",
    start: "#2ee59d",
    finish: "#ff5a2a",
    position: "#fff4cc",
  },
  volt: {
    id: "volt",
    label: "Volt",
    line: "#d4ff1f",
    casing: "#14180a",
    ghost: "#e8ff99",
    start: "#7dffb3",
    finish: "#d4ff1f",
    position: "#ffffff",
  },
  ice: {
    id: "ice",
    label: "Ice",
    line: "#4de2ff",
    casing: "#062028",
    ghost: "#a8f0ff",
    start: "#7dffb3",
    finish: "#4de2ff",
    position: "#ffffff",
  },
  gold: {
    id: "gold",
    label: "Gold",
    line: "#ffd166",
    casing: "#2a1c08",
    ghost: "#ffe6a8",
    start: "#7dffb3",
    finish: "#ff9f1c",
    position: "#fff4cc",
  },
  flare: {
    id: "flare",
    label: "Flare",
    line: "#ff4ecd",
    casing: "#1a0814",
    ghost: "#ffb3e8",
    start: "#7dffb3",
    finish: "#ff4ecd",
    position: "#ffffff",
  },
};

export const LOOKS: Record<TerrainLookId, TerrainLook> = {
  alpine: {
    id: "alpine",
    label: "Alpine",
    hint: "Deep green relief",
    swatch: "linear-gradient(160deg, #7eb6f0 0%, #1f7a3a 42%, #14532d 100%)",
    styleUrl: OUTDOORS_STYLE,
    kind: "classic",
    lightPreset: "day",
    exaggeration: 2.2,
    brightness: 0.78,
    showMapLabels: true,
    sun: { direction: [208, 44], color: "#f3ffe8", intensity: 0.7 },
    ambient: { color: "#d5edd8", intensity: 0.42 },
    fog: {
      range: [0.9, 18],
      color: "#d4ead8",
      highColor: "#8ec9a0",
      spaceColor: "#6aa8e0",
      horizonBlend: 0.016,
      starIntensity: 0,
    },
    hillshade: {
      exaggeration: 0.88,
      highlight: "#eaffd4",
      shadow: "#0f2a18",
      accent: "#1f6b32",
    },
    sky: {
      sun: [0, 70],
      sunIntensity: 15,
      atmosphere: "rgba(132, 196, 168, 1)",
      halo: "rgba(232, 255, 210, 1)",
    },
    vegetation: {
      wood: "#147a3c",
      grass: "#2f9e44",
      scrub: "#4a8c34",
      crop: "#5ea83a",
      land: "#24663a",
      park: "#1c8a42",
    },
  },
  satellite: {
    id: "satellite",
    label: "Satellite",
    hint: "Real-world texture",
    swatch: "linear-gradient(160deg, #6aa4d8 0%, #6b8f4a 42%, #c4a06a 100%)",
    styleUrl: SATELLITE_STYLE,
    kind: "classic",
    lightPreset: "day",
    exaggeration: 1.95,
    brightness: 0.78,
    showMapLabels: false,
    sun: { direction: [205, 42], color: "#fff6e0", intensity: 0.7 },
    ambient: { color: "#f3f7ff", intensity: 0.55 },
    fog: {
      range: [0.6, 14],
      color: "#dceaf8",
      highColor: "#8ec5ff",
      spaceColor: "#6aa8e8",
      horizonBlend: 0.03,
      starIntensity: 0,
    },
    hillshade: {
      exaggeration: 0.55,
      highlight: "#e8ffd2",
      shadow: "#1a2e1c",
      accent: "#3d7a38",
    },
    sky: {
      sun: [0, 70],
      sunIntensity: 14,
      atmosphere: "rgba(140, 190, 250, 1)",
      halo: "rgba(255, 230, 180, 1)",
    },
  },
  dawn: {
    id: "dawn",
    label: "Dawn",
    hint: "Cool morning light",
    swatch: "linear-gradient(160deg, #f7c7a8 0%, #87b7e8 55%, #4a6d9a 100%)",
    styleUrl: STANDARD_STYLE,
    kind: "standard",
    lightPreset: "dawn",
    exaggeration: 1.95,
    brightness: 0.72,
    showMapLabels: false,
    sun: { direction: [120, 28], color: "#ffd2b0", intensity: 0.62 },
    ambient: { color: "#cddfff", intensity: 0.48 },
    fog: {
      range: [0.7, 12],
      color: "#f3d5c4",
      highColor: "#9bb8e4",
      spaceColor: "#5d7aa8",
      horizonBlend: 0.05,
      starIntensity: 0,
    },
    hillshade: {
      exaggeration: 0.5,
      highlight: "#ffe4c8",
      shadow: "#3a4a68",
      accent: "#d09a6a",
    },
    sky: {
      sun: [0, 78],
      sunIntensity: 10,
      atmosphere: "rgba(255, 186, 150, 1)",
      halo: "rgba(255, 220, 180, 1)",
    },
  },
  golden: {
    id: "golden",
    label: "Golden",
    hint: "Warm evening glow",
    swatch: "linear-gradient(160deg, #ffb25a 0%, #e07a4a 45%, #5b3a7a 100%)",
    styleUrl: STANDARD_STYLE,
    kind: "standard",
    lightPreset: "dusk",
    exaggeration: 2,
    brightness: 0.74,
    showMapLabels: false,
    sun: { direction: [250, 24], color: "#ffb060", intensity: 0.66 },
    ambient: { color: "#ffd8b0", intensity: 0.42 },
    fog: {
      range: [0.7, 11],
      color: "#f0c49a",
      highColor: "#e08958",
      spaceColor: "#4a2f6a",
      horizonBlend: 0.06,
      starIntensity: 0.08,
    },
    hillshade: {
      exaggeration: 0.55,
      highlight: "#ffd9a0",
      shadow: "#3a2048",
      accent: "#e09050",
    },
    sky: {
      sun: [0, 82],
      sunIntensity: 11,
      atmosphere: "rgba(255, 160, 90, 1)",
      halo: "rgba(255, 210, 140, 1)",
    },
  },
  night: {
    id: "night",
    label: "Night",
    hint: "Cinematic dark",
    swatch: "linear-gradient(160deg, #1b2a4a 0%, #0d1528 60%, #05070e 100%)",
    styleUrl: STANDARD_STYLE,
    kind: "standard",
    lightPreset: "night",
    exaggeration: 1.75,
    brightness: 0.48,
    showMapLabels: false,
    sun: { direction: [200, 55], color: "#a8c4ff", intensity: 0.28 },
    ambient: { color: "#6f86b8", intensity: 0.28 },
    fog: {
      range: [0.4, 9],
      color: "#0d1524",
      highColor: "#1a2c4c",
      spaceColor: "#05070e",
      horizonBlend: 0.08,
      starIntensity: 0.35,
    },
    hillshade: {
      exaggeration: 0.4,
      highlight: "#c8dcff",
      shadow: "#05070e",
      accent: "#4a5a80",
    },
    sky: {
      sun: [0, 95],
      sunIntensity: 2,
      atmosphere: "rgba(20, 32, 58, 1)",
      halo: "rgba(80, 100, 150, 1)",
    },
  },
  city: {
    id: "city",
    label: "City",
    hint: "Streets & parks",
    swatch: "linear-gradient(160deg, #b9d6f2 0%, #d9e4c8 50%, #cfcfcf 100%)",
    styleUrl: STREETS_STYLE,
    kind: "classic",
    lightPreset: "day",
    exaggeration: 1.45,
    brightness: 0.8,
    showMapLabels: true,
    sun: { direction: [215, 48], color: "#fff7ea", intensity: 0.6 },
    ambient: { color: "#f4f7fb", intensity: 0.58 },
    fog: {
      range: [0.8, 18],
      color: "#e8eef6",
      highColor: "#b7d4f5",
      spaceColor: "#8eb4e0",
      horizonBlend: 0.04,
      starIntensity: 0,
    },
    hillshade: {
      exaggeration: 0.35,
      highlight: "#fffaf0",
      shadow: "#4a5568",
      accent: "#a0aec0",
    },
    sky: {
      sun: [0, 68],
      sunIntensity: 12,
      atmosphere: "rgba(170, 205, 245, 1)",
      halo: "rgba(255, 245, 220, 1)",
    },
    vegetation: {
      wood: "#2f8a4a",
      grass: "#4caf58",
      scrub: "#6aa34a",
      crop: "#7bb84a",
      land: "#d9e4c8",
      park: "#3d9a55",
    },
  },
};

export const DEFAULT_LOOK_ID: TerrainLookId = "alpine";
export const DEFAULT_ROUTE_COLOR: RouteColorId = "ember";

export function getLook(id: TerrainLookId): TerrainLook {
  return LOOKS[id] ?? LOOKS.alpine;
}

export function getRoutePalette(id: RouteColorId): RoutePalette {
  return ROUTE_PALETTES[id] ?? ROUTE_PALETTES.ember;
}

export function getStyleUrl(id: TerrainLookId): string {
  return getLook(id).styleUrl;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function rasterBoost(brightness: number): {
  saturation: number;
  contrast: number;
  brightnessMin: number;
  brightnessMax: number;
} {
  const b = clamp(brightness, 0, 1);
  return {
    saturation: 0.08 + b * 0.52,
    contrast: 0.1 + b * 0.42,
    brightnessMin: 0.0 + b * 0.12,
    brightnessMax: 0.58 + b * 0.34,
  };
}

export function scaledLights(
  look: TerrainLook,
  brightness: number,
): {
  directional: { color: string; intensity: number; direction: [number, number] };
  ambient: { color: string; intensity: number };
} {
  const b = clamp(brightness, 0, 1);
  const amp = 0.45 + b * 0.85;
  return {
    directional: {
      color: look.sun.color,
      direction: look.sun.direction,
      intensity: clamp(look.sun.intensity * amp, 0.12, 1),
    },
    ambient: {
      color: look.ambient.color,
      intensity: clamp(look.ambient.intensity * (0.55 + b * 0.8), 0.12, 1),
    },
  };
}
