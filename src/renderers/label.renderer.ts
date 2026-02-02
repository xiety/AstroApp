import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { PlanetViz, RENDER_COLORS } from '../types';

@Injectable({
  providedIn: 'root'
})
export class LabelRenderer {
  draw(
    ctx: CanvasRenderingContext2D,
    planets: PlanetViz[],
    zoom: d3.ZoomTransform,
    hoveredBodyName: string | null
  ) {
    const inverseScale = 1 / zoom.k;

    ctx.fillStyle = RENDER_COLORS.textMuted;
    const fontSize = 11 * inverseScale;
    ctx.font = `500 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;

    for (const body of planets) {
      const isActive = hoveredBodyName === body.name;
      ctx.fillStyle = isActive ? RENDER_COLORS.textMain : RENDER_COLORS.textMuted;

      let offset = 8 * inverseScale;
      if (body.name === 'Sun') offset += (body.radius * 0.5);

      const yOffset = body.radius + offset;
      ctx.fillText(body.name, body.x, body.y + yOffset);
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }
}
