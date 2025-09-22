import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { ApiEvent, EventsFilter, EventsResponse } from '../models/api-event.interface';

export type { EventsFilter } from '../models/api-event.interface';

@Injectable({
  providedIn: 'root',
})
export class EventsService {
  private readonly apiUrl = '/api/events'; // Base URL da API

  // Estados do serviço
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private eventsSubject = new BehaviorSubject<ApiEvent[]>([]);

  // Observables públicos
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();
  public events$ = this.eventsSubject.asObservable();

  // Dados mockados para desenvolvimento
  private mockEvents: ApiEvent[] = [
    {
      id: 1,
      title: 'Festival de Música Eletrônica',
      name: 'Festival de Música Eletrônica',
      description: 'Uma noite incrível com os melhores DJs nacionais e internacionais.',
      category: 'Música',
      eventType: 'Música',
      date: '2025-12-15',
      eventDate: '2025-12-15',
      time: '20:00',
      location: 'Arena Riverside',
      address: 'Av. Raul Lopes, 1000 - Teresina, PI',
      price: 80.0,
      maxParticipants: 500,
      currentParticipants: 320,
      organizerName: 'EventPro',
      organizerEmail: 'contato@eventpro.com',
      organizerPhone: '(86) 3234-5678',
      imageUrl: 'assets/events/evento-exemplo.svg',
      tags: ['música', 'eletrônica', 'festa', 'dj'],
      requiresApproval: false,
      isPublic: true,
      allowWaitlist: true,
      status: 'published',
      createdAt: '2025-09-01T10:00:00Z',
      updatedAt: '2025-09-15T14:30:00Z',
    },
    {
      id: 2,
      title: 'Workshop de Desenvolvimento Web',
      name: 'Workshop de Desenvolvimento Web',
      description: 'Aprenda as últimas tecnologias de desenvolvimento web com especialistas.',
      category: 'Tecnologia',
      eventType: 'Tecnologia',
      date: '2025-10-10',
      eventDate: '2025-10-10',
      time: '14:00',
      location: 'Centro de Convenções',
      address: 'Centro - Teresina, PI',
      price: 120.0,
      maxParticipants: 50,
      currentParticipants: 35,
      organizerName: 'TechHub PI',
      organizerEmail: 'eventos@techhub.com',
      organizerPhone: '(86) 99999-8888',
      imageUrl: 'assets/events/evento-exemplo.svg',
      tags: ['tecnologia', 'programação', 'web', 'workshop'],
      requiresApproval: true,
      isPublic: true,
      allowWaitlist: false,
      status: 'published',
      createdAt: '2025-08-20T09:00:00Z',
      updatedAt: '2025-09-01T16:20:00Z',
    },
    {
      id: 3,
      title: 'Feira de Artesanato Local',
      name: 'Feira de Artesanato Local',
      description: 'Exposição e venda de artesanatos produzidos por artistas locais.',
      category: 'Cultura',
      eventType: 'Cultura',
      date: '2025-11-05',
      eventDate: '2025-11-05',
      time: '08:00',
      location: 'Praça Pedro II',
      address: 'Centro Histórico - Teresina, PI',
      price: 0,
      maxParticipants: 1000,
      currentParticipants: 150,
      organizerName: 'Secretaria de Cultura',
      organizerEmail: 'cultura@teresina.pi.gov.br',
      organizerPhone: '(86) 3215-7890',
      imageUrl: 'assets/events/evento-exemplo.svg',
      tags: ['cultura', 'artesanato', 'arte', 'gratuito'],
      requiresApproval: false,
      isPublic: true,
      allowWaitlist: false,
      status: 'published',
      createdAt: '2025-08-10T11:00:00Z',
      updatedAt: '2025-08-25T10:15:00Z',
    },
  ];

  constructor(private http: HttpClient) {}

