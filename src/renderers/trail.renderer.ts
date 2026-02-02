import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { PlanetViz, RENDER_COLORS } from '../types';

@Injectable({
  providedIn: 'root'
})
export class TrailRenderer {
  draw(ctx: CanvasRenderingContext2D, planets: PlanetViz[], zoom: d3.ZoomTransform) {
    const inverseScale = 1 / zoom.k;

    ctx.lineWidth = 1.5 * inverseScale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const body of planets) {
      if (!body.trailPath) continue;

      const points = body.trailPath.split(' ').map(p => {
        const [x, y] = p.split(',').map(Number);
        return { x, y };
      });

      if (points.length < 2) continue;

      ctx.strokeStyle = body.color;
      ctx.globalAlpha = RENDER_COLORS.trailOpacity;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }

      ctx.stroke();
    }

    ctx.globalAlpha = 1.0;
  }
}
