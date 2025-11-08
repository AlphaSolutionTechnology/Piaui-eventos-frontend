import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
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
import { EventRegistrationService } from '../../services/event-registration.service';
import { ToastService } from '../../services/toast.service';

type EventTab = 'created' | 'registered';
@Component({
  standalone: true,
  selector: 'my-events-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './my-events.html',
  styleUrl: './my-events.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  // Unsubscribe state
  unsubscribeLoading: { [key: number]: boolean } = {};
  unsubscribeError: { [key: number]: string | null } = {};

  // Success message state
  unsubscribeSuccess: { [key: number]: boolean } = {};

  // Unsubscribe confirmation modal
  unsubscribeConfirmation: { [key: number]: boolean } = {};

  // Delete event state
  deleteLoading: { [key: number]: boolean } = {};
  deleteError: { [key: number]: string | null } = {};
  deleteSuccess: { [key: number]: boolean } = {};
  deleteConfirmation: { [key: number]: boolean } = {};

  constructor(
    private authService: AuthService,
    private eventsService: EventsService,
    private registrationService: EventRegistrationService,
    private toastService: ToastService,
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

    // Carregar dados do usuário e aguardar antes de carregar eventos
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
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      if (user) {
        this.user = user;
        console.log('👤 [MY-EVENTS] Usuário carregado:', user.name, '(ID:', user.id, ')');
        this.cdr.detectChanges();

        // Carregar eventos apenas quando usuário estiver pronto
        this.loadMyEvents();
      }
    });
  }

  loadMyEvents(): void {
    if (!this.user || this.user.id === 0) {
      console.warn('⚠️ [MY-EVENTS] Usuário não carregado - aguardando...');
      return;
    }

    console.log('📋 [MY-EVENTS] Carregando eventos do usuário:', this.user.id);
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
      },
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
      },
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
    this.router.navigate(['/event', eventId]);
  }

  editEvent(eventId: number): void {
    // Redirect to create-event page with event ID for editing
    this.router.navigate(['/create-event'], { queryParams: { id: eventId } });
  }

  /**
   * Abre modal de confirmação para deletar evento
   * @param eventId - ID do evento a deletar
   */
  deleteEvent(eventId: number): void {
    // Show delete confirmation modal
    this.deleteConfirmation[eventId] = true;
    this.cdr.detectChanges();
  }

  /**
   * Cancela a operação de delete
   * @param eventId - ID do evento
   */
  cancelDelete(eventId: number): void {
    this.deleteConfirmation[eventId] = false;
    this.cdr.detectChanges();
  }

  /**
   * Confirma e executa o delete do evento
   * @param eventId - ID do evento
   */
  confirmDelete(eventId: number): void {
    this.deleteConfirmation[eventId] = false;
    this.deleteLoading[eventId] = true;
    this.cdr.detectChanges();

    this.eventsService.deleteEvent(eventId).subscribe({
      next: () => {
        // Remove event from the list
        if (this.activeTab === 'created') {
          this.createdEvents = this.createdEvents.filter(e => e.id !== eventId);
        }
        this.deleteLoading[eventId] = false;
        this.deleteSuccess[eventId] = true;
        this.toastService.success('Evento deletado com sucesso!');
        this.cdr.detectChanges();

        // Reset success state after 2 seconds
        setTimeout(() => {
          delete this.deleteSuccess[eventId];
          this.cdr.detectChanges();
        }, 2000);
      },
      error: (error) => {
        this.deleteLoading[eventId] = false;
        console.error('Error deleting event:', error);

        let errorMsg = 'Erro ao deletar evento. Tente novamente.';
        if (error.status === 404) {
          errorMsg = 'Evento não encontrado.';
        } else if (error.status === 403) {
          errorMsg = 'Você não tem permissão para deletar este evento.';
        } else if (error.status === 409) {
          errorMsg = 'Não é possível deletar um evento com participantes inscritos.';
        }

        this.deleteError[eventId] = errorMsg;
        this.toastService.error(errorMsg);
        this.cdr.detectChanges();

        // Reset error state after 5 seconds
        setTimeout(() => {
          delete this.deleteError[eventId];
          this.cdr.detectChanges();
        }, 5000);
      }
    });
  }

  /**
   * Abre modal de confirmação para cancelar inscrição
   * @param eventId - ID do evento
   */
  cancelSubscription(eventId: number): void {
    this.unsubscribeConfirmation[eventId] = true;
    this.cdr.detectChanges();
  }

  /**
   * Cancela a operação de unsubscribe
   * @param eventId - ID do evento
   */
  cancelUnsubscribe(eventId: number): void {
    this.unsubscribeConfirmation[eventId] = false;
    this.cdr.detectChanges();
  }

  /**
   * Confirma e executa o unsubscribe do evento
   * @param eventId - ID do evento
   */
  confirmUnsubscribe(eventId: number): void {
    this.unsubscribeConfirmation[eventId] = false;
    this.performUnsubscribe(eventId);
  }

  /**
   * Executa o unsubscribe do evento
   * @private
   * @param eventId - ID do evento
   */
  private performUnsubscribe(eventId: number): void {
    if (!this.user || this.user.id === 0) {
      this.toastService.error('Usuário não identificado.');
      return;
    }

    this.unsubscribeLoading[eventId] = true;
    this.cdr.detectChanges();

    this.registrationService.unregisterUserFromEvent(eventId, this.user.id).then(() => {
      // Remove event from registered events list
      this.registeredEvents = this.registeredEvents.filter(e => e.id !== eventId);
      this.unsubscribeLoading[eventId] = false;
      this.unsubscribeSuccess[eventId] = true;
      this.toastService.success('Inscrição cancelada com sucesso!');
      this.cdr.detectChanges();

      // Reset success state after 2 seconds
      setTimeout(() => {
        delete this.unsubscribeSuccess[eventId];
        this.cdr.detectChanges();
      }, 2000);
    }).catch((error: any) => {
      this.unsubscribeLoading[eventId] = false;
      console.error('Error unsubscribing from event:', error);

      let errorMsg = 'Erro ao cancelar inscrição. Tente novamente.';
      if (error.status === 404) {
        errorMsg = 'Evento não encontrado.';
      } else if (error.status === 409) {
        errorMsg = 'Não é possível cancelar a inscrição neste momento.';
      }

      this.unsubscribeError[eventId] = errorMsg;
      this.toastService.error(errorMsg);
      this.cdr.detectChanges();

      // Reset error state after 5 seconds
      setTimeout(() => {
        delete this.unsubscribeError[eventId];
        this.cdr.detectChanges();
      }, 5000);
    });
  }

  /**
   * Abre o modal de confirmação para cancelar inscrição
   * @deprecated Use cancelSubscription() instead
   */
  cancelRegistration(eventId: number): void {
    if (!confirm('Tem certeza que deseja cancelar sua inscrição neste evento?')) {
      return;
    }

    if (!this.user || this.user.id === 0) {
      this.toastService.error('Usuário não identificado.');
      return;
    }

    this.performUnsubscribe(eventId);
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
