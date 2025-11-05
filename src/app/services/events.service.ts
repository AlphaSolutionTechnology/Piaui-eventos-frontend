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
// Resposta real do backend:
// {
//   "id": 6,
//   "name": "Tech Summit 2025",
//   "description": "Annual tech conference",
//   "imageUrl": "https://cdn.example.com/img/events/tech-summit.jpg",
//   "eventDate": "2025-12-31T20:00:00",
//   "eventType": "CONFERENCE",
//   "maxSubs": 500,
//   "locationId": 21,
//   "version": 0,
//   "subscribedCount": 0  // ⚠️ É "subscribedCount", não "subscribersCount"
// }
interface BackendEvent {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  eventDate: string; // ISO format: "2025-12-15T20:00:00"
  eventType: string;
  maxSubs: number;
  subscribedCount?: number; 
  locationId: number; // ID da localização
  eventLocation?: { // Campo opcional - pode não estar presente na resposta
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

    // Validar parâmetros
    const validatedPage = Math.max(0, Math.floor(page));
    const validatedSize = Math.max(1, Math.min(100, Math.floor(size))); // Limitar entre 1 e 100

    // Construir parâmetros HTTP
    let params = new HttpParams()
      .set('page', validatedPage.toString())
      .set('size', validatedSize.toString())
      .set('sort', 'eventDate,desc'); // Ordenar por data (mais recentes primeiro)

    if (filter?.search && filter.search.trim()) {
      params = params.set('search', filter.search.trim());
    }

    if (filter?.category && filter.category.trim()) {
      params = params.set('eventType', filter.category.trim());
    }

    // Log apenas em desenvolvimento
    if (!environment.production) {
      const url = `${this.apiUrl}?${params.toString()}`;
      console.log('📡 Chamando API:', url);
    }

    // Fazer requisição para a API
    // O authInterceptor adiciona automaticamente withCredentials: true para enviar cookies HTTP-only
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
        
        // Determinar mensagem de erro baseada no tipo de erro
        let errorMessage = 'Erro ao carregar eventos. Tente novamente.';
        
        if (error.status === 404) {
          errorMessage = 'Endpoint de eventos não encontrado.';
        } else if (error.status === 500) {
          errorMessage = 'Erro interno do servidor. Tente novamente mais tarde.';
        } else if (error.status === 0) {
          errorMessage = 'Erro de conexão. Verifique sua internet.';
        } else if (error.status >= 400 && error.status < 500) {
          errorMessage = 'Erro na requisição. Verifique os parâmetros.';
        }
        
        this.errorSubject.next(errorMessage);
        this.loadingSubject.next(false);
        
        // Retornar erro em vez de dados falsos para que o componente possa lidar adequadamente
        throw error;
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
    // Validar e criar data de forma segura
    let eventDate: Date;
    try {
      eventDate = new Date(backendEvent.eventDate);
      if (isNaN(eventDate.getTime())) {
        console.warn('Data inválida recebida do backend:', backendEvent.eventDate);
        eventDate = new Date(); // Fallback para data atual
      }
    } catch (error) {
      console.warn('Erro ao processar data do evento:', error);
      eventDate = new Date(); // Fallback para data atual
    }

    // Extrair informações de localização de forma segura
    const locationName = backendEvent.eventLocation?.placeName || `Localização ${backendEvent.locationId}`;
    const locationAddress = backendEvent.eventLocation?.fullAddress || 'Endereço não disponível';

    // Validar e processar URL da imagem
    const imageUrl = this.validateImageUrl(backendEvent.imageUrl);

    // Formatar tempo de forma segura
    let formattedTime: string;
    try {
      formattedTime = eventDate.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
      });
    } catch (error) {
      console.warn('Erro ao formatar tempo:', error);
      formattedTime = '00:00'; // Fallback
    }

    return {
      id: backendEvent.id,
      title: backendEvent.name,
      name: backendEvent.name,
      description: backendEvent.description,
      category: backendEvent.eventType,
      eventType: backendEvent.eventType,
      date: backendEvent.eventDate.split('T')[0], // "2025-12-15"
      eventDate: backendEvent.eventDate,
      time: formattedTime,
      location: locationName,
      address: locationAddress,
      price: 0, // Backend não tem campo de preço ainda
      maxParticipants: backendEvent.maxSubs,
      currentParticipants: backendEvent.subscribedCount || 0, // ✅ Nome correto do backend
      organizerName: 'Organizador', // Backend não tem campo de organizador ainda
      organizerEmail: '',
      organizerPhone: '',
      imageUrl: imageUrl,
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
   * Valida e processa URL da imagem, substituindo URLs de exemplo por imagem padrão
   */
  private validateImageUrl(imageUrl?: string): string {
    // Se não há URL, retornar imagem padrão
    if (!imageUrl || imageUrl.trim() === '') {
      return 'assets/events/evento-exemplo.svg';
    }

    // Lista de domínios de exemplo que devem ser substituídos
    const exampleDomains = [
      'example.com',
      'placeholder.com',
      'via.placeholder.com',
      'picsum.photos',
      'loremflickr.com',
      'dummyimage.com'
    ];

    try {
      const url = new URL(imageUrl);
      
      // Verificar se é um domínio de exemplo
      const isExampleDomain = exampleDomains.some(domain => 
        url.hostname.includes(domain)
      );

      if (isExampleDomain) {
        console.warn('URL de imagem de exemplo detectada, usando imagem padrão:', imageUrl);
        return 'assets/events/evento-exemplo.svg';
      }

      // Se é uma URL válida e não é de exemplo, retornar como está
      return imageUrl;
    } catch (error) {
      // Se não conseguir fazer parse da URL, usar imagem padrão
      console.warn('URL de imagem inválida, usando imagem padrão:', imageUrl);
      return 'assets/events/evento-exemplo.svg';
    }
  }

  /**
   * Busca um evento específico por ID
   * O authInterceptor adiciona automaticamente withCredentials: true
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
   * O authInterceptor adiciona automaticamente withCredentials: true
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
   * O authInterceptor adiciona automaticamente withCredentials: true
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
   * O authInterceptor adiciona automaticamente withCredentials: true
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