  /**
   * Busca eventos com filtros opcionais
   */
  getEvents(
    filter?: EventsFilter,
    page: number = 1,
    size: number = 10
  ): Observable<EventsResponse> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    // Por enquanto retorna dados mockados
    // Em produção, substituir por chamada HTTP real
    return this.getMockEvents(filter, page, size).pipe(
      tap((response) => {
        this.eventsSubject.next(response.events);
        this.loadingSubject.next(false);
      }),
      catchError((error) => {
        this.errorSubject.next('Erro ao carregar eventos');
        this.loadingSubject.next(false);
        return of({
          events: [],
          pagination: { page: 1, size: 10, total: 0, totalPages: 0 },
          total: 0,
        });
      })
    );
  }

  /**
   * Busca um evento específico por ID
   */
  getEventById(id: number): Observable<ApiEvent | null> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    const event = this.mockEvents.find((e) => e.id === id);

    return of(event || null).pipe(
      tap(() => this.loadingSubject.next(false)),
      catchError((error) => {
        this.errorSubject.next('Erro ao carregar evento');
        this.loadingSubject.next(false);
        return of(null);
      })
    );
  }

  /**
   * Cria um novo evento
   */
  createEvent(eventData: Partial<ApiEvent>): Observable<ApiEvent> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    // Simula criação de evento
    const newEvent: ApiEvent = {
      id: Math.max(...this.mockEvents.map((e) => e.id)) + 1,
      title: eventData.title || '',
      name: eventData.title || '',
      description: eventData.description || '',
      category: eventData.category || '',
      eventType: eventData.category || '',
      date: eventData.date || '',
      eventDate: eventData.date || '',
      time: eventData.time || '',
      location: eventData.location || '',
      address: eventData.address || '',
      price: eventData.price || 0,
      maxParticipants: eventData.maxParticipants || 0,
      currentParticipants: 0,
      organizerName: eventData.organizerName || '',
      organizerEmail: eventData.organizerEmail || '',
      organizerPhone: eventData.organizerPhone || '',
      imageUrl: eventData.imageUrl,
      tags: eventData.tags || [],
      requiresApproval: eventData.requiresApproval || false,
      isPublic: eventData.isPublic !== false,
      allowWaitlist: eventData.allowWaitlist || false,
      status: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.mockEvents.push(newEvent);

    return of(newEvent).pipe(
      tap(() => {
        this.loadingSubject.next(false);
        this.eventsSubject.next([...this.mockEvents]);
      }),
      catchError((error) => {
        this.errorSubject.next('Erro ao criar evento');
        this.loadingSubject.next(false);
        throw error;
      })
    );
  }

  /**
   * Implementação mockada para desenvolvimento
   */
  private getMockEvents(
    filter?: EventsFilter,
    page: number = 1,
    size: number = 10
  ): Observable<EventsResponse> {
    let filteredEvents = [...this.mockEvents];

    // Aplicar filtros
    if (filter) {
      if (filter.search) {
        const searchTerm = filter.search.toLowerCase();
        filteredEvents = filteredEvents.filter(
          (event) =>
            event.title.toLowerCase().includes(searchTerm) ||
            event.description.toLowerCase().includes(searchTerm) ||
            event.tags.some((tag) => tag.toLowerCase().includes(searchTerm))
        );
      }

      if (filter.category) {
        filteredEvents = filteredEvents.filter((event) => event.category === filter.category);
      }

      if (filter.priceMin !== undefined) {
        filteredEvents = filteredEvents.filter((event) => event.price >= filter.priceMin!);
      }

      if (filter.priceMax !== undefined) {
        filteredEvents = filteredEvents.filter((event) => event.price <= filter.priceMax!);
      }

      if (filter.dateFrom) {
        filteredEvents = filteredEvents.filter((event) => event.date >= filter.dateFrom!);
      }

      if (filter.dateTo) {
        filteredEvents = filteredEvents.filter((event) => event.date <= filter.dateTo!);
      }
    }

    // Aplicar paginação
    const total = filteredEvents.length;
    const totalPages = Math.ceil(total / size);
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;
    const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

    const response: EventsResponse = {
      events: paginatedEvents,
      pagination: {
        page,
        size,
        total,
        totalPages,
      },
      total,
    };

    return of(response);
  }

  /**
   * Limpa o estado de erro
   */
  clearError(): void {
    this.errorSubject.next(null);
  }

  /**
   * Busca categorias disponíveis
   */
  getCategories(): Observable<string[]> {
    const categories = [...new Set(this.mockEvents.map((event) => event.category))];
    return of(categories);
  }

  /**
   * Busca tipos de eventos disponíveis
   */
  getEventTypes(): Observable<string[]> {
    const eventTypes = [...new Set(this.mockEvents.map((event) => event.category))]; // Using category as eventType
    return of(eventTypes);
  }
}
