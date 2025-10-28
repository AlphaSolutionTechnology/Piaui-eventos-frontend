import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  Inject,
  PLATFORM_ID,
  NgZone,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ApiEvent } from '../../models/api-event.interface';
import { AuthService, User } from '../../services/auth';
@Component({
  standalone: true,
  selector: 'my-events-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './my-events.html',
  styleUrl: './my-events.css',
  host: {
    '[class.dark-mode]': 'isDarkModeActive',
  },
})
export class MyEventsPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private darkModeObserver: MutationObserver | null = null;

  isDarkModeActive = false;
  user: User = {
    id: 0,
    name: 'Usuário',
    email: '',
    phoneNumber: '',
    role: 'Participante',
    roleId: 0,
    avatar: '',
  };

  isUserDropdownOpen = false;
  myEvents: ApiEvent[] = [];
  isLoading = true;
  error: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    // Voltar ao topo da página
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo(0, 0);

      // Verificar tema inicial
      const savedTheme = localStorage.getItem('theme');
      this.isDarkModeActive = savedTheme === 'dark';

      // Observar mudanças na classe dark-mode do body
      this.darkModeObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class') {
            const newValue = document.body.classList.contains('dark-mode');
            this.isDarkModeActive = newValue;
            this.cdr.detectChanges();
          }
        });
      });

      this.darkModeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }

    // Carregar dados do usuário
    this.loadUserData();

    // Carregar eventos do usuário
    this.loadMyEvents();
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
          this.cdr.detectChanges();
        }
      });
  }

  loadMyEvents(): void {
    this.isLoading = true;
    this.error = null;

    // Simular carregamento de eventos do usuário
    // Você pode conectar isto a um serviço real depois
    setTimeout(() => {
      // Placeholder: Sem eventos por enquanto
      this.myEvents = [];
      this.isLoading = false;
      this.cdr.detectChanges();
    }, 1000);
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

  viewEventDetails(eventId: number): void {
    this.router.navigate(['/event-details', eventId]);
  }

  editEvent(eventId: number): void {
    // Implementar edição de evento depois
    console.log('Editar evento:', eventId);
  }

  deleteEvent(eventId: number): void {
    // Implementar exclusão de evento depois
    console.log('Deletar evento:', eventId);
  }

  /**
   * Manipula erro de carregamento de imagem
   */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    // Fallback para imagem padrão
    img.src = 'assets/events/evento-exemplo.svg';
    img.onerror = null; // Previne loop infinito se a imagem padrão também falhar
  }
}
