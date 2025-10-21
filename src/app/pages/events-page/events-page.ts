import {
  Component,
  HostListener,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  Inject,
  PLATFORM_ID,
  NgZone,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { EventsService, EventsFilter } from '../../services/events.service';
import { ApiEvent, EventsResponse } from '../../models/api-event.interface';
import { AuthService, User } from '../../services/auth';

@Component({
  standalone: true,
  selector: 'events-page',
  imports: [CommonModule, RouterLink, FormsModule, HttpClientModule],
  templateUrl: './events-page.html',
  styleUrl: './events-page.css',
})
export class EventsPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  // Dados do usuário (carregados dinamicamente)
  user: User = {
    id: 0,
    name: 'Usuário',
    email: '',
    phoneNumber: '',
    role: 'Participante',
    roleId: 0,
    avatar: '',
  };

  // Controla se o dropdown do usuário está aberto
  isUserDropdownOpen = false;

  // Dados da API
  events: ApiEvent[] = [];
  filteredEvents: ApiEvent[] = [];
  eventTypes: string[] = [];
  isLoading = false;
  error: string | null = null;

  // Paginação (Spring Boot usa página 0-indexed)
  currentPage = 0;
  totalEvents = 0;
  totalPages = 0;
  eventsPerPage = 20; // Mesma quantidade do service
  hasMoreEvents = true;
  isLoadingMore = false;

  // Objeto para armazenar os filtros
  filters = {
    name: '',
    timeRange: '',
    eventType: '',
  };

  // Controla se os filtros estão abertos ou fechados
  isFiltersOpen = false;

  constructor(
    private eventsService: EventsService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
    private ngZone: NgZone,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Voltar ao topo da página ao inicializar (apenas no browser)
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo(0, 0);
    }

    // Carregar dados do usuário logado
    this.loadUserData();

    // Configurar observables primeiro
    this.setupSearchDebounce();
    this.loadEventTypes();

    // Verificar se já existem eventos carregados no service
    const cachedEvents = this.eventsService.getCachedEvents();

    if (cachedEvents && cachedEvents.length > 0) {
      // Se o service já tem eventos em cache, usar o cache
      console.log('Usando eventos do cache:', cachedEvents.length);

      // Resetar loading ANTES de subscrever aos estados
      this.eventsService.resetLoading();

      // Atualizar dados locais
      this.events = cachedEvents;
      this.filteredEvents = this.events;
      this.isLoading = false;
      this.error = null;

      // Subscrever aos estados do service DEPOIS de resetar
      this.subscribeToServiceStates();

      // Forçar renderização imediata usando setTimeout
      setTimeout(() => {
        this.cdr.detectChanges();
      }, 0);
    } else {
      // Carregar eventos se não houver cache
      console.log('Cache vazio, carregando eventos da API');

      // Subscrever aos estados do service
      this.subscribeToServiceStates();

      // Carregar da API
      this.loadEvents();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEvents(): void {
    const filters = {
      search: this.filters.name,
      eventType: this.filters.eventType,
    };

    // Resetar currentPage para garantir que sempre começa do zero
    this.currentPage = 0;

    // append=false para resetar a lista
    this.eventsService
      .getEvents(filters, this.currentPage, this.eventsPerPage, false)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.events = response.events;
          this.totalEvents = response.total;
          this.totalPages = response.pagination.totalPages;
          this.hasMoreEvents = this.currentPage < response.pagination.totalPages - 1;

          // Aplicar filtros locais apenas se necessário
          if (this.filters.timeRange) {
            this.applyFilters();
          } else {
            this.filteredEvents = this.events;
          }

          // Forçar detecção de mudanças
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.error = 'Erro ao carregar eventos. Tente novamente.';
          console.error('Erro ao carregar eventos:', error);
          this.cdr.detectChanges();
        },
      });
  }

  private loadEventTypes(): void {
    this.eventsService
      .getEventTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (types: string[]) => {
          this.eventTypes = types;
        },
        error: (error: any) => {
          console.error('Erro ao carregar tipos de evento:', error);
        },
      });
  }

  private setupSearchDebounce(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((searchTerm) => {
        this.filters.name = searchTerm;
        this.currentPage = 0; // Corrigido: deve ser 0
        this.loadEvents();
      });
  }

  private subscribeToServiceStates(): void {
    this.eventsService.loading$.pipe(takeUntil(this.destroy$)).subscribe((loading: boolean) => {
      console.log('Loading state changed:', loading);
      this.isLoading = loading;
      this.cdr.detectChanges();
    });

    this.eventsService.error$.pipe(takeUntil(this.destroy$)).subscribe((error: string | null) => {
      this.error = error;
      this.cdr.detectChanges();
    });

    // Subscrever aos eventos para manter sincronização
    this.eventsService.events$.pipe(takeUntil(this.destroy$)).subscribe((events: ApiEvent[]) => {
      if (events.length > 0 && this.events.length === 0) {
        console.log('Events updated from service:', events.length);
        this.events = events;
        if (!this.filters.timeRange) {
          this.filteredEvents = events;
        } else {
          this.applyFilters();
        }
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Aplica todos os filtros aos eventos
   */
  applyFilters(): void {
    this.filteredEvents = this.events.filter((event) => {
      // Filtro por nome (busca no título e descrição) - já tratado pelo backend
      const nameMatch =
        !this.filters.name ||
        event.name.toLowerCase().includes(this.filters.name.toLowerCase()) ||
        event.description.toLowerCase().includes(this.filters.name.toLowerCase());

      // Filtro por tipo de evento - já tratado pelo backend, mas mantém para consistência local
      const typeMatch = !this.filters.eventType || event.eventType === this.filters.eventType;

      // Filtro por horário - apenas local (backend não tem esse filtro)
      const timeMatch =
        !this.filters.timeRange || this.matchTimeRange(event.eventDate, this.filters.timeRange);

      return nameMatch && typeMatch && timeMatch;
    });
  }

  /**
   * Chamado quando o filtro de tipo de evento muda
   */
  onEventTypeFilterChange(): void {
    this.currentPage = 0;
    this.events = [];
    this.filteredEvents = [];
    this.loadEvents();
  }

  /**
   * Chamado quando o filtro de horário muda (apenas local)
   */
  onTimeRangeFilterChange(): void {
    this.applyFilters();
  }

  /**
   * Verifica se um horário está dentro da faixa selecionada
   */
  private matchTimeRange(eventDate: string, range: string): boolean {
    const eventTime = new Date(eventDate);
    const hour = eventTime.getHours();

    switch (range) {
      case 'morning':
        return hour >= 6 && hour < 12;
      case 'afternoon':
        return hour >= 12 && hour < 18;
      case 'evening':
        return hour >= 18 && hour < 24;
      case 'night':
        return hour >= 0 && hour < 6;
      default:
        return true;
    }
  }

  /**
   * Limpa todos os filtros
   */
  clearFilters(): void {
    this.filters = {
      name: '',
      timeRange: '',
      eventType: '',
    };
    this.currentPage = 0;
    this.events = []; // Limpar eventos
    this.filteredEvents = []; // Limpar eventos filtrados
    this.loadEvents();
  }

  /**
   * Verifica se há filtros ativos
   */
  hasActiveFilters(): boolean {
    return (
      this.filters.name !== '' || this.filters.timeRange !== '' || this.filters.eventType !== ''
    );
  }

  /**
   * Alterna o estado dos filtros (aberto/fechado)
   */
  toggleFilters(): void {
    this.isFiltersOpen = !this.isFiltersOpen;
  }

  /**
   * Conta quantos filtros estão ativos
   */
  getActiveFiltersCount(): number {
    let count = 0;
    if (this.filters.name !== '') count++;
    if (this.filters.timeRange !== '') count++;
    if (this.filters.eventType !== '') count++;
    return count;
  }

  /**
   * Método para busca com debounce
   */
  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const searchTerm = target.value;
    this.currentPage = 0; // Reset para primeira página ao buscar
    this.searchSubject.next(searchTerm);
  }

  /**
   * Carrega mais eventos (infinite scroll)
   */
  loadMoreEvents(): void {
    if (this.isLoadingMore || !this.hasMoreEvents || this.isLoading) {
      console.log('LoadMoreEvents bloqueado:', {
        isLoadingMore: this.isLoadingMore,
        hasMoreEvents: this.hasMoreEvents,
        isLoading: this.isLoading,
      });
      return;
    }

    console.log('Carregando mais eventos - página:', this.currentPage + 1);
    this.isLoadingMore = true;

    // Forçar detecção de mudanças para mostrar o loading
    this.cdr.detectChanges();

    this.currentPage++;

    const filters = {
      search: this.filters.name,
      eventType: this.filters.eventType,
    };

    // append=true para adicionar à lista existente
    this.eventsService
      .getEvents(filters, this.currentPage, this.eventsPerPage, true)
      .pipe(
        takeUntil(this.destroy$),
        // Garantir que isLoadingMore seja resetado mesmo se houver erro
        finalize(() => {
          console.log('Finalizando requisição - resetando isLoadingMore');
          this.isLoadingMore = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response: EventsResponse) => {
          console.log('Novos eventos recebidos:', response.events.length);
          console.log('Resposta completa:', response);

          // Verificar se realmente há eventos novos
          if (response.events.length === 0) {
            console.warn('Nenhum evento novo recebido - pode ter chegado ao fim');
            this.hasMoreEvents = false;
            return;
          }

          // Adicionar novos eventos sem duplicatas
          const newEvents = response.events.filter(
            (newEvent: ApiEvent) =>
              !this.events.some((existingEvent) => existingEvent.id === newEvent.id)
          );

          console.log('Eventos únicos para adicionar:', newEvents.length);

          if (newEvents.length === 0) {
            console.warn('Todos os eventos já existem na lista - possível duplicação');
          }

          this.events = [...this.events, ...newEvents];
          this.totalEvents = response.total;
          this.totalPages = response.pagination.totalPages;
          this.hasMoreEvents = this.currentPage < response.pagination.totalPages - 1;

          // Aplicar filtros locais apenas se necessário
          if (this.filters.timeRange) {
            this.applyFilters();
          } else {
            this.filteredEvents = this.events;
          }

          console.log('Total de eventos agora:', this.filteredEvents.length);
          console.log('Tem mais eventos?', this.hasMoreEvents);

          // Forçar detecção de mudanças múltiplas vezes
          this.cdr.detectChanges();

          // Segunda detecção após um tick
          setTimeout(() => {
            this.cdr.detectChanges();
          }, 0);

          // Terceira detecção para garantir
          setTimeout(() => {
            this.cdr.detectChanges();
            console.log('Renderização concluída');
          }, 100);
        },
        error: (error) => {
          console.error('Erro ao carregar mais eventos:', error);
          this.currentPage--; // Reverter página em caso de erro
          this.cdr.detectChanges();
        },
      });
  }

  /**
   * Reseta a paginação
   */
  resetPagination(): void {
    this.currentPage = 0;
  }

  /**
   * Formata a data do evento para exibição
   */
  formatEventDate(eventDate: string): string {
    const date = new Date(eventDate);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Se é hoje
    if (diffDays === 0) {
      return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }

    // Se é amanhã
    if (diffDays === 1) {
      return `Amanhã às ${date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }

    // Outras datas
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Navega para os detalhes do evento
   */
  navigateToEvent(eventId: number): void {
    this.router.navigate(['/event', eventId]);
  }

  /**
   * Gera um gradiente único baseado no tipo do evento
   */
  getEventGradient(eventType: string): string {
    const gradients: string[] = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Roxo/Azul
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // Rosa/Vermelho
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', // Azul Claro/Ciano
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', // Rosa/Amarelo
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', // Verde/Rosa Claro
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', // Coral/Rosa
      'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', // Pêssego/Laranja
      'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)', // Verde/Azul
      'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', // Lavanda/Rosa
      'linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)', // Salmão/Rosa Claro
      'linear-gradient(135deg, #ff8a80 0%, #ffccbc 100%)', // Vermelho/Pêssego
      'linear-gradient(135deg, #81c784 0%, #aed581 100%)', // Verde/Verde Claro
    ];

    // Usa o tipo do evento para selecionar um gradiente de forma determinística
    if (!eventType) {
      return gradients[0]; // Fallback para o primeiro gradiente se eventType estiver vazio
    }

    // Gera um hash simples da string para ter consistência
    let hash = 0;
    for (let i = 0; i < eventType.length; i++) {
      const char = eventType.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    const gradientIndex = Math.abs(hash) % gradients.length;
    return gradients[gradientIndex];
  }

  /**
   * Gera uma tag visual baseada no ID do evento
   */
  getEventTag(eventId: number): string {
    const tags = ['VIP', 'NEW', 'HOT', 'PREMIUM', 'SPECIAL'];
    const tagIndex = eventId % tags.length;
    return tags[tagIndex];
  }

  /**
   * Formata o tipo de evento para exibição
   */
  formatEventType(eventType: string): string {
    if (!eventType) return 'EVENTO';

    const typeMap: { [key: string]: string } = {
      CONFERENCE: 'CONFERÊNCIA',
      WORKSHOP: 'WORKSHOP',
      SEMINAR: 'SEMINÁRIO',
      NETWORKING: 'NETWORKING',
      TRAINING: 'TREINAMENTO',
      MEETUP: 'ENCONTRO',
      WEBINAR: 'WEBINAR',
    };

    return typeMap[eventType.toUpperCase()] || eventType.toUpperCase();
  }

  /**
   * Carrega os dados do usuário logado
   * Primeiro tenta carregar do cache (síncrono), depois atualiza do backend (assíncrono)
   */
  loadUserData(): void {
    // Carregar do cache imediatamente (para evitar delay na UI)
    const cachedUser = this.authService.getCurrentUser();
    if (cachedUser) {
      this.user = cachedUser;
      this.cdr.detectChanges();
    }

    // Subscrever ao observable para receber atualizações
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          if (user) {
            console.log('Dados do usuário atualizados:', user);
            this.user = user;
            this.cdr.detectChanges();
          } else {
            console.warn('Nenhum usuário logado encontrado');
          }
        },
        error: (error) => {
          console.error('Erro ao carregar dados do usuário:', error);
        }
      });

    // Se estiver autenticado mas não tiver cache, buscar do backend
    if (!cachedUser && this.authService.isAuthenticated()) {
      console.log('Buscando dados do usuário do backend...');
      this.authService.fetchCurrentUser().subscribe();
    }
  }

  /**
   * Retorna as iniciais do nome do usuário para exibir no avatar
   */
  getUserInitials(): string {
    return this.authService.getUserInitials(this.user.name);
  }

  /**
   * Alterna o estado do dropdown do usuário
   */
  toggleUserDropdown(): void {
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
  }

  /**
   * Fecha o dropdown do usuário
   */
  closeUserDropdown(): void {
    this.isUserDropdownOpen = false;
  }

  /**
   * Faz logout do usuário
   */
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  /**
   * Fecha o dropdown ao clicar fora
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-avatar')) {
      this.isUserDropdownOpen = false;
    }
  }

  /**
   * Detecta scroll para carregar mais eventos (infinite scroll)
   */
  @HostListener('window:scroll')
  onScroll(): void {
    // Verificar se está no browser
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.isLoadingMore || !this.hasMoreEvents || this.isLoading) {
      return;
    }

    const scrollPosition = window.pageYOffset + window.innerHeight;
    const pageHeight = document.documentElement.scrollHeight;

    // Quando chegar a 80% da página, carrega mais eventos
    const threshold = pageHeight * 0.8;

    if (scrollPosition >= threshold) {
      // Executar dentro da zona do Angular para garantir detecção de mudanças
      this.ngZone.run(() => {
        this.loadMoreEvents();
      });
    }
  }
}
