import { Injectable, signal } from '@angular/core';

export type SidebarState = 'auto' | 'open' | 'closed';

@Injectable({
  providedIn: 'root'
})
export class UiService {
  readonly sidebarState = signal<SidebarState>('auto');

  closeSidebar() {
    this.sidebarState.set('closed');
  }

  openSidebar() {
    this.sidebarState.set('open');
  }
}
