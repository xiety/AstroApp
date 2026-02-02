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
      if (showTrails && i !== focusIndex) {
        trailPath = this.computeTrail(
          date, i, focusIndex,
          isHeliocentricView,
          alignEcliptic,
          x, -y,
          now
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

  private getOrbitalPeriodDays(index: number, snap: SimulationSnapshot): number {
    if (index === 0) return 0;
    const v = snap.rawVectors[index];
    const rAU = Math.hypot(v.x, v.y, v.z);
    return 365.25 * rAU * Math.sqrt(rAU);
  }

  private getSchematicSpeed(index: number, snap: SimulationSnapshot): number {
    if (index === 0) return 0;
    const R = this.getSchematicRadius(index);
    const period = this.getOrbitalPeriodDays(index, snap);
    if (period === 0) return 0;
    return (2 * Math.PI * R) / period;
  }

  private getScreenPosFromVectors(
    bodyIndex: number,
    focusIndex: number,
    isHelio: boolean,
    alignEcliptic: boolean,
    vB: Vector3,
    vF: Vector3
  ): { x: number, y: number; } {
    let pBx = vB.x;
    let pBy = alignEcliptic ? vB.y * this.COS_OBL + vB.z * this.SIN_OBL : vB.y;

    let pFx = vF.x;
    let pFy = alignEcliptic ? vF.y * this.COS_OBL + vF.z * this.SIN_OBL : vF.y;

    if (isHelio) {
      const rB = this.getSchematicRadius(bodyIndex);
      const posB = this.polarToCartesian(rB, pBx, pBy);

      const rF = this.getSchematicRadius(focusIndex);
      const posF = this.polarToCartesian(rF, pFx, pFy);

      return { x: posB.x - posF.x, y: posB.y - posF.y };
    } else {
      const rx = pBx - pFx;
      const ry = pBy - pFy;
      const r = this.getMappedRingRadius(bodyIndex, focusIndex);
      return this.polarToCartesian(r, rx, ry);
    }
  }

  private computeTrail(
    startDate: Date,
    bodyIndex: number,
    focusIndex: number,
    isHelio: boolean,
    alignEcliptic: boolean,
    startX: number,
    startY: number,
    nowSnap: SimulationSnapshot
  ): string {
    const points: string[] = [];
    points.push(`${startX},${startY}`);

    let v_avg = 0.01;
    const periodB = this.getOrbitalPeriodDays(bodyIndex, nowSnap) || 365.25;

    if (isHelio) {
      const speedB = this.getSchematicSpeed(bodyIndex, nowSnap);
      const speedF = this.getSchematicSpeed(focusIndex, nowSnap);
      v_avg = speedB + speedF;
    } else {
      const rB = Math.hypot(nowSnap.rawVectors[bodyIndex].x, nowSnap.rawVectors[bodyIndex].y, nowSnap.rawVectors[bodyIndex].z);
      const rF = Math.hypot(nowSnap.rawVectors[focusIndex].x, nowSnap.rawVectors[focusIndex].y, nowSnap.rawVectors[focusIndex].z);
      const periodF = this.getOrbitalPeriodDays(focusIndex, nowSnap) || 365.25;

      const omegaB = (2 * Math.PI) / periodB;
      const omegaF = (2 * Math.PI) / periodF;

      const omega_avg = omegaB + omegaF * (Math.min(rB, rF) / Math.max(rB, rF));
      const R = this.getMappedRingRadius(bodyIndex, focusIndex);
      v_avg = R * omega_avg;
    }

    if (v_avg < 0.001) v_avg = 0.001;

    const targetTrailLength = 100;
    let trailDays = targetTrailLength / v_avg;

    if (trailDays > periodB / 8) {
      trailDays = periodB / 8;
    }

    const maxSteps = 15;
    const dtDays = trailDays / maxSteps;

    const bodyName = this.bodies[bodyIndex].name as Astronomy.Body;
    const focusName = this.bodies[focusIndex].name as Astronomy.Body;

    for (let s = 1; s <= maxSteps; s++) {
      const tDate = new Date(startDate.getTime() - (s * dtDays * MS_PER_DAY));
      const atTime = Astronomy.MakeTime(tDate);

      let vB: Vector3 = { x: 0, y: 0, z: 0 };
      if (bodyIndex !== 0) {
        const vec = Astronomy.HelioVector(bodyName, atTime);
        vB = { x: vec.x, y: vec.y, z: vec.z };
      }

      let vF: Vector3 = { x: 0, y: 0, z: 0 };
      if (focusIndex !== 0) {
        const vec = Astronomy.HelioVector(focusName, atTime);
        vF = { x: vec.x, y: vec.y, z: vec.z };
      }

      const pos = this.getScreenPosFromVectors(bodyIndex, focusIndex, isHelio, alignEcliptic, vB, vF);
      points.push(`${pos.x},${-pos.y}`);
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

    const getEcliptic = (snap: SimulationSnapshot, index: number) => {
      const v = snap.rawVectors[index];
      return {
        x: v.x,
        y: v.y * this.COS_OBL + v.z * this.SIN_OBL
      };
    };

    const nowI = getEcliptic(now, i);
    const nowF = getEcliptic(now, f);
    const prevI = getEcliptic(prev, i);
    const prevF = getEcliptic(prev, f);

    const rx = nowI.x - nowF.x;
    const ry = nowI.y - nowF.y;

    const rxP = prevI.x - prevF.x;
    const ryP = prevI.y - prevF.y;

    const vx = rx - rxP;
    const vy = ry - ryP;

    return (rx * vy - ry * vx) < 0;
  }
}
