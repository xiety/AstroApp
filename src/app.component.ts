import { Component, ChangeDetectionStrategy, ViewEncapsulation, inject } from '@angular/core';
import { SolarSystemComponent } from './components/solar-system.component';
import { SidebarComponent } from './components/sidebar.component';
import { ControlsComponent } from './components/controls.component';
import { UiService } from './services/ui.service';

@Component({
  selector: 'app-root',
  imports: [SolarSystemComponent, SidebarComponent, ControlsComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class AppComponent {
  protected readonly uiService = inject(UiService);
}
