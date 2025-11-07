import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, tap, throwError, of } from 'rxjs';
import { ApiEvent, EventsFilter, EventsResponse } from '../models/api-event.interface';
import { EventRequestDTO, EventResponseDTO, EventLocationDTO } from '../models/event-request.dto';
import { ViaCepResponse } from '../models/viacep-response.interface';
import { environment } from '../../../enviroment';

interface SpringPageResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: any;
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalPages: number;
  totalElements: number;
  last: boolean;
  size: number;
  number: number;
  sort: any;
  numberOfElements: number;
  first: boolean;
  empty: boolean;
}

interface BackendLocation {
  id: number;
  placeName: string;
  fullAddress: string;
  zipCode: string;
  latitude: string;
  longitude: string;
  category: string;
}

interface BackendEvent {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  eventDate: string;
  eventType: string;
  maxSubs: number;
  subscribedCount: number;
  location: BackendLocation;
  version: number;
}

interface BackendLocationPayload {
  placeName: string;
  fullAddress: string;
  zipCode?: string;
  latitude?: string;
  longitude?: string;
  category?: string;
}

@Injectable({
  providedIn: 'root',
})
export class EventsService {
  private readonly apiUrl = `${environment.API_URL}/events`;
  private readonly locationUrl = `${environment.API_URL}/location`;

  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private eventsSubject = new BehaviorSubject<ApiEvent[]>([]);

  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();
  public events$ = this.eventsSubject.asObservable();

  constructor(private http: HttpClient) {}

  getCachedEvents(): ApiEvent[] {
    return this.eventsSubject.value;
  }

  isCurrentlyLoading(): boolean {
    return this.loadingSubject.value;
  }

  clearError(): void {
    this.errorSubject.next(null);
  }

  getEvents(
    filter?: EventsFilter,
    page: number = 0,
    size: number = 20,
    append: boolean = false
  ): Observable<EventsResponse> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    const validatedPage = Math.max(0, Math.floor(page));
    const validatedSize = Math.max(1, Math.min(100, Math.floor(size)));

    let params = new HttpParams()
      .set('page', validatedPage.toString())
      .set('size', validatedSize.toString())
      .set('sort', 'eventDate,desc');

    if (filter?.search?.trim()) params = params.set('search', filter.search.trim());
    if (filter?.category?.trim()) params = params.set('eventType', filter.category.trim());

