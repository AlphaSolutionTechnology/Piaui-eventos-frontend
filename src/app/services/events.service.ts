import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { ApiEvent, EventsFilter, EventsResponse } from '../models/api-event.interface';
import { environment } from '../../../enviroment';

export type { EventsFilter } from '../models/api-event.interface';

// Interface para a resposta paginada do Spring Boot
interface SpringPageResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  numberOfElements: number;
  first: boolean;
  empty: boolean;
}

// Interface para o evento do backend (EventResponse do Spring Boot)
interface BackendEvent {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  eventDate: string; // ISO format: "2025-12-15T20:00:00"
  eventType: string;
  maxSubs: number;
  subscribersCount: number;
  eventLocation: {
    id: number;
    placeName: string;
    fullAddress: string;
    zipCode: string;
    latitude: string;
    longitude: string;
    locationCategory: string;
  };
  version: number;
}

@Injectable({
  providedIn: 'root',
})
export class EventsService {
  private readonly apiUrl = `${environment.API_URL}/events`;

  // Estados do serviço
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private eventsSubject = new BehaviorSubject<ApiEvent[]>([]);

  // Observables públicos
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();
  public events$ = this.eventsSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Retorna o valor atual dos eventos em cache
   */
  getCachedEvents(): ApiEvent[] {
    return this.eventsSubject.value;
  }

  /**
   * Retorna o estado atual de loading
   */
  isCurrentlyLoading(): boolean {
    return this.loadingSubject.value;
  }

  /**
   * Reseta o estado de loading manualmente
   */
  resetLoading(): void {
    this.loadingSubject.next(false);
  }

