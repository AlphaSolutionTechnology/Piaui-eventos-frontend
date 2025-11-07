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
import { Subject, takeUntil, finalize } from 'rxjs';
import { EventsService } from '../../services/events.service';
import { ApiEvent, EventsResponse, EventsFilter } from '../../models/api-event.interface';
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
  private darkModeObserver: MutationObserver | null = null;

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
  events: ApiEvent[] = [];
  filteredEvents: ApiEvent[] = [];
  eventTypes: string[] = [];
  isLoading = false;
  error: string | null = null;

  currentPage = 0;
  totalEvents = 0;
  totalPages = 0;
  eventsPerPage = 20;
  hasMoreEvents = true;
  isLoadingMore = false;

  filters = {
    name: '',
    timeRange: '',
    eventType: '',
  };

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
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo(0, 0);
      const savedTheme = localStorage.getItem('theme');
      this.isDarkModeActive = savedTheme === 'dark';

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

    this.loadUserData();
    this.loadEventTypes();

    this.subscribeToServiceStates();
    this.loadEvents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.darkModeObserver?.disconnect();
  }

  loadEvents(pageSize?: number): void {
    const size = pageSize || this.eventsPerPage;
    const filters: EventsFilter = {
      search: this.filters.name,
      category: this.filters.eventType,
    };

    this.eventsService
      .getEvents(filters, this.currentPage, size, false)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.events = response.events;
          this.totalEvents = response.total;
          this.totalPages = response.pagination.totalPages;
          this.hasMoreEvents = this.currentPage < response.pagination.totalPages - 1;
          this.applyFilters();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.error = 'Erro ao carregar eventos.';
          this.cdr.detectChanges();
        },
      });
  }

  private loadEventTypes(): void {
    this.eventsService
      .getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (types) => {
          this.eventTypes = types;
        },
      });
  }

  private subscribeToServiceStates(): void {
    this.eventsService.loading$.pipe(takeUntil(this.destroy$)).subscribe((loading) => {
      this.isLoading = loading;
      this.cdr.detectChanges();
    });

    this.eventsService.error$.pipe(takeUntil(this.destroy$)).subscribe((error) => {
      this.error = error;
      this.cdr.detectChanges();
    });

    this.eventsService.events$.pipe(takeUntil(this.destroy$)).subscribe((events) => {
      if (events.length > 0 && this.events.length === 0) {
        this.events = events;
        this.applyFilters();
        this.cdr.detectChanges();
      }
    });
  }

  applyFilters(): void {
    this.filteredEvents = this.events.filter((event) => {
      const nameMatch =
        !this.filters.name ||
        event.name.toLowerCase().includes(this.filters.name.toLowerCase()) ||
        event.description.toLowerCase().includes(this.filters.name.toLowerCase());

      const typeMatch = !this.filters.eventType || event.eventType === this.filters.eventType;

      const timeMatch =
        !this.filters.timeRange || this.matchTimeRange(event.eventDate, this.filters.timeRange);

      return nameMatch && typeMatch && timeMatch;
    });
    this.cdr.detectChanges();
  }

  private matchTimeRange(eventDate: string, range: string): boolean {
    const { hours } = this.parseBrazilianDate(eventDate);
    switch (range) {
      case 'morning': return hours >= 6 && hours < 12;
      case 'afternoon': return hours >= 12 && hours < 18;
      case 'evening': return hours >= 18 && hours < 24;
      case 'night': return hours >= 0 && hours < 6;
      default: return true;
    }
  }

  private parseBrazilianDate(dateStr: string): { hours: number } {
    const [datePart, timePart] = dateStr.split(' ');
    const [hours] = (timePart || '00:00:00').split(':').map(Number);
    return { hours };
  }

  clearFilters(): void {
    this.filters = { name: '', timeRange: '', eventType: '' };
    this.currentPage = 0;
    this.hasMoreEvents = true;
    this.filteredEvents = this.events;
    this.cdr.detectChanges();
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/events/evento-exemplo.svg';
    img.onerror = null;
  }

  hasActiveFilters(): boolean {
    return Object.values(this.filters).some(v => v !== '');
  }

  toggleFilters(): void {
    this.isFiltersOpen = !this.isFiltersOpen;
  }

  getActiveFiltersCount(): number {
    return Object.values(this.filters).filter(v => v !== '').length;
  }

  onSearchInput(event: Event): void {
    // Just update the filter value, don't apply filters yet
    const target = event.target as HTMLInputElement;
    this.filters.name = target.value;
    this.cdr.detectChanges();
  }

  applySearchFilters(): void {
    this.currentPage = 0;
    this.applyFilters();
    this.cdr.detectChanges();
  }

  loadMoreEvents(): void {
    if (this.isLoadingMore || !this.hasMoreEvents || this.isLoading || this.filters.name) return;

    this.isLoadingMore = true;
    this.cdr.detectChanges();

    this.currentPage++;
    const filters: EventsFilter = {
      search: this.filters.name,
      category: this.filters.eventType,
    };

    this.eventsService
      .getEvents(filters, this.currentPage, this.eventsPerPage, true)
      .pipe(finalize(() => {
        this.isLoadingMore = false;
        this.cdr.detectChanges();
      }), takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.events.length === 0) {
            this.hasMoreEvents = false;
            return;
          }

          const newEvents = response.events.filter(
            e => !this.events.some(existing => existing.id === e.id)
          );

          this.events = [...this.events, ...newEvents];
          this.totalEvents = response.total;
          this.totalPages = response.pagination.totalPages;
          this.hasMoreEvents = this.currentPage < response.pagination.totalPages - 1;
          this.applyFilters();
          this.cdr.detectChanges();
        },
        error: () => {
          this.currentPage--;
          this.cdr.detectChanges();
        },
      });
  }

  formatEventDate(eventDate: string): string {
    const [datePart, timePart] = eventDate.split(' ');
    const [day, month, year] = datePart.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDay = new Date(date);
    eventDay.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Hoje às ${timePart.substring(0, 5)}`;
    }
    if (diffDays === 1) {
      return `Amanhã às ${timePart.substring(0, 5)}`;
    }

    return `${datePart} às ${timePart.substring(0, 5)}`;
  }

  navigateToEvent(eventId: number): void {
    this.router.navigate(['/event', eventId]);
  }

  getEventGradient(eventType: string): string {
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
    ];

    let hash = 0;
    const type = eventType || 'default';
    for (let i = 0; i < type.length; i++) {
      hash = (hash << 5) - hash + type.charCodeAt(i);
      hash = hash & hash;
    }
    return gradients[Math.abs(hash) % gradients.length];
  }

  getEventTag(eventId: number): string {
    const tags = ['VIP', 'NEW', 'HOT', 'PREMIUM', 'SPECIAL'];
    return tags[eventId % tags.length];
  }

  formatEventType(eventType: string): string {
    const map: Record<string, string> = {
      CONFERENCE: 'CONFERÊNCIA',
      WORKSHOP: 'WORKSHOP',
      SEMINAR: 'SEMINÁRIO',
      CULTURAL: 'CULTURAL',
      ESPORTIVO: 'ESPORTE',
      TECNOLOGIA: 'TECNOLOGIA',
    };
    return map[eventType?.toUpperCase()] || eventType?.toUpperCase() || 'EVENTO';
  }

  loadUserData(): void {
    const cached = this.authService.getCurrentUser();
    if (cached) {
      this.user = cached;
      this.cdr.detectChanges();
    }

    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user) {
        this.user = user;
        this.cdr.detectChanges();
      }
    });

    // ✅ Apenas tenta buscar dados do usuário se JÁ ESTIVER autenticado
    // Não fazer requisição desnecessária se não está logado
    if (this.authService.isAuthenticated() && !cached) {
      this.authService.fetchCurrentUser().subscribe({
        error: (error) => {
          // Se falhar (ex: token expirado), continua sem fazer logout
          console.warn('Erro ao buscar dados do usuário, mas continua navegando:', error);
        }
      });
    }
  }

  getUserInitials(): string {
    return this.authService.getUserInitials(this.user.name);
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  toggleUserDropdown(): void {
    this.isUserDropdownOpen = !this.isUserDropdownOpen;
  }

  closeUserDropdown(): void {
    this.isUserDropdownOpen = false;
  }

  logout(): void {
    this.closeUserDropdown();
    this.authService.logout().pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!event.target) return;
    const target = event.target as HTMLElement;
    if (!target.closest('.user-avatar')) {
      this.isUserDropdownOpen = false;
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.isLoadingMore || !this.hasMoreEvents || this.isLoading || this.filters.name) return;

    const scrollPosition = window.pageYOffset + window.innerHeight;
    const pageHeight = document.documentElement.scrollHeight;
    const threshold = pageHeight * 0.8;

    if (scrollPosition >= threshold) {
      this.ngZone.run(() => this.loadMoreEvents());
    }
  }
}