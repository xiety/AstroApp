import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { PlanetViz, RENDER_COLORS } from '../types';
import { drawCirclePath, getVisualScaleRadius } from './renderer-utils';

@Injectable({
  providedIn: 'root'
})
export class PlanetRenderer {
  draw(
    ctx: CanvasRenderingContext2D,
    planets: PlanetViz[],
    zoom: d3.ZoomTransform,
    hoveredBodyName: string | null,
    showRetrograde: boolean
  ) {
    const inverseScale = 1 / zoom.k;

    for (const body of planets) {
      const drawRadius = getVisualScaleRadius(body.radius, zoom.k, 3);

      if (body.name === 'Sun') {
        this.drawSun(ctx, body.x, body.y, drawRadius, body.color);
      } else {
        this.drawPlanet(ctx, body.x, body.y, drawRadius, body.color);
      }

      if (showRetrograde && body.isRetrograde) {
        this.drawRetrogradeRing(ctx, body.x, body.y, drawRadius, inverseScale);
      }

      if (hoveredBodyName === body.name) {
        this.drawSelectionRing(ctx, body.x, body.y, drawRadius, inverseScale);
      }
    }
  }

  getHitBody(
    planets: PlanetViz[],
    worldX: number,
    worldY: number,
    k: number
  ): string | null {
    for (let i = planets.length - 1; i >= 0; i--) {
      const p = planets[i];
      const dx = worldX - p.x;
      const dy = worldY - p.y;
      const dist = Math.hypot(dx, dy);

      let effectiveHitRadius = getVisualScaleRadius(p.radius, k, 3);
      effectiveHitRadius += (5 / k);

      if (dist <= effectiveHitRadius) {
        return p.name;
      }
    }
    return null;
  }

  private drawSun(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
    const glowRadius = r * 4;
    const glowGrad = ctx.createRadialGradient(x, y, r, x, y, glowRadius);
    glowGrad.addColorStop(0, 'rgba(253, 184, 19, 0.4)');
    glowGrad.addColorStop(1, 'rgba(253, 184, 19, 0)');

    ctx.fillStyle = glowGrad;
    drawCirclePath(ctx, x, y, glowRadius);
    ctx.fill();

    ctx.fillStyle = color;
    drawCirclePath(ctx, x, y, r);
    ctx.fill();
  }

  private drawPlanet(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
    ctx.fillStyle = color;
    drawCirclePath(ctx, x, y, r);
    ctx.fill();

    const hlX = x - r * 0.3;
    const hlY = y - r * 0.3;
    const hlR = r * 1.2;

    const grad = ctx.createRadialGradient(hlX, hlY, 0, x, y, hlR);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.1)');

    ctx.fillStyle = grad;
    drawCirclePath(ctx, x, y, r);
    ctx.fill();
  }

  private drawRetrogradeRing(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, inverseScale: number) {
    ctx.strokeStyle = RENDER_COLORS.retrograde;
    ctx.lineWidth = 2 * inverseScale;
    drawCirclePath(ctx, x, y, r + (4 * inverseScale));
    ctx.stroke();
  }

  private drawSelectionRing(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, inverseScale: number) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2 * inverseScale;
    drawCirclePath(ctx, x, y, r + (2 * inverseScale));
    ctx.stroke();
  }
}
