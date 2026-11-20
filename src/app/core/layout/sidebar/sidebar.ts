import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SessionService } from '../../auth/session.service';
import { SIDEBAR_MODULES } from './sidebar.config';

@Component({
  selector: 'app-sidebar',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  readonly sessionService = inject(SessionService);
  readonly roleName = this.sessionService.roleName();

  readonly menu = computed(() => {
    return SIDEBAR_MODULES.map(m => ({
      ...m,
      items: m.items.filter(item => !item.roles || item.roles.includes(this.roleName ?? ''))
    })).filter(m => m.items.length > 0);
  });
}
