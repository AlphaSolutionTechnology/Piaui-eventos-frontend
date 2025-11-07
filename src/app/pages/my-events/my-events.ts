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
import { EventsService } from '../../services/events.service';

type EventTab = 'created' | 'registered';
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
  
  // Tab management
  activeTab: EventTab = 'created';
  
  // Events data
  createdEvents: ApiEvent[] = [];
  registeredEvents: ApiEvent[] = [];
  
  isLoading = true;
  error: string | null = null;

  constructor(
    private authService: AuthService,
    private eventsService: EventsService,
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
    if (!this.user || this.user.id === 0) {
      console.error('User not loaded yet');
      return;
    }

    this.isLoading = true;
    this.error = null;

    if (this.activeTab === 'created') {
      this.loadCreatedEvents();
    } else {
      this.loadRegisteredEvents();
    }
  }

  loadCreatedEvents(): void {
    this.eventsService.getEventsByUser(this.user.id).subscribe({
      next: (response) => {
        this.createdEvents = response.events;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading created events:', error);
        this.error = 'Erro ao carregar eventos criados.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadRegisteredEvents(): void {
    this.eventsService.getRegisteredEvents(this.user.id).subscribe({
      next: (response) => {
        this.registeredEvents = response.events;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading registered events:', error);
        // If endpoint doesn't exist yet, show empty list
        this.registeredEvents = [];
        this.error = null; // Don't show error for now
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  switchTab(tab: EventTab): void {
    this.activeTab = tab;
    this.loadMyEvents();
  }

  get currentEvents(): ApiEvent[] {
    return this.activeTab === 'created' ? this.createdEvents : this.registeredEvents;
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
