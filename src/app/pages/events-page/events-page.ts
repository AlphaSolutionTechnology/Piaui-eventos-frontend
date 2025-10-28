import {
  Component,
  HostListener,
  HostBinding,
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
import { Subject, takeUntil, debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { EventsService, EventsFilter } from '../../services/events.service';
import { ApiEvent, EventsResponse } from '../../models/api-event.interface';
import { AuthService, User } from '../../services/auth';
import { DarkModeToggleComponent } from '../../components/dark-mode-toggle/dark-mode-toggle';

@Component({
  standalone: true,
  selector: 'events-page',
  imports: [CommonModule, RouterLink, FormsModule, DarkModeToggleComponent],
  templateUrl: './events-page.html',
  styleUrl: './events-page.css',
  host: {
    '[class.dark-mode]': 'isDarkModeActive',
  },
})
export class EventsPage implements OnInit, OnDestroy {
  @HostBinding('class.dark-mode') isDarkModeActive = false;
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();
  private darkModeObserver: MutationObserver | null = null;

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

      // Verificar o tema inicial
      const savedTheme = localStorage.getItem('theme');
      this.isDarkModeActive = savedTheme === 'dark';
      console.log(
        '🎨 [EVENTS PAGE] Tema inicial:',
        savedTheme,
        'isDarkModeActive:',
        this.isDarkModeActive
      );

      // Observar mudanças na classe dark-mode do body
      this.darkModeObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class') {
            const newValue = document.body.classList.contains('dark-mode');
            console.log('🎨 [EVENTS PAGE] Body mudou! dark-mode presente:', newValue);
            this.isDarkModeActive = newValue;
            console.log(
              '🎨 [EVENTS PAGE] isDarkModeActive atualizado para:',
              this.isDarkModeActive
            );
            this.cdr.detectChanges();
          }
        });
      });

      this.darkModeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class'],
      });
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
      // Subscrever aos estados do service
      this.subscribeToServiceStates();

      // Carregar da API
      this.loadEvents();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.darkModeObserver) {
      this.darkModeObserver.disconnect();
    }
  }

  loadEvents(pageSize?: number): void {
    const size = pageSize || this.eventsPerPage;

    const filters = {
      search: this.filters.name,
      category: this.filters.eventType, // Corrigido: usar 'category' ao invés de 'eventType'
    };

    console.log(
      '🔍 Buscando eventos com filtros:',
      filters,
      'página:',
      this.currentPage,
      'tamanho:',
      size
    );

    // append=false para resetar a lista
    this.eventsService
      .getEvents(filters, this.currentPage, size, false)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log(
            '✅ Recebidos',
            response.events.length,
            'eventos de',
            response.total,
            'no total'
          );
          this.events = response.events;
          this.totalEvents = response.total;
          this.totalPages = response.pagination.totalPages;
          this.hasMoreEvents = this.currentPage < response.pagination.totalPages - 1;

          // Sempre aplicar filtros locais após carregar
          this.applyFilters();

          // Forçar detecção de mudanças
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('❌ Erro ao carregar eventos:', error);
          this.error = 'Erro ao carregar eventos. Tente novamente.';
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
        this.currentPage = 0;
        this.events = [];
        this.filteredEvents = [];
        this.hasMoreEvents = false; // Desabilita infinite scroll durante busca

        // Buscar com um limite maior para pegar todos os resultados
        // O backend vai filtrar por "search"
        this.loadEvents(500); // Busca até 500 eventos
      });
  }

  private subscribeToServiceStates(): void {
    this.eventsService.loading$.pipe(takeUntil(this.destroy$)).subscribe((loading: boolean) => {
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
   * Aplica filtros locais: nome (se necessário), tipo e horário
   */
  applyFilters(): void {
    this.filteredEvents = this.events.filter((event) => {
      // Filtro por nome (case-insensitive, busca no nome e descrição)
      // Aplicado como fallback caso o backend não filtre corretamente
      const nameMatch =
        !this.filters.name ||
        event.name.toLowerCase().includes(this.filters.name.toLowerCase()) ||
        event.description.toLowerCase().includes(this.filters.name.toLowerCase());

      // Filtro por tipo de evento
      const typeMatch = !this.filters.eventType || event.eventType === this.filters.eventType;

      // Filtro por horário - apenas local (backend não tem esse filtro)
      const timeMatch =
        !this.filters.timeRange || this.matchTimeRange(event.eventDate, this.filters.timeRange);

      return nameMatch && typeMatch && timeMatch;
    });

    console.log(
      '🔍 Filtros aplicados - Total:',
      this.events.length,
      '→ Filtrados:',
      this.filteredEvents.length
    );

    // Forçar detecção de mudanças após aplicar filtros
    this.cdr.detectChanges();
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
    this.events = [];
    this.filteredEvents = [];
    this.hasMoreEvents = true;
    this.loadEvents();
  }

  /**
   * Manipula erro de carregamento de imagem
   */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    // Fallback para imagem padrão
    img.src = '/assets/events/default-event.jpg';
    img.onerror = null; // Previne loop infinito se a imagem padrão também falhar
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
   * Método para busca (apenas atualiza o valor, não busca automaticamente)
   */
  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const searchTerm = target.value;
    this.filters.name = searchTerm; // Apenas atualiza o filtro
  }

  /**
   * Aplica os filtros ao clicar no botão "Buscar"
   */
  applySearchFilters(): void {
    // Se houver termo de busca, buscar na API
    if (this.filters.name && this.filters.name.trim().length > 0) {
      this.currentPage = 0;
      this.events = [];
      this.filteredEvents = [];
      this.hasMoreEvents = false; // Desabilita infinite scroll durante busca

      // Buscar até 200 eventos que correspondem ao filtro
      this.loadEvents(200);
    } else if (this.filters.eventType || this.filters.timeRange) {
      // Se não houver busca por nome, mas houver outros filtros
      this.currentPage = 0;
      this.events = [];
      this.filteredEvents = [];
      this.hasMoreEvents = true;
      this.loadEvents();
    } else {
      // Se não houver nenhum filtro, recarregar eventos normais
      this.currentPage = 0;
      this.events = [];
      this.filteredEvents = [];
      this.hasMoreEvents = true;
      this.loadEvents();
    }
  }

  /**
   * Carrega mais eventos (infinite scroll)
   */
  loadMoreEvents(): void {
    if (this.isLoadingMore || !this.hasMoreEvents || this.isLoading) {
      return;
    }

    this.isLoadingMore = true;

    // Forçar detecção de mudanças para mostrar o loading
    this.cdr.detectChanges();

    this.currentPage++;

    const filters = {
      search: this.filters.name,
      category: this.filters.eventType, // Corrigido: usar 'category' ao invés de 'eventType'
    };

    // append=true para adicionar à lista existente
    this.eventsService
      .getEvents(filters, this.currentPage, this.eventsPerPage, true)
      .pipe(
        takeUntil(this.destroy$),
        // Garantir que isLoadingMore seja resetado mesmo se houver erro
        finalize(() => {
          this.isLoadingMore = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response: EventsResponse) => {
          // Verificar se realmente há eventos novos
          if (response.events.length === 0) {
            this.hasMoreEvents = false;
            return;
          }

          // Adicionar novos eventos sem duplicatas
          const newEvents = response.events.filter(
            (newEvent: ApiEvent) =>
              !this.events.some((existingEvent) => existingEvent.id === newEvent.id)
          );

          this.events = [...this.events, ...newEvents];
          this.totalEvents = response.total;
          this.totalPages = response.pagination.totalPages;
          this.hasMoreEvents = this.currentPage < response.pagination.totalPages - 1;

          // SEMPRE aplicar filtros após carregar mais eventos
          // Isso garante que o filtro de nome seja respeitado durante o infinite scroll
          this.applyFilters();

          // Forçar detecção de mudanças múltiplas vezes
          this.cdr.detectChanges();

          // Segunda detecção após um tick
          setTimeout(() => {
            this.cdr.detectChanges();
          }, 0);

          // Terceira detecção para garantir
          setTimeout(() => {
            this.cdr.detectChanges();
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
   * Navega para a página de eventos (reload)
   */
  navigateToEvents(): void {
    window.location.reload();
  }

  /**
   * Gera um gradiente único baseado no tipo do evento
   */
  getEventGradient(eventType: string): string {
    const gradients: string[] = [
      // Roxos e Azuis
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Roxo/Azul
      'linear-gradient(135deg, #5f72bd 0%, #9b23ea 100%)', // Azul Royal/Roxo
      'linear-gradient(135deg, #4e54c8 0%, #8f94fb 100%)', // Índigo Claro
      'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)', // Roxo/Azul Elétrico
      'linear-gradient(135deg, #7f00ff 0%, #e100ff 100%)', // Roxo Neon/Magenta

      // Rosas e Vermelhos
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // Rosa/Vermelho
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', // Rosa/Amarelo
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', // Coral/Rosa
      'linear-gradient(135deg, #ff6a88 0%, #ff99ac 100%)', // Rosa Intenso
      'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)', // Rosa Choque/Laranja
      'linear-gradient(135deg, #fc466b 0%, #3f5efb 100%)', // Rosa/Azul

      // Laranjas e Amarelos
      'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', // Pêssego/Laranja
      'linear-gradient(135deg, #ff8a00 0%, #e52e71 100%)', // Laranja/Rosa
      'linear-gradient(135deg, #f46b45 0%, #eea849 100%)', // Laranja Queimado
      'linear-gradient(135deg, #fdbb2d 0%, #22c1c3 100%)', // Amarelo/Turquesa
      'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)', // Laranja/Amarelo

      // Verdes
      'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)', // Verde/Azul
      'linear-gradient(135deg, #81c784 0%, #aed581 100%)', // Verde/Verde Claro
      'linear-gradient(135deg, #00c9ff 0%, #92fe9d 100%)', // Ciano/Verde Neon
      'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', // Verde Oceano/Menta
      'linear-gradient(135deg, #42e695 0%, #3bb2b8 100%)', // Verde Menta/Turquesa
      'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)', // Verde Grama

      // Cianos e Azuis Claros
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', // Azul Claro/Ciano
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', // Verde/Ciano
      'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)', // Ciano/Azul Médio
      'linear-gradient(135deg, #2af598 0%, #009efd 100%)', // Verde Água/Azul
      'linear-gradient(135deg, #08aeea 0%, #2af598 100%)', // Azul Oceano/Verde Água

      // Lavandas e Pastéis
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', // Verde/Rosa Claro
      'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', // Lavanda/Rosa
      'linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)', // Salmão/Rosa Claro
      'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)', // Lavanda/Bege
      'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)', // Rosa Pastel/Azul Pastel

      // Vermelhos Intensos
      'linear-gradient(135deg, #ff8a80 0%, #ffccbc 100%)', // Vermelho/Pêssego
      'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)', // Vermelho Vivo
      'linear-gradient(135deg, #dd5e89 0%, #f7bb97 100%)', // Rosa Escuro/Pêssego

      // Tons Sunset/Tropical
      'linear-gradient(135deg, #fa8bff 0%, #2bd2ff 90%, #2bff88 100%)', // Arco-íris
      'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)', // Rosa Intenso/Coral
      'linear-gradient(135deg, #fdfc47 0%, #24fe41 100%)', // Amarelo Neon/Verde Neon
      'linear-gradient(135deg, #f83600 0%, #f9d423 100%)', // Vermelho Fogo/Dourado
      'linear-gradient(135deg, #ff4e50 0%, #f9d423 100%)', // Vermelho/Amarelo Sunset

      // Tons Místicos/Noturnos
      'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)', // Azul Noturno
      'linear-gradient(135deg, #360033 0%, #0b8793 100%)', // Roxo Escuro/Turquesa
      'linear-gradient(135deg, #3a1c71 0%, #d76d77 50%, #ffaf7b 100%)', // Roxo/Rosa/Pêssego

      // Tons Vibrantes Extras
      'linear-gradient(135deg, #ff0099 0%, #493240 100%)', // Magenta/Roxo Escuro
      'linear-gradient(135deg, #4481eb 0%, #04befe 100%)', // Azul Céu
      'linear-gradient(135deg, #e14fad 0%, #f9d423 100%)', // Rosa/Amarelo Vibrante
      'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)', // Roxo Claro/Rosa
      'linear-gradient(135deg, #36d1dc 0%, #5b86e5 100%)', // Turquesa/Azul
    ];

    // Usa o ID do evento para mais variação (se disponível)
    // Caso contrário usa o tipo do evento
    let hash = 0;

    if (!eventType) {
      // Se não houver tipo, gera um número aleatório baseado no timestamp
      hash = Math.floor(Math.random() * gradients.length);
    } else {
      // Gera um hash simples da string para ter consistência
      for (let i = 0; i < eventType.length; i++) {
        const char = eventType.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
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
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (user) => {
        if (user) {
          this.user = user;
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Erro ao carregar dados do usuário:', error);
      },
    });

    // Se estiver autenticado mas não tiver cache, buscar do backend
    if (!cachedUser && this.authService.isAuthenticated()) {
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
   * Verifica se o usuário está autenticado
   */
  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  /**
   * Navega para a página de login
   */
  navigateToLogin(): void {
    this.router.navigate(['/login']);
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
    // Fechar o dropdown primeiro
    this.closeUserDropdown();

    // Fazer logout via AuthService (aguarda conclusão)
    this.authService
      .logout()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Redirecionar para página de login após logout completo
          console.log('🚪 Redirecionando para login...');
          this.router.navigate(['/login']);
        },
        error: (error) => {
          console.error('❌ Erro durante logout:', error);
          // Mesmo com erro, redireciona para login
          this.router.navigate(['/login']);
        },
      });
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

    // NÃO carregar mais eventos se houver filtro de nome ativo
    // O filtro de nome é local, então não faz sentido buscar mais eventos da API
    if (this.filters.name && this.filters.name.trim().length > 0) {
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
