import { Injectable, signal, computed, inject } from '@angular/core';
import { AstronomyService } from './astronomy.service';
import { MS_PER_DAY } from '../types';

@Injectable({
  providedIn: 'root'
})
export class SolarSystemService {
  readonly astronomyService = inject(AstronomyService);

  private readonly DAYS_PER_YEAR = 365.25;
  private readonly REALTIME_MS_PER_YEAR = 3000;

  readonly availableBodies = this.astronomyService.availableBodies;

  private readonly INITIAL_START_DATE = new Date(Date.UTC(1970, 0, 1));

  startDate = signal<Date>(this.INITIAL_START_DATE);
  endDate = signal<Date>(new Date());

  currentDate = signal<Date>(new Date(this.INITIAL_START_DATE.getTime()));

  selectedCenter = signal<string>('Sun');
  isHeliocentric = signal<boolean>(false);
  showOrbits = signal<boolean>(false);
  showTrails = signal<boolean>(true);
  showRetrograde = signal<boolean>(true);
  showLabels = signal<boolean>(true);
  showStars = signal<boolean>(true);

  alignEcliptic = signal<boolean>(true);

  isPlaying = signal<boolean>(false);
  simulationSpeed = signal<number>(1);

  totalDays = computed(() => {
    const start = this.startDate().getTime();
    const end = this.endDate().getTime();
    return Math.floor((end - start) / MS_PER_DAY);
  });

  daysElapsed = computed(() => {
    const start = this.startDate().getTime();
    const current = this.currentDate().getTime();
    return (current - start) / MS_PER_DAY;
  });

  focusIndex = computed(() => {
    const name = this.selectedCenter();
    const idx = this.astronomyService.bodies.findIndex(b => b.name === name);
    return idx === -1 ? 0 : idx;
  });

  readonly state = computed(() => {
    return this.astronomyService.computeState(
      this.currentDate(),
      this.focusIndex(),
      this.isHeliocentric(),
      this.showTrails(),
      this.simulationSpeed(),
      this.alignEcliptic()
    );
  });


  togglePlay() {
    this.isPlaying.update(v => !v);
  }

  setSpeed(speed: number) {
    this.simulationSpeed.set(speed);
  }

  setCenter(name: string) {
    this.selectedCenter.set(name);
  }

  toggleHeliocentric() {
    this.isHeliocentric.update(v => !v);
  }

  toggleOrbits() {
    this.showOrbits.update(v => !v);
  }

  toggleTrails() {
    this.showTrails.update(v => !v);
  }

  toggleRetrograde() {
    this.showRetrograde.update(v => !v);
  }

  toggleLabels() {
    this.showLabels.update(v => !v);
  }

  toggleStars() {
    this.showStars.update(v => !v);
  }

  toggleAlignEcliptic() {
    this.alignEcliptic.update(v => !v);
  }

  setStartDate(d: Date) {
    if (d.getTime() > this.endDate().getTime()) {
      this.endDate.set(d);
    }

    this.startDate.set(d);

    if (this.currentDate().getTime() < d.getTime()) {
      this.currentDate.set(d);
    }
  }

  setEndDate(d: Date) {
    if (d.getTime() < this.startDate().getTime()) {
      this.startDate.set(d);
    }

    this.endDate.set(d);

    if (this.currentDate().getTime() > d.getTime()) {
      this.currentDate.set(d);
    }
  }

  setDaysElapsed(days: number) {
    const startMs = this.startDate().getTime();
    const targetMs = startMs + (days * MS_PER_DAY);
    const endMs = this.endDate().getTime();

    let newMs = targetMs;
    if (newMs < startMs) newMs = startMs;
    if (newMs > endMs) newMs = endMs;

    this.currentDate.set(new Date(newMs));
  }

  tick(deltaMs: number) {
    if (!this.isPlaying()) return;

    const daysPerMs = (this.DAYS_PER_YEAR / this.REALTIME_MS_PER_YEAR) * this.simulationSpeed();
    const simMsToAdd = deltaMs * daysPerMs * MS_PER_DAY;

    const nextTime = this.currentDate().getTime() + simMsToAdd;
    const endTime = this.endDate().getTime();
    const startTime = this.startDate().getTime();

    if (nextTime > endTime) {
      this.currentDate.set(new Date(startTime));
    } else {
      this.currentDate.set(new Date(nextTime));
    }
  }
}
