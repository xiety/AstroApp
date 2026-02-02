import { Injectable } from '@angular/core';
import * as Astronomy from 'astronomy-engine';
import { BodyDef, PlanetViz, OrbitViz, SolarSystemState, MS_PER_DAY } from '../types';

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface EclipticPos {
  name: string;
  x: number;
  y: number;
}

interface SimulationSnapshot {
  positions: EclipticPos[];
  rawVectors: Vector3[];
}

@Injectable({
  providedIn: 'root'
})
export class AstronomyService {

  private readonly OBLIQUITY_RAD = 23.43928 * Math.PI / 180;
  private readonly COS_OBL = Math.cos(this.OBLIQUITY_RAD);
  private readonly SIN_OBL = Math.sin(this.OBLIQUITY_RAD);

  private readonly SCHEMATIC_BASE_R = 90;
  private readonly SCHEMATIC_GAP = 65;

  private readonly BASE_TRAIL_DURATION_DAYS = 50;
  private readonly BASE_DT_DAYS = 1;
  private readonly MAX_TRAIL_STEPS = 300;

  readonly bodies: BodyDef[] = [
    { name: 'Sun', color: '#FDB813', radiusPx: 20 },
    { name: 'Mercury', color: '#A5A5A5', radiusPx: 20 },
    { name: 'Venus', color: '#E3BB76', radiusPx: 20 },
    { name: 'Earth', color: '#4F4CB0', radiusPx: 20 },
    { name: 'Mars', color: '#E27B58', radiusPx: 20 },
    { name: 'Jupiter', color: '#C88B3A', radiusPx: 20 },
    { name: 'Saturn', color: '#C5AB6E', radiusPx: 20 },
    { name: 'Uranus', color: '#93B8BE', radiusPx: 20 },
    { name: 'Neptune', color: '#5B6BF3', radiusPx: 20 },
    { name: 'Pluto', color: '#E0C8A0', radiusPx: 20 },
  ];

  readonly availableBodies = this.bodies.map(b => b.name);

  get maxSchematicRadius(): number {
    return this.getSchematicRadius(this.bodies.length - 1);
  }

  computeState(
    date: Date,
    focusIndex: number,
    isHeliocentricView: boolean,
    showTrails: boolean,
    speed: number,
    alignEcliptic: boolean
  ): SolarSystemState {

    const now = this.getSnapshot(date, alignEcliptic);
    const focusCenter2D = now.positions[focusIndex];

    const prevDate = new Date(date.getTime() - MS_PER_DAY);
    const prev = this.getSnapshot(prevDate, alignEcliptic);

    const planets: PlanetViz[] = [];
    const orbits: OrbitViz[] = [];

    const visualCenter = isHeliocentricView
      ? this.getSchematicPos(now, focusIndex)
      : focusCenter2D;

    for (let i = 0; i < this.bodies.length; i++) {
      const def = this.bodies[i];

      let x = 0, y = 0;

      if (isHeliocentricView) {
        const sPos = this.getSchematicPos(now, i);
        x = sPos.x - visualCenter.x;
        y = sPos.y - visualCenter.y;
      } else {
        x = now.positions[i].x - visualCenter.x;
        y = now.positions[i].y - visualCenter.y;

        const r = this.getMappedRingRadius(i, focusIndex);
        const pos = this.polarToCartesian(r, x, y);
        x = pos.x;
        y = pos.y;
      }

      const isRetrograde = this.isRetrograde(i, focusIndex, now, prev);

      let trailPath: string | null = null;
      if (showTrails) {
        trailPath = this.computeTrail(
          date, i, focusIndex,
          isHeliocentricView,
          speed,
          alignEcliptic,
          x, -y
        );
      }

      planets.push({
        name: def.name,
        color: def.color,
        radius: def.radiusPx,
        x: x,
        y: -y,
        isRetrograde,
        trailPath
      });
    }

    if (isHeliocentricView) {
      const shiftX = -visualCenter.x;
      const shiftY = -visualCenter.y;
      for (let i = 1; i < this.bodies.length; i++) {
        orbits.push({
          cx: shiftX,
          cy: -shiftY,
          r: this.getSchematicRadius(i)
        });
      }
    } else {
      for (let i = 0; i < this.bodies.length; i++) {
        if (i === focusIndex) continue;
        const r = this.getMappedRingRadius(i, focusIndex);
        if (r > 0) orbits.push({ cx: 0, cy: 0, r });
      }
    }

    return { planets, orbits };
  }