    return this.http.get<SpringPageResponse<BackendEvent>>(this.apiUrl, { params }).pipe(
      map((response) => this.transformBackendResponse(response)),
      tap((response) => {
        this.loadingSubject.next(false);
        if (!append) this.eventsSubject.next(response.events);
      }),
      catchError((error) => {
        this.loadingSubject.next(false);
        this.errorSubject.next(this.getErrorMessage(error));
        return throwError(() => error);
      })
    );
  }

  getEventById(id: number): Observable<ApiEvent | null> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return this.http.get<BackendEvent>(`${this.apiUrl}/${id}`).pipe(
      map((event) => this.transformBackendEvent(event)),
      tap(() => this.loadingSubject.next(false)),
      catchError((error) => {
        this.loadingSubject.next(false);
        this.errorSubject.next('Evento não encontrado.');
        return throwError(() => error);
      })
    );
  }

  createEvent(eventData: Partial<ApiEvent>, userId: number): Observable<ApiEvent> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    const payload = this.mapToEventRequestDTO(eventData, userId);

    return this.http.post<EventResponseDTO>(this.apiUrl, payload).pipe(
      map((event) => this.transformEventResponseToApiEvent(event)),
      tap((newEvent) => {
        this.loadingSubject.next(false);
        this.eventsSubject.next([newEvent, ...this.eventsSubject.value]);
      }),
      catchError((error) => {
        this.loadingSubject.next(false);
        const errorMessage = this.getCreateEventErrorMessage(error);
        this.errorSubject.next(errorMessage);
        return throwError(() => error);
      })
    );
  }

  updateEvent(id: number, eventData: Partial<ApiEvent>): Observable<ApiEvent> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    const payload = this.mapToBackendEvent(eventData);

    return this.http.put<BackendEvent>(`${this.apiUrl}/${id}`, payload).pipe(
      map((event) => this.transformBackendEvent(event)),
      tap(() => this.loadingSubject.next(false)),
      catchError((error) => {
        this.loadingSubject.next(false);
        this.errorSubject.next('Erro ao atualizar evento.');
        return throwError(() => error);
      })
    );
  }

  deleteEvent(id: number): Observable<void> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this.loadingSubject.next(false);
        this.eventsSubject.next(this.eventsSubject.value.filter((e) => e.id !== id));
      }),
      catchError((error) => {
        this.loadingSubject.next(false);
        this.errorSubject.next('Erro ao deletar evento.');
        return throwError(() => error);
      })
    );
  }

  getCategories(): Observable<string[]> {
    return new Observable((observer) => {
      observer.next([
        'CULTURAL',
        'ESPORTIVO',
        'EDUCATIVO',
        'TECNOLOGIA',
        'ENTRETENIMENTO',
        'EMPREENDEDORISMO',
        'COMERCIAL',
        'RELIGIOSO',
        'ESPORTE',
        'CONFERENCE',
      ]);
      observer.complete();
    });
  }

  getEventTypes(): Observable<string[]> {
    return this.getCategories();
  }

  /**
   * Get address by CEP (ZIP code) using ViaCEP API
   * @param cep ZIP code (CEP) in format XXXXX-XXX or XXXXXXXX
   */
  getAddressByCep(cep: string): Observable<ViaCepResponse> {
    // Remove any non-numeric characters from CEP
    const cleanCep = cep.replace(/\D/g, '');

    return this.http.get<ViaCepResponse>(`${this.locationUrl}/${cleanCep}`).pipe(
      catchError((error) => {
        console.error('Error fetching address by CEP:', error);
        return throwError(() => new Error('CEP não encontrado ou inválido.'));
      })
    );
  }

  /**
   * Get events created by a specific user
   * @param userId User ID
   * @param page Page number (0-indexed)
   * @param size Page size
   */
  getEventsByUser(userId: number, page: number = 0, size: number = 10): Observable<EventsResponse> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'eventDate,desc');

    return this.http
      .get<SpringPageResponse<BackendEvent>>(`${this.apiUrl}/user/${userId}`, { params })
      .pipe(
        map((response) => this.transformBackendResponse(response)),
        tap(() => this.loadingSubject.next(false)),
        catchError((error) => {
          this.loadingSubject.next(false);
          this.errorSubject.next('Erro ao carregar eventos criados.');
          return throwError(() => error);
        })
      );
  }

  /**
   * Get events that the user is subscribed to
   * @param userId User ID
   * @param page Page number (0-indexed)
   * @param size Page size
   */
  getRegisteredEvents(
    userId: number,
    page: number = 0,
    size: number = 10
  ): Observable<EventsResponse> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'eventDate');

    return this.http
      .get<SpringPageResponse<BackendEvent>>(`${this.apiUrl}/subscribed/user/${userId}`, { params })
      .pipe(
        map((response) => this.transformBackendResponse(response)),
        tap(() => this.loadingSubject.next(false)),
        catchError((error) => {
          this.loadingSubject.next(false);
          this.errorSubject.next('Erro ao carregar eventos inscritos.');
          return throwError(() => error);
        })
      );
  }

  /**
   * Check if a user is subscribed to a specific event
   * @param eventId Event ID
   * @param userId User ID
   * @returns Observable<boolean> - true if user is subscribed, false otherwise
   */
  isUserSubscribedToEvent(eventId: number, userId: number): Observable<boolean> {
    return this.getRegisteredEvents(userId, 0, 1000).pipe(
      map((response) => {
        // Procura pelo evento na lista de inscrições
        const isSubscribed = response.events.some((event) => event.id === eventId);
        console.log(
          `✅ [EventsService] User ${userId} is${
            isSubscribed ? '' : ' not'
          } subscribed to event ${eventId}`
        );
        return isSubscribed;
      }),
      catchError((error) => {
        console.error('❌ [EventsService] Error checking subscription:', error);
        return of(false); // Se houver erro, assume que não está inscrito
      })
    );
  }

  resetLoading(): void {
    this.loadingSubject.next(false);
  }

  private transformBackendResponse(response: SpringPageResponse<BackendEvent>): EventsResponse {
    const events = response.content.map((event) => this.transformBackendEvent(event));
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

  private transformBackendEvent(event: BackendEvent): ApiEvent {
    const { isoDate, formattedTime } = this.parseBrazilianDate(event.eventDate);

    const locationName = event.location.placeName;
    const locationAddress = event.location.fullAddress;
    const imageUrl = this.validateImageUrl(event.imageUrl);

    return {
      id: event.id,
      title: event.name,
      name: event.name,
      description: event.description,
      category: event.eventType,
      eventType: event.eventType,
      date: isoDate,
      eventDate: event.eventDate,
      time: formattedTime,
      location: locationName,
      address: locationAddress,
      price: 0,
      maxParticipants: event.maxSubs,
      currentParticipants: event.subscribedCount,
      organizerName: 'Organizador',
      organizerEmail: '',
      organizerPhone: '',
      imageUrl,
      tags: [],
      requiresApproval: false,
      isPublic: true,
      allowWaitlist: false,
      status: 'published',
      createdAt: event.eventDate,
      updatedAt: event.eventDate,
    };
  }

  private parseBrazilianDate(dateStr: string): { isoDate: string; formattedTime: string } {
    const [datePart, timePart] = dateStr.split(' ');
    const [day, month, year] = datePart.split('/').map(Number);
    const [hours, minutes] = (timePart || '00:00').split(':').map(Number);

    const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    return { isoDate, formattedTime };
  }

  private validateImageUrl(url?: string): string {
    if (!url?.trim()) return 'assets/events/evento-exemplo.svg';
    const exampleDomains = ['example.com', 'placeholder.com', 'picsum.photos', 'loremflickr.com'];
    try {
      const { hostname } = new URL(url);
      return exampleDomains.some((d) => hostname.includes(d))
        ? 'assets/events/evento-exemplo.svg'
        : url;
    } catch {
      return 'assets/events/evento-exemplo.svg';
    }
  }

  private mapToBackendEvent(data: Partial<ApiEvent>): Partial<BackendEvent> {
    const date = data.date || '';
    const time = data.time || '00:00';

    const locationPayload: BackendLocationPayload = {
      placeName: data.location || '',
      fullAddress: data.address || '',
      zipCode: '',
      latitude: '0',
      longitude: '0',
      category: 'OTHER',
    };

    return {
      name: data.title || data.name || '',
      description: data.description || '',
      imageUrl: data.imageUrl || '',
      eventDate: `${date.replace(/-/g, '/')} ${time}:00`,
      eventType: data.eventType || data.category || '',
      maxSubs: data.maxParticipants ?? 0,
      subscribedCount: data.currentParticipants ?? 0,
      location: locationPayload as any,
    };
  }

  private getErrorMessage(error: any): string {
    if (error.status === 0) return 'Sem conexão com a internet.';
    if (error.status === 404) return 'Serviço indisponível.';
    if (error.status === 500) return 'Erro no servidor.';
    return 'Ocorreu um erro. Tente novamente.';
  }

  /**
   * Maps frontend ApiEvent data to EventRequestDTO format for API
   * Converts date and time to LocalDateTime format (ISO 8601)
   */
  private mapToEventRequestDTO(data: Partial<ApiEvent>, createdBy: number): EventRequestDTO {
    const date = data.date || '';
    const time = data.time || '00:00';

    // Convert to LocalDateTime format: "yyyy-MM-ddTHH:mm:ss"
    const eventDateTime = `${date}T${time}:00`;

    const locationDTO: EventLocationDTO = {
      placeName: data.location || '',
      fullAddress: data.address || '',
      zipCode: data.zipCode || '',
      latitude: '0',
      longitude: '0',
      category: data.category || 'OTHER',
    };

    return {
      name: data.title || data.name || '',
      description: data.description || '',
      imageUrl: data.imageUrl || 'assets/events/evento-exemplo.svg',
      eventDate: eventDateTime,
      eventType: data.eventType || data.category || '',
      maxSubs: data.maxParticipants ?? 0,
      createdBy: createdBy,
      location: locationDTO,
    };
  }

  /**
   * Transforms EventResponseDTO from API to ApiEvent format for frontend
   */
  private transformEventResponseToApiEvent(response: EventResponseDTO): ApiEvent {
    // Parse LocalDateTime format back to date and time
    const [datePart, timePart] = response.eventDate.split('T');
    const time = timePart ? timePart.substring(0, 5) : '00:00'; // Extract HH:mm

    return {
      id: response.id,
      title: response.name,
      name: response.name,
      description: response.description,
      category: response.eventType,
      eventType: response.eventType,
      date: datePart,
      eventDate: response.eventDate,
      time: time,
      location: response.location.placeName,
      address: response.location.fullAddress,
      price: 0,
      maxParticipants: response.maxSubs,
      currentParticipants: response.subscribedCount || 0,
      organizerName: 'Organizador',
      organizerEmail: '',
      organizerPhone: '',
      imageUrl: this.validateImageUrl(response.imageUrl),
      tags: [],
      requiresApproval: false,
      isPublic: true,
      allowWaitlist: false,
      status: 'published',
      createdAt: response.eventDate,
      updatedAt: response.eventDate,
    };
  }

  /**
   * Get specific error message for event creation failures
   */
  private getCreateEventErrorMessage(error: any): string {
    if (error.status === 0) {
      return 'Sem conexão com a internet. Verifique sua conexão e tente novamente.';
    }
    if (error.status === 400) {
      // Validation error
      const errorMsg = error.error?.message || error.error?.error;
      return errorMsg || 'Dados inválidos. Verifique os campos e tente novamente.';
    }
    if (error.status === 401 || error.status === 403) {
      return 'Você não tem permissão para criar eventos. Faça login novamente.';
    }
    if (error.status === 500) {
      return 'Erro no servidor ao criar evento. Tente novamente mais tarde.';
    }
    return 'Erro ao criar evento. Verifique os dados e tente novamente.';
  }
}
