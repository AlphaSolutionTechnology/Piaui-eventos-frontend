import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { EventsService, EventsFilter } from '../../services/events.service';
import { ApiEvent } from '../../models/api-event.interface';

@Component({
  standalone: true,
  selector: 'events-page',
  imports: [CommonModule, RouterLink, FormsModule, HttpClientModule],
  templateUrl: './events-page.html',
  styleUrl: './events-page.css',
  providers: [EventsService],
})
export class EventsPage implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  // Dados do usuário
  user = {
    name: 'João Silva',
    role: 'Participante',
    avatar: '', // Deixe vazio para mostrar iniciais, ou coloque uma URL para mostrar foto
  };

  // Controla se o dropdown do usuário está aberto
  isUserDropdownOpen = false;

  // Dados da API
  events: ApiEvent[] = [];
  filteredEvents: ApiEvent[] = [];
  eventTypes: string[] = [];
  isLoading = false;
  error: string | null = null;

  // Paginação
  currentPage = 1;
  totalEvents = 0;
  eventsPerPage = 12;

  // Objeto para armazenar os filtros
  filters = {
    name: '',
    timeRange: '',
    eventType: '',
  };

  // Controla se os filtros estão abertos ou fechados
  isFiltersOpen = false;

  constructor(private eventsService: EventsService) {}

  ngOnInit(): void {
    this.loadEvents();
    this.loadEventTypes();
    this.setupSearchDebounce();
    this.subscribeToServiceStates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadEvents(): void {
    const filters = {
      search: this.filters.name,
      eventType: this.filters.eventType,
      page: this.currentPage,
      limit: this.eventsPerPage,
    };

    this.eventsService
      .getEvents(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.events = response.events;
          this.totalEvents = response.total;
          this.applyFilters();
        },
        error: (error) => {
          this.error = 'Erro ao carregar eventos. Tente novamente.';
          console.error('Erro ao carregar eventos:', error);
        },
      });
  }

  private loadEventTypes(): void {
    this.eventsService
      .getEventTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (types) => {
          this.eventTypes = types;
        },
        error: (error) => {
          console.error('Erro ao carregar tipos de evento:', error);
        },
      });
  }

  private setupSearchDebounce(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((searchTerm) => {
        this.filters.name = searchTerm;
        this.currentPage = 1;
        this.loadEvents();
      });
  }

  private subscribeToServiceStates(): void {
    this.eventsService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading: boolean) => (this.isLoading = loading));

    this.eventsService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe((error: string | null) => (this.error = error));
  }

  /**
   * Aplica todos os filtros aos eventos
   */
  applyFilters(): void {
    this.filteredEvents = this.events.filter((event) => {
      // Filtro por nome (busca no título e descrição)
      const nameMatch =
        !this.filters.name ||
        event.name.toLowerCase().includes(this.filters.name.toLowerCase()) ||
        event.description.toLowerCase().includes(this.filters.name.toLowerCase());

      // Filtro por tipo de evento
      const typeMatch = !this.filters.eventType || event.eventType === this.filters.eventType;

      // Filtro por horário
      const timeMatch =
        !this.filters.timeRange || this.matchTimeRange(event.eventDate, this.filters.timeRange);

      return nameMatch && typeMatch && timeMatch;
    });
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
    this.currentPage = 1;
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
    this.searchSubject.next(searchTerm);
  }

  /**
   * Carrega mais eventos (paginação)
   */
  loadMoreEvents(): void {
    this.currentPage++;
    this.loadEvents();
  }

  /**
   * Reseta a paginação
   */
  resetPagination(): void {
    this.currentPage = 1;
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
    // TODO: Implementar navegação para página de detalhes
    console.log('Navegar para evento:', eventId);
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
   * Obtém as iniciais do nome do usuário
   */
  getUserInitials(): string {
    return this.user.name
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase())
      .slice(0, 2) // Máximo 2 iniciais
      .join('');
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
   * Fecha o dropdown ao clicar fora
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-avatar')) {
      this.isUserDropdownOpen = false;
    }
  }
}