  private computeTrail(
    startDate: Date,
    bodyIndex: number,
    focusIndex: number,
    isHelio: boolean,
    speed: number,
    alignEcliptic: boolean,
    startX: number,
    startY: number
  ): string {
    const points: string[] = [];
    points.push(`${startX},${startY}`);

    const effectiveSpeed = Math.max(0.1, speed);
    const trailDurationDays = this.BASE_TRAIL_DURATION_DAYS * (effectiveSpeed ** 0.7);
    const dtDays = this.BASE_DT_DAYS * (effectiveSpeed ** 0.3);
    const steps = Math.min(this.MAX_TRAIL_STEPS, Math.ceil(trailDurationDays / dtDays));

    for (let s = 1; s <= steps; s++) {
      const tDate = new Date(startDate.getTime() - (s * dtDays * MS_PER_DAY));

      const snap = this.getSnapshot(tDate, alignEcliptic);

      let tx = 0, ty = 0;

      if (isHelio) {
        const sPosF = this.getSchematicPos(snap, focusIndex);
        const sPosB = this.getSchematicPos(snap, bodyIndex);
        tx = sPosB.x - sPosF.x;
        ty = sPosB.y - sPosF.y;
      } else {
        const p = snap.positions[bodyIndex];
        const c = snap.positions[focusIndex];
        const rx = p.x - c.x;
        const ry = p.y - c.y;
        const r = this.getMappedRingRadius(bodyIndex, focusIndex);
        const pos = this.polarToCartesian(r, rx, ry);
        tx = pos.x;
        ty = pos.y;
      }

      points.push(`${tx},${-ty}`);
    }

    return points.join(' ');
  }

  private getSnapshot(
    date: Date,
    alignEcliptic: boolean
  ): SimulationSnapshot {

    const atTime = Astronomy.MakeTime(date);

    const rawVectors: Vector3[] = this.bodies.map(b => {
      if (b.name === 'Sun') return { x: 0, y: 0, z: 0 };
      const vec = Astronomy.HelioVector(b.name as Astronomy.Body, atTime);
      return { x: vec.x, y: vec.y, z: vec.z };
    });

    const positions: EclipticPos[] = rawVectors.map((vec, i) => {
      let px = vec.x;
      let py = vec.y;

      if (alignEcliptic) {
        py = vec.y * this.COS_OBL + vec.z * this.SIN_OBL;
      }

      return {
        name: this.bodies[i].name,
        x: px,
        y: py
      };
    });

    return { positions, rawVectors };
  }

  private getSchematicPos(snap: SimulationSnapshot, index: number) {
    const pos = snap.positions[index];
    const r = this.getSchematicRadius(index);
    return this.polarToCartesian(r, pos.x, pos.y);
  }

  private getSchematicRadius(index: number): number {
    if (index === 0) return 0;
    return this.SCHEMATIC_BASE_R + (index - 1) * this.SCHEMATIC_GAP;
  }

  private getMappedRingRadius(targetIndex: number, focusIndex: number): number {
    if (targetIndex === focusIndex) return 0;
    const effectiveIndex = targetIndex < focusIndex ? targetIndex + 1 : targetIndex;
    return this.getSchematicRadius(effectiveIndex);
  }

  private polarToCartesian(r: number, rx: number, ry: number) {
    if (r === 0) return { x: 0, y: 0 };
    const dist = Math.hypot(rx, ry);
    if (dist < 1e-6) return { x: r, y: 0 };
    return { x: (rx / dist) * r, y: (ry / dist) * r };
  }

  private isRetrograde(
    i: number,
    f: number,
    now: SimulationSnapshot,
    prev: SimulationSnapshot
  ): boolean {
    if (i === f) return false;

    const rx = now.positions[i].x - now.positions[f].x;
    const ry = now.positions[i].y - now.positions[f].y;

    const rxP = prev.positions[i].x - prev.positions[f].x;
    const ryP = prev.positions[i].y - prev.positions[f].y;

    const vx = rx - rxP;
    const vy = ry - ryP;

    return (rx * vy - ry * vx) < 0;
  }
}
