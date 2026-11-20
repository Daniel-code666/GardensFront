import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SessionService } from '../../auth/session.service';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  private readonly router = inject(Router);
  readonly session = inject(SessionService);

  logout(): void {
    this.session.clearSession();
    void this.router.navigate(['/login']);
  }
}
