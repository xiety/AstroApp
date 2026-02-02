import { Component, input, output, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-date-input',
  imports: [FormsModule],
  templateUrl: './date-input.component.html',
  styleUrls: ['./date-input.component.css']
})
export class DateInputComponent {
  date = input.required<Date>();
  dateChange = output<Date>();

  displayValue = signal('');

  private isEditing = false;

  constructor() {
    effect(() => {
      const d = this.date();
      if (!this.isEditing) {
        this.displayValue.set(this.format(d));
      }
    });
  }

  onInput(val: string) {
    this.isEditing = true;
    this.displayValue.set(val);
  }

  onBlur() {
    this.isEditing = false;
    const val = this.displayValue();
    const parsed = this.parse(val);

    if (parsed) {
      if (parsed.getTime() !== this.date().getTime()) {
        this.dateChange.emit(parsed);
      }
      this.displayValue.set(this.format(parsed));
    } else {
      this.displayValue.set(this.format(this.date()));
    }
  }

  private format(d: Date): string {
    const year = d.getUTCFullYear();
    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = d.getUTCDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parse(s: string): Date | null {
    if (!s) return null;
    const trimmed = s.trim();

    const match = trimmed.match(/^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/);

    if (!match) return null;

    const y = parseInt(match[1], 10);
    const m = match[2] ? parseInt(match[2], 10) : 1;
    const d = match[3] ? parseInt(match[3], 10) : 1;

    if (m < 1 || m > 12) return null;
    if (d < 1 || d > 31) return null;

    const date = new Date(Date.UTC(y, m - 1, d));

    if (isNaN(date.getTime())) return null;
    if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
      return null;
    }
    return date;
  }
}
