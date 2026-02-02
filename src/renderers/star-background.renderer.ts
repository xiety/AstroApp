import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { Star, StarLayer } from '../types';

interface CachedLayer {
  canvas: HTMLCanvasElement;
  data: StarLayer;
}

@Injectable({
  providedIn: 'root'
})
export class StarBackgroundRenderer {
  private readonly TILE_SIZE = 1024;
  private layersCache: CachedLayer[] = [];

  constructor() {
    const layers: StarLayer[] = [
      {
        speed: 0.02,
        stars: this.generateStars(600, 0.5, 1.0, 0.1, 0.4)
      },
      {
        speed: 0.06,
        stars: this.generateStars(200, 0.8, 1.3, 0.2, 0.5)
      },
      {
        speed: 0.12,
        stars: this.generateStars(60, 1.2, 1.8, 0.3, 0.6)
      }
    ];

    this.layersCache = layers.map(layer => ({
      canvas: document.createElement('canvas'),
      data: layer
    }));

    this.updateTiles();
  }

  resize(width: number, height: number) {
    this.updateTiles();
  }

  private updateTiles() {
    const dpr = window.devicePixelRatio || 1;
    const targetSize = this.TILE_SIZE * dpr;

    let updated = false;

    this.layersCache.forEach(layer => {
      if (layer.canvas.width !== targetSize || layer.canvas.height !== targetSize) {
        layer.canvas.width = targetSize;
        layer.canvas.height = targetSize;
        this.renderLayerToCache(layer.canvas, layer.data.stars);
        updated = true;
      }
    });
  }

  draw(
    ctx: CanvasRenderingContext2D,
    viewWidth: number,
    viewHeight: number,
    zoom: d3.ZoomTransform
  ) {
    const dpr = window.devicePixelRatio || 1;
    const physicalTileSize = this.TILE_SIZE * dpr;

    for (const layer of this.layersCache) {
      const parallaxFactor = layer.data.speed;

      const globalOffsetX = zoom.x * parallaxFactor * dpr;
      const globalOffsetY = zoom.y * parallaxFactor * dpr;

      let startX = globalOffsetX % physicalTileSize;
      let startY = globalOffsetY % physicalTileSize;

      if (startX > 0) startX -= physicalTileSize;
      if (startY > 0) startY -= physicalTileSize;

      for (let x = startX; x < viewWidth; x += physicalTileSize) {
        for (let y = startY; y < viewHeight; y += physicalTileSize) {
          ctx.drawImage(layer.canvas, Math.floor(x), Math.floor(y));
        }
      }
    }
  }

  private generateStars(
    count: number,
    minR: number, maxR: number,
    minA: number, maxA: number
  ): Star[] {
    const stars: Star[] = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        r: minR + Math.random() * (maxR - minR),
        alpha: minA + Math.random() * (maxA - minA)
      });
    }
    return stars;
  }

  private renderLayerToCache(ctxCanvas: HTMLCanvasElement, stars: Star[]) {
    const ctx = ctxCanvas.getContext('2d');
    if (!ctx) return;

    const w = ctxCanvas.width;
    const h = ctxCanvas.height;
    const dpr = window.devicePixelRatio || 1;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#FFFFFF';

    for (const s of stars) {
      const x = s.x * w;
      const y = s.y * h;
      const r = s.r * dpr;

      ctx.globalAlpha = s.alpha;

      const draw = (cx: number, cy: number) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.fill();
      };

      draw(x, y);

      if (x < r) draw(x + w, y);
      if (x > w - r) draw(x - w, y);

      if (y < r) draw(x, y + h);
      if (y > h - r) draw(x, y - h);

      if (x < r && y < r) draw(x + w, y + h);
      if (x > w - r && y > h - r) draw(x - w, y - h);
      if (x < r && y > h - r) draw(x + w, y - h);
      if (x > w - r && y < r) draw(x - w, y + h);
    }

    ctx.globalAlpha = 1.0;
  }
}
