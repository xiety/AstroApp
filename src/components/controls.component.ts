import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { SolarSystemService } from '../services/solar-system.service';
import { DateInputComponent } from './date-input.component';
import { TimeSliderComponent } from './time-slider.component';
import { MS_PER_DAY } from '../types';

@Component({
  selector: 'app-controls',
  imports: [DateInputComponent, TimeSliderComponent],
  templateUrl: './controls.component.html',
  styleUrls: ['./controls.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControlsComponent {
  readonly solarService = inject(SolarSystemService);

  readonly SPEED_OPTIONS = [0.1, 0.5, 1, 2, 5];

  setSpeed(speed: number) {
    this.solarService.setSpeed(speed);
  }

  onStartDateChange(d: Date) {
    this.solarService.setStartDate(d);
  }

  onEndDateChange(d: Date) {
    this.solarService.setEndDate(d);
  }

  onCurrentDateChange(d: Date) {
    const startMs = this.solarService.startDate().getTime();
    const targetMs = d.getTime();
    const days = (targetMs - startMs) / MS_PER_DAY;

    this.solarService.setDaysElapsed(days);
  }
}