  /**
   * Busca eventos com filtros opcionais e paginação
   * @param filter - Filtros de busca
   * @param page - Número da página (0-indexed)
   * @param size - Quantidade de itens por página
   * @param append - Se true, adiciona os novos eventos aos existentes (para infinite scroll)
   */
  getEvents(
    filter?: EventsFilter,
    page: number = 0,
    size: number = 20,
    append: boolean = false
  ): Observable<EventsResponse> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    // Construir parâmetros HTTP
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'eventDate,desc'); // Ordenar por data (mais recentes primeiro)

    if (filter?.search) {
      params = params.set('search', filter.search);
    }

    if (filter?.category) {
      params = params.set('eventType', filter.category);
    }

    // Log para debug
    const url = `${this.apiUrl}?${params.toString()}`;
    console.log('📡 Chamando API:', url);

    // Fazer requisição para a API (endpoint público, sem withCredentials)
    return this.http.get<SpringPageResponse<BackendEvent>>(this.apiUrl, { params }).pipe(
      map((response) => {
        return this.transformBackendResponse(response);
      }),
      tap((response) => {
        this.loadingSubject.next(false);

        // Apenas atualizar o BehaviorSubject se append=false
        // Se append=true, o componente gerencia a lista internamente
        if (!append) {
          this.eventsSubject.next(response.events);
        }
      }),
      catchError((error) => {
        console.error('EventsService.getEvents() - Erro ao carregar eventos:', error);
        this.errorSubject.next('Erro ao carregar eventos. Tente novamente.');
        this.loadingSubject.next(false);
        return of({
          events: [],
          pagination: { page: 0, size, total: 0, totalPages: 0 },
          total: 0,
        });
      })
    );
  }

  /**
   * Transforma a resposta do backend Spring Boot para o formato do frontend
   */
  private transformBackendResponse(response: SpringPageResponse<BackendEvent>): EventsResponse {
    const events: ApiEvent[] = response.content.map((event) => this.transformBackendEvent(event));

    return {
      events,
      pagination: {
        page: response.number,
        size: response.size,
        total: response.totalElements,
        totalPages: response.totalPages,
      },
      total: response.totalElements,
    };
  }

  /**
   * Transforma um evento do backend para o formato do frontend
   */
  private transformBackendEvent(backendEvent: BackendEvent): ApiEvent {
    const eventDate = new Date(backendEvent.eventDate);

    return {
      id: backendEvent.id,
      title: backendEvent.name,
      name: backendEvent.name,
      description: backendEvent.description,
      category: backendEvent.eventType,
      eventType: backendEvent.eventType,
      date: backendEvent.eventDate.split('T')[0], // "2025-12-15"
      eventDate: backendEvent.eventDate,
      time: eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      location: backendEvent.eventLocation.placeName,
      address: backendEvent.eventLocation.fullAddress,
      price: 0, // Backend não tem campo de preço ainda
      maxParticipants: backendEvent.maxSubs,
      currentParticipants: backendEvent.subscribersCount,
      organizerName: 'Organizador', // Backend não tem campo de organizador ainda
      organizerEmail: '',
      organizerPhone: '',
      imageUrl: backendEvent.imageUrl || 'assets/events/evento-exemplo.svg',
      tags: [], // Backend não tem tags ainda
      requiresApproval: false,
      isPublic: true,
      allowWaitlist: false,
      status: 'published',
      createdAt: backendEvent.eventDate,
      updatedAt: backendEvent.eventDate,
    };
  }

  /**
   * Busca um evento específico por ID
   */
  getEventById(id: number): Observable<ApiEvent | null> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return this.http.get<BackendEvent>(`${this.apiUrl}/${id}`).pipe(
      map((backendEvent) => this.transformBackendEvent(backendEvent)),
      tap(() => this.loadingSubject.next(false)),
      catchError((error) => {
        console.error('Erro ao carregar evento:', error);
        this.errorSubject.next('Erro ao carregar evento. Tente novamente.');
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

    // Transformar dados do frontend para o formato do backend
    const backendEventData = {
      name: eventData.name || eventData.title || '',
      description: eventData.description || '',
      imageUrl: eventData.imageUrl || '',
      eventDate: `${eventData.date}T${eventData.time}:00`, // "2025-12-15T20:00:00"
      eventType: eventData.eventType || eventData.category || '',
      maxSubs: eventData.maxParticipants || 0,
      eventLocation: {
        placeName: eventData.location || '',
        fullAddress: eventData.address || '',
        zipCode: '',
        latitude: '0',
        longitude: '0',
        locationCategory: 'OTHER',
      },
    };

    return this.http.post<BackendEvent>(this.apiUrl, backendEventData).pipe(
      map((backendEvent) => this.transformBackendEvent(backendEvent)),
      tap((newEvent) => {
        this.loadingSubject.next(false);
        // Atualizar lista de eventos
        const currentEvents = this.eventsSubject.value;
        this.eventsSubject.next([newEvent, ...currentEvents]);
      }),
      catchError((error) => {
        console.error('Erro ao criar evento:', error);
        this.errorSubject.next('Erro ao criar evento. Tente novamente.');
        this.loadingSubject.next(false);
        throw error;
      })
    );
  }

  /**
   * Atualiza um evento existente
   */
  updateEvent(id: number, eventData: Partial<ApiEvent>): Observable<ApiEvent> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    const backendEventData = {
      name: eventData.name || eventData.title || '',
      description: eventData.description || '',
      imageUrl: eventData.imageUrl || '',
      eventDate: `${eventData.date}T${eventData.time}:00`,
      eventType: eventData.eventType || eventData.category || '',
      maxSubs: eventData.maxParticipants || 0,
      eventLocation: {
        placeName: eventData.location || '',
        fullAddress: eventData.address || '',
        zipCode: '',
        latitude: '0',
        longitude: '0',
        locationCategory: 'OTHER',
      },
    };

    return this.http.put<BackendEvent>(`${this.apiUrl}/${id}`, backendEventData).pipe(
      map((backendEvent) => this.transformBackendEvent(backendEvent)),
      tap(() => this.loadingSubject.next(false)),
      catchError((error) => {
        console.error('Erro ao atualizar evento:', error);
        this.errorSubject.next('Erro ao atualizar evento. Tente novamente.');
        this.loadingSubject.next(false);
        throw error;
      })
    );
  }

  /**
   * Deleta um evento
   */
  deleteEvent(id: number): Observable<void> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this.loadingSubject.next(false);
        // Remover da lista local
        const currentEvents = this.eventsSubject.value;
        this.eventsSubject.next(currentEvents.filter((e) => e.id !== id));
      }),
      catchError((error) => {
        console.error('Erro ao deletar evento:', error);
        this.errorSubject.next('Erro ao deletar evento. Tente novamente.');
        this.loadingSubject.next(false);
        throw error;
      })
    );
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
    // Retornar tipos de eventos predefinidos ou buscar da API
    const categories = ['TECNOLOGIA', 'CULTURA', 'ESPORTES', 'NEGOCIOS', 'MUSICA'];
    return of(categories);
  }

  /**
   * Busca tipos de eventos disponíveis
   */
  getEventTypes(): Observable<string[]> {
    // Retornar tipos de eventos predefinidos ou buscar da API
    const eventTypes = ['TECNOLOGIA', 'CULTURA', 'ESPORTES', 'NEGOCIOS', 'MUSICA'];
    return of(eventTypes);
  }
}
