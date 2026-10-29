import { describe, expect, it } from "vitest";
import {
  LOOK_IDS,
  LOOKS,
  clamp,
  getLook,
  getRoutePalette,
  getStyleUrl,
  rasterBoost,
  scaledLights,
} from "@/lib/terrain/looks";

describe("terrain looks", () => {
  it("exposes six cinematic looks with unique labels", () => {
    expect(LOOK_IDS).toHaveLength(6);
    const labels = LOOK_IDS.map((id) => LOOKS[id].label);
    expect(new Set(labels).size).toBe(6);
  });

  it("shares a Mapbox Standard style across dawn, golden, and night", () => {
    expect(getStyleUrl("dawn")).toBe(getStyleUrl("golden"));
    expect(getStyleUrl("golden")).toBe(getStyleUrl("night"));
    expect(getLook("dawn").lightPreset).toBe("dawn");
    expect(getLook("golden").lightPreset).toBe("dusk");
    expect(getLook("night").lightPreset).toBe("night");
  });

  it("boosts raster brightness as the slider increases", () => {
    const dim = rasterBoost(0.3);
    const bright = rasterBoost(0.9);
    expect(bright.brightnessMax).toBeGreaterThan(dim.brightnessMax);
    expect(bright.saturation).toBeGreaterThan(dim.saturation);
    expect(bright.brightnessMin).toBeGreaterThan(dim.brightnessMin);
  });

  it("scales sun intensity with brightness without exceeding 1", () => {
    const look = getLook("alpine");
    const dim = scaledLights(look, 0.3);
    const bright = scaledLights(look, 1);
    expect(bright.directional.intensity).toBeGreaterThan(dim.directional.intensity);
    expect(bright.ambient.intensity).toBeLessThanOrEqual(1);
    expect(clamp(4, 1, 3.2)).toBe(3.2);
  });

  it("returns named route palettes", () => {
    expect(getRoutePalette("ice").line).toMatch(/^#/);
    expect(getRoutePalette("ember").label).toBe("Ember");
  });

  it("gives alpine deep greens and a stronger grade", () => {
    const alpine = getLook("alpine");
    expect(alpine.vegetation?.wood).toBe("#147a3c");
    expect(alpine.vegetation?.grass).toBe("#2f9e44");
    expect(alpine.hillshade.accent).toBe("#1f6b32");
    const boost = rasterBoost(alpine.brightness);
    expect(boost.contrast).toBeGreaterThan(0.35);
    expect(boost.saturation).toBeGreaterThan(0.4);
  });
});
