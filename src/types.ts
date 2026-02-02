export const MS_PER_DAY = 86400000;

export const RENDER_COLORS = {
  textMuted: '#a1a1aa',
  textMain: '#f4f4f5',
  border: '#3f3f46',
  retrograde: '#ef4444',
  trailOpacity: 0.5
};

export interface BodyDef {
  name: string;
  color: string;
  radiusPx: number;
}

export interface PlanetViz {
  name: string;
  color: string;
  radius: number;
  x: number;
  y: number;
  isRetrograde: boolean;
  trailPath: string | null;
}

export interface OrbitViz {
  cx: number;
  cy: number;
  r: number;
}

export interface SolarSystemState {
  planets: PlanetViz[];
  orbits: OrbitViz[];
}

export interface Star {
  x: number;
  y: number;
  r: number;
  alpha: number;
}

export interface StarLayer {
  speed: number;
  stars: Star[];
}
