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
    this.router.navigate(['/create-event', eventId]);
  }

  /**
   * Abre modal de confirmação para deletar evento
   * @param eventId - ID do evento a deletar
   */
  deleteEvent(eventId: number): void {
    this.deleteConfirmation[eventId] = true;
    this.cdr.detectChanges();
  }

  /**
   * Cancela a deleção do evento
   * @param eventId - ID do evento
   */
  cancelDelete(eventId: number): void {
    this.deleteConfirmation[eventId] = false;
    this.deleteError[eventId] = null;
    this.cdr.detectChanges();
  }

  /**
   * Confirma e executa a deleção do evento
   * Endpoint: DELETE /api/events/{id}
   * Remove o evento da lista imediatamente após sucesso
   *
   * @param eventId - ID do evento a deletar
   */
  confirmDelete(eventId: number): void {
    if (!eventId) {
      this.deleteError[eventId] = 'ID do evento inválido';
      this.cdr.detectChanges();
      return;
    }

    // Iniciar carregamento
    this.deleteLoading[eventId] = true;
    this.deleteError[eventId] = null;
    this.deleteSuccess[eventId] = false;
    this.cdr.detectChanges();

    console.log(`🟡 [MY-EVENTS] Deletando evento: eventId=${eventId}`);

    this.eventsService.deleteEvent(eventId).subscribe({
      next: () => {
        console.log('✅ [MY-EVENTS] Evento deletado com sucesso');

        // Remover evento da lista imediatamente
        this.createdEvents = this.createdEvents.filter((e) => e.id !== eventId);

        // Mostrar mensagem de sucesso
        this.deleteSuccess[eventId] = true;
        this.deleteLoading[eventId] = false;
        this.deleteConfirmation[eventId] = false;
        this.cdr.detectChanges();

        // Mostra toast de sucesso
        this.toastService.success('Evento deletado com sucesso!');

        // Limpar mensagem de sucesso após 3 segundos
        setTimeout(() => {
          this.deleteSuccess[eventId] = false;
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (error: any) => {
        this.deleteLoading[eventId] = false;
        this.deleteConfirmation[eventId] = false;

        let errorMsg = 'Erro ao deletar evento. Tente novamente.';

        if (error?.error?.message) {
          errorMsg = error.error.message;
        } else if (error?.status === 404) {
          errorMsg = 'Evento não encontrado.';
        } else if (error?.status === 401 || error?.status === 403) {
          errorMsg = 'Você não tem permissão para deletar este evento.';
        } else if (error?.status === 409) {
          errorMsg = 'Conflito ao deletar evento. Tente novamente.';
        } else if (error?.status === 500) {
          errorMsg = 'Erro no servidor. Tente novamente mais tarde.';
        }

        this.deleteError[eventId] = errorMsg;
        console.error(`❌ [MY-EVENTS] Erro ao deletar evento: ${errorMsg}`, error);

        this.cdr.detectChanges();
        this.toastService.error(errorMsg);
      },
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
   * Cancela a ação de unsubscribe
   * @param eventId - ID do evento
   */
  cancelUnsubscribe(eventId: number): void {
    this.unsubscribeConfirmation[eventId] = false;
    this.unsubscribeError[eventId] = null;
    this.cdr.detectChanges();
  }

  /**
   * Cancela a inscrição do usuário em um evento
   * Endpoint: DELETE /api/events/{eventId}/register/{userId}
   * Remove o evento da lista imediatamente após sucesso
   *
   * @param eventId - ID do evento
   */
  confirmUnsubscribe(eventId: number): void {
    this.unsubscribeConfirmation[eventId] = false;
    this.performUnsubscribe(eventId);
  }

  /**
   * Executa a desinscrição do usuário
   */
  private async performUnsubscribe(eventId: number): Promise<void> {
    if (!this.user || this.user.id === 0) {
      this.unsubscribeError[eventId] = 'Erro: Usuário não encontrado';
      this.cdr.detectChanges();
      this.toastService.error('Usuário não encontrado');
      console.error('❌ Usuário não carregado');
      return;
    }

    // Iniciar carregamento
    this.unsubscribeLoading[eventId] = true;
    this.unsubscribeError[eventId] = null;
    this.unsubscribeSuccess[eventId] = false;
    this.cdr.detectChanges();

    try {
      console.log(
        `🟡 [MY-EVENTS] Cancelando inscrição: eventId=${eventId}, userId=${this.user.id}`
      );

      // Chamar o serviço para desinscrever
      await this.registrationService.unregisterUserFromEvent(eventId, this.user.id);

      console.log('✅ [MY-EVENTS] Desinscrição bem-sucedida');

      // Remover evento da lista imediatamente
      this.registeredEvents = this.registeredEvents.filter((e) => e.id !== eventId);

      // Mostrar mensagem de sucesso por 3 segundos
      this.unsubscribeSuccess[eventId] = true;
      this.unsubscribeLoading[eventId] = false;
      this.cdr.detectChanges();

      // Mostra toast de sucesso
      this.toastService.success('Inscrição cancelada com sucesso!');

      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => {
        this.unsubscribeSuccess[eventId] = false;
        this.cdr.detectChanges();
      }, 3000);
    } catch (error: any) {
      // Erro no cancelamento
      this.unsubscribeLoading[eventId] = false;
      const errorMsg = error?.message || 'Erro ao cancelar inscrição. Tente novamente.';
      this.unsubscribeError[eventId] = errorMsg;

      console.error(`❌ [MY-EVENTS] Erro ao desinscrever: ${errorMsg}`);
      this.toastService.error(errorMsg);
      this.cdr.detectChanges();
    }
  }

  /**
   * @deprecated Use cancelSubscription() instead
   * Cancela a inscrição do usuário em um evento
   * Endpoint: DELETE /api/events/{eventId}/register/{userId}
   * Remove o evento da lista imediatamente após sucesso
   *
   * @param eventId - ID do evento
   */
  async cancelEventSubscription(eventId: number): Promise<void> {
    // Confirmação antes de cancelar
    const confirmed = window.confirm('Tem certeza que deseja cancelar sua inscrição neste evento?');

    if (!confirmed) {
      console.log('❌ Cancelamento de inscrição abortado pelo usuário');
      return;
    }

    await this.performUnsubscribe(eventId);
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
