import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService, User } from '../../services/auth';
import { UserService } from '../../services/user.service';
import { UserUpdateDTO, PasswordUpdateDTO } from '../../models/user-update.dto';

@Component({
  standalone: true,
  selector: 'settings-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
  host: {
    '[class.dark-mode]': 'isDarkModeActive',
  },
})
export class SettingsPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private darkModeObserver: MutationObserver | null = null;

  isDarkModeActive = false;
  user: User | null = null;
  isUserDropdownOpen = false;

  // Profile Edit Form
  profileForm = {
    name: '',
    email: '',
    phoneNumber: '',
  };
  
  isEditingProfile = false;
  isSavingProfile = false;
  profileSuccess = false;
  profileError = '';

  // Password Change Form
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };
  
  isChangingPassword = false;
  isSavingPassword = false;
  passwordSuccess = false;
  passwordError = '';

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo(0, 0);

      const savedTheme = localStorage.getItem('theme');
      this.isDarkModeActive = savedTheme === 'dark';

      this.darkModeObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class') {
            this.isDarkModeActive = document.body.classList.contains('dark-mode');
            this.cdr.detectChanges();
          }
        });
      });

      this.darkModeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }

    this.loadUserData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.darkModeObserver) {
      this.darkModeObserver.disconnect();
    }
  }

  loadUserData(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (user) {
          this.user = user;
          this.profileForm = {
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber,
          };
          this.cdr.detectChanges();
        }
      });
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

  navigateToEvents(): void {
    this.router.navigate(['/events']);
  }

  logout(): void {
    this.authService.logout();
    this.closeUserDropdown();
    this.router.navigate(['/login']);
  }

  toggleDarkMode(): void {
    if (isPlatformBrowser(this.platformId)) {
      const body = document.body;
      body.classList.toggle('dark-mode');
      this.isDarkModeActive = body.classList.contains('dark-mode');
      localStorage.setItem('theme', this.isDarkModeActive ? 'dark' : 'light');
    }
  }

  startEditingProfile(): void {
    this.isEditingProfile = true;
    this.profileSuccess = false;
    this.profileError = '';
  }

  cancelEditingProfile(): void {
    this.isEditingProfile = false;
    // Reset form to original values
    if (this.user) {
      this.profileForm = {
        name: this.user.name,
        email: this.user.email,
        phoneNumber: this.user.phoneNumber,
      };
    }
    this.profileSuccess = false;
    this.profileError = '';
  }

  saveProfile(): void {
    this.isSavingProfile = true;
    this.profileSuccess = false;
    this.profileError = '';

    const updateData: UserUpdateDTO = {
      name: this.profileForm.name.trim(),
      email: this.profileForm.email.trim(),
      phoneNumber: this.profileForm.phoneNumber.trim(),
    };

    this.userService.updateUser(updateData).subscribe({
      next: (response) => {
        this.isSavingProfile = false;
        this.isEditingProfile = false;
        this.profileSuccess = true;
        
        // Update local user data
        if (this.user) {
          this.user.name = response.name;
          this.user.email = response.email;
          this.user.phoneNumber = response.phoneNumber;
        }

        // Hide success message after 3 seconds
        setTimeout(() => {
          this.profileSuccess = false;
          this.cdr.detectChanges();
        }, 3000);

        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isSavingProfile = false;
        this.profileError = error.error?.message || 'Erro ao atualizar perfil. Tente novamente.';
        this.cdr.detectChanges();
      },
    });
  }

  startChangingPassword(): void {
    this.isChangingPassword = true;
    this.passwordSuccess = false;
    this.passwordError = '';
    this.passwordForm = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };
  }

  cancelChangingPassword(): void {
    this.isChangingPassword = false;
    this.passwordForm = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    };
    this.passwordSuccess = false;
    this.passwordError = '';
  }

  savePassword(): void {
    // Validate passwords
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.passwordError = 'As senhas não coincidem.';
      return;
    }

    if (this.passwordForm.newPassword.length < 6) {
      this.passwordError = 'A nova senha deve ter pelo menos 6 caracteres.';
      return;
    }

    this.isSavingPassword = true;
    this.passwordSuccess = false;
    this.passwordError = '';

    const passwordData: PasswordUpdateDTO = {
      currentPassword: this.passwordForm.currentPassword,
      newPassword: this.passwordForm.newPassword,
    };

    this.userService.updatePassword(passwordData).subscribe({
      next: () => {
        this.isSavingPassword = false;
        this.isChangingPassword = false;
        this.passwordSuccess = true;
        this.passwordForm = {
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        };

        // Hide success message after 3 seconds
        setTimeout(() => {
          this.passwordSuccess = false;
          this.cdr.detectChanges();
        }, 3000);

        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isSavingPassword = false;
        this.passwordError = error.error?.message || 'Erro ao alterar senha. Verifique sua senha atual.';
        this.cdr.detectChanges();
      },
    });
  }

  /**
   * Format phone number as user types
   */
  formatPhone(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');

    if (value.length <= 11) {
      if (value.length <= 2) {
        value = value.replace(/^(\d{0,2})/, '($1');
      } else if (value.length <= 7) {
        value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
      } else {
        value = value.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
      }
    }

    this.profileForm.phoneNumber = value;
  }
}
