import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { SolarSystemService } from '../services/solar-system.service';
import { UiService } from '../services/ui.service';

@Component({
  selector: 'app-sidebar',
  imports: [],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"state-" + uiService.sidebarState()'
  }
})
export class SidebarComponent {
  readonly solarService = inject(SolarSystemService);
  readonly uiService = inject(UiService);

  onCenterClick(name: string) {
    this.solarService.setCenter(name);
  }
}
