import { Component, ChangeDetectionStrategy, signal, computed, ElementRef, viewChild, afterNextRender, inject, DestroyRef, effect } from '@angular/core';
import * as d3 from 'd3';
import { SolarSystemService } from '../services/solar-system.service';
import { StarBackgroundRenderer } from '../renderers/star-background.renderer';
import { OrbitRenderer } from '../renderers/orbit.renderer';
import { TrailRenderer } from '../renderers/trail.renderer';
import { PlanetRenderer } from '../renderers/planet.renderer';
import { LabelRenderer } from '../renderers/label.renderer';
import { SolarSystemState } from '../types';

@Component({
  selector: 'app-solar-system',
  imports: [],
  templateUrl: './solar-system.component.html',
  styleUrls: ['./solar-system.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SolarSystemComponent {
  readonly solarService = inject(SolarSystemService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly starRenderer = inject(StarBackgroundRenderer);
  private readonly orbitRenderer = inject(OrbitRenderer);
  private readonly trailRenderer = inject(TrailRenderer);
  private readonly planetRenderer = inject(PlanetRenderer);
  private readonly labelRenderer = inject(LabelRenderer);

  canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('mainCanvas');
  wrapperRef = viewChild.required<ElementRef<HTMLDivElement>>('canvasWrapper');

  hoveredBody = signal<string | null>(null);

  zoom = signal<d3.ZoomTransform>(d3.zoomIdentity);

  cursorStyle = computed(() => {
    return this.hoveredBody() ? 'pointer' : 'default';
  });

  private d3ZoomBehavior: d3.ZoomBehavior<HTMLDivElement, unknown> | null = null;
  private d3Selection: d3.Selection<HTMLDivElement, unknown, null, undefined> | null = null;

  private animationFrameId: number | null = null;
  private lastTime: number = 0;

  constructor() {
    afterNextRender(() => {
      this.initZoomBehavior();
      this.handleResize();
      this.startLoop();
    });

    effect(() => {
      this.solarService.state();
      this.zoom();
      this.hoveredBody();
      this.solarService.showStars();
      this.solarService.showOrbits();
      this.solarService.showTrails();
      this.solarService.showRetrograde();
      this.solarService.showLabels();

      this.draw();
    });

    effect((onCleanup) => {
      const wrapper = this.wrapperRef().nativeElement;

      const observer = new ResizeObserver(() => this.handleResize());
      observer.observe(wrapper);

      onCleanup(() => observer.disconnect());
    });

    this.destroyRef.onDestroy(() => {
      this.stopLoop();
    });
  }

  onCanvasMouseMove(event: MouseEvent) {
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const currentZoom = this.zoom();
    const k = currentZoom.k;
    const tx = currentZoom.x;
    const ty = currentZoom.y;

    const worldX = (mouseX - tx) / k;
    const worldY = (mouseY - ty) / k;

    const state = this.solarService.state();

    const foundName = this.planetRenderer.getHitBody(
      state.planets,
      worldX,
      worldY,
      k
    );

    if (this.hoveredBody() !== foundName) {
      this.hoveredBody.set(foundName);
    }
  }

  onCanvasClick(event: MouseEvent) {
    if (this.hoveredBody()) {
      this.solarService.setCenter(this.hoveredBody()!);
    }
  }

  onCanvasLeave() {
    this.hoveredBody.set(null);
  }

  private startLoop() {
    if (this.animationFrameId) return;
    this.lastTime = performance.now();

    const loop = (time: number) => {
      const delta = time - this.lastTime;
      this.lastTime = time;

      this.solarService.tick(delta);

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  private stopLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private initZoomBehavior() {
    const wrapper = this.wrapperRef().nativeElement;

    this.d3ZoomBehavior = d3.zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.05, 50])
      .on('zoom', (event) => {
        this.zoom.set(event.transform);
      });

    this.d3Selection = d3.select(wrapper);
    this.d3Selection.call(this.d3ZoomBehavior);
  }

  private handleResize() {
    const wrapper = this.wrapperRef().nativeElement;
    const { width, height } = wrapper.getBoundingClientRect();

    if (width === 0 || height === 0) return;

    const canvas = this.canvasRef().nativeElement;
    const dpr = window.devicePixelRatio || 1;
    const targetW = width * dpr;
    const targetH = height * dpr;

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    this.starRenderer.resize(targetW, targetH);
    this.resetZoom(width, height);

    this.draw();
  }

  private resetZoom(w: number, h: number) {
    if (!this.d3Selection || !this.d3ZoomBehavior) return;

    const maxR = this.solarService.astronomyService.maxSchematicRadius;
    const sceneDiameter = maxR * 2.2;

    const scale = Math.min(w / sceneDiameter, h / sceneDiameter);
    const transform = d3.zoomIdentity
      .translate(w / 2, h / 2)
      .scale(scale);

    this.d3Selection.call(this.d3ZoomBehavior.transform, transform);
  }

  private draw() {
    const canvas = this.canvasRef().nativeElement;
    const state = this.solarService.state();
    const currentZoom = this.zoom();
    const hover = this.hoveredBody();

    const showStars = this.solarService.showStars();
    const showOrbits = this.solarService.showOrbits();
    const showTrails = this.solarService.showTrails();
    const showRetrograde = this.solarService.showRetrograde();
    const showLabels = this.solarService.showLabels();

    this.renderScene(
      canvas,
      state,
      currentZoom,
      hover,
      { showStars, showOrbits, showTrails, showRetrograde, showLabels }
    );
  }

  private renderScene(
    canvas: HTMLCanvasElement,
    state: SolarSystemState,
    zoom: d3.ZoomTransform,
    hoveredBody: string | null,
    options: {
      showStars: boolean,
      showOrbits: boolean,
      showTrails: boolean,
      showRetrograde: boolean,
      showLabels: boolean,
    }
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (options.showStars) {
      this.starRenderer.draw(ctx, canvas.width, canvas.height, zoom);
    }

    ctx.scale(dpr, dpr);
    ctx.translate(zoom.x, zoom.y);
    ctx.scale(zoom.k, zoom.k);

    if (options.showOrbits) {
      this.orbitRenderer.draw(ctx, state.orbits, zoom);
    }

    if (options.showTrails) {
      this.trailRenderer.draw(ctx, state.planets, zoom);
    }

    this.planetRenderer.draw(
      ctx,
      state.planets,
      zoom,
      hoveredBody,
      options.showRetrograde
    );

    if (options.showLabels) {
      this.labelRenderer.draw(
        ctx,
        state.planets,
        zoom,
        hoveredBody
      );
    }
  }
}
