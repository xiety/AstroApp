import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { OrbitViz, RENDER_COLORS } from '../types';

@Injectable({
  providedIn: 'root'
})
export class OrbitRenderer {
  draw(ctx: CanvasRenderingContext2D, orbits: OrbitViz[], zoom: d3.ZoomTransform) {
    const inverseScale = 1 / zoom.k;

    ctx.strokeStyle = RENDER_COLORS.border;
    ctx.lineWidth = 1 * inverseScale;
    ctx.beginPath();

    for (const orbit of orbits) {
      ctx.moveTo(orbit.cx + orbit.r, orbit.cy);
      ctx.arc(orbit.cx, orbit.cy, orbit.r, 0, 2 * Math.PI);
    }

    ctx.stroke();
  }
}
