import { Component, Input, OnInit, inject, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService, User } from '../../services/auth';
import { DarkModeToggleComponent } from '../dark-mode-toggle/dark-mode-toggle';

@Component({
  standalone: true,
  selector: 'app-header',
  imports: [CommonModule, RouterModule, DarkModeToggleComponent],
  templateUrl: './app-header.html',
  styleUrl: './app-header.css',
  host: {
    '[class.dark-mode]': 'isDarkMode',
  },
})
export class AppHeader implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  @Input() isDarkMode = false;
  @Input() showDarkModeToggle = true;
  @Input() showUserCard = true;
  @Input() showCreateEventButton = true;
  @HostBinding('class.dark-mode') get darkModeClass() {
    return this.isDarkMode;
  }

  user: User | null = null;
  isUserDropdownOpen = false;

  ngOnInit() {
    // Observa mudanças no usuário atual
    this.authService.currentUser$.subscribe((user) => {
      this.user = user;
    });
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  getUserInitials(): string {
    if (!this.user?.name) return 'U';
    const names = this.user.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return this.user.name.substring(0, 2).toUpperCase();
  }

  toggleUserDropdown(): void {
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
  }

  closeUserDropdown(): void {
    this.isUserDropdownOpen = false;
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  navigateToEvents(): void {
    this.router.navigate(['/events']);
  }

  logout(): void {
    this.authService.logout();
    this.closeUserDropdown();
    this.router.navigate(['/login']);
  }
}
