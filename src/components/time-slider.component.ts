import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SolarSystemService } from '../services/solar-system.service';
import { MS_PER_DAY } from '../types';

@Component({
  selector: 'app-time-slider',
  imports: [DatePipe],
  templateUrl: './time-slider.component.html',
  styleUrls: ['./time-slider.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimeSliderComponent {
  readonly solarService = inject(SolarSystemService);

  hoverDate = signal<Date | null>(null);
  tooltipX = signal<number>(0);

  onTimeSliderChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.solarService.setDaysElapsed(parseFloat(input.value));
  }

  onSliderHover(event: MouseEvent) {
    const wrapper = event.currentTarget as HTMLElement;
    const rect = wrapper.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const width = rect.width;

    const padding = 9;

    if (x < padding || x > width - padding) {
      this.hoverDate.set(null);
      return;
    }

    const effectiveWidth = width - (padding * 2);

    let percent = (x - padding) / effectiveWidth;
    percent = Math.max(0, Math.min(1, percent));

    this.tooltipX.set(x);

    const totalDays = this.solarService.totalDays();
    const daysOffset = Math.round(percent * totalDays);

    const startMs = this.solarService.startDate().getTime();
    const targetMs = startMs + (daysOffset * MS_PER_DAY);

    this.hoverDate.set(new Date(targetMs));
  }

  onSliderLeave() {
    this.hoverDate.set(null);
  }
}
