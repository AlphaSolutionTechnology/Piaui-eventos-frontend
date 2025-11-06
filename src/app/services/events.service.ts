import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, tap, throwError } from 'rxjs';
import { ApiEvent, EventsFilter, EventsResponse } from '../models/api-event.interface';
import { environment } from '../../../enviroment';

interface SpringPageResponse<T> {
  content: T[];
  pageable: { pageNumber: number; pageSize: number; sort: any; offset: number; paged: boolean; unpaged: boolean };
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
  providedIn: 'root'
})
export class EventsService {
  private readonly apiUrl = `${environment.API_URL}/events`;

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
      map(response => this.transformBackendResponse(response)),
      tap(response => {
        this.loadingSubject.next(false);
        if (!append) this.eventsSubject.next(response.events);
      }),
      catchError(error => {
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
      map(event => this.transformBackendEvent(event)),
      tap(() => this.loadingSubject.next(false)),
      catchError(error => {
        this.loadingSubject.next(false);
        this.errorSubject.next('Evento não encontrado.');
        return throwError(() => error);
      })
    );
  }

  createEvent(eventData: Partial<ApiEvent>): Observable<ApiEvent> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    const payload = this.mapToBackendEvent(eventData);

    return this.http.post<BackendEvent>(this.apiUrl, payload).pipe(
      map(event => this.transformBackendEvent(event)),
      tap(newEvent => {
        this.loadingSubject.next(false);
        this.eventsSubject.next([newEvent, ...this.eventsSubject.value]);
      }),
      catchError(error => {
        this.loadingSubject.next(false);
        this.errorSubject.next('Erro ao criar evento.');
        return throwError(() => error);
      })
    );
  }

  updateEvent(id: number, eventData: Partial<ApiEvent>): Observable<ApiEvent> {
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    const payload = this.mapToBackendEvent(eventData);

    return this.http.put<BackendEvent>(`${this.apiUrl}/${id}`, payload).pipe(
      map(event => this.transformBackendEvent(event)),
      tap(() => this.loadingSubject.next(false)),
      catchError(error => {
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
        this.eventsSubject.next(this.eventsSubject.value.filter(e => e.id !== id));
      }),
      catchError(error => {
        this.loadingSubject.next(false);
        this.errorSubject.next('Erro ao deletar evento.');
        return throwError(() => error);
      })
    );
  }

  getCategories(): Observable<string[]> {
    return new Observable(observer => {
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
        'CONFERENCE'
      ]);
      observer.complete();
    });
  }

  getEventTypes(): Observable<string[]> {
    return this.getCategories();
  }

  resetLoading(): void {
    this.loadingSubject.next(false);
  }

  private transformBackendResponse(response: SpringPageResponse<BackendEvent>): EventsResponse {
    const events = response.content.map(event => this.transformBackendEvent(event));
    return {
      events,
      pagination: {
        page: response.number,
        size: response.size,
        total: response.totalElements,
        totalPages: response.totalPages
      },
      total: response.totalElements
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
      updatedAt: event.eventDate
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
      return exampleDomains.some(d => hostname.includes(d))
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
      category: 'OTHER'
    };

    return {
      name: data.title || data.name || '',
      description: data.description || '',
      imageUrl: data.imageUrl || '',
      eventDate: `${date.replace(/-/g, '/')} ${time}:00`,
      eventType: data.eventType || data.category || '',
      maxSubs: data.maxParticipants ?? 0,
      subscribedCount: data.currentParticipants ?? 0,
      location: locationPayload as any
    };
  }

  private getErrorMessage(error: any): string {
    if (error.status === 0) return 'Sem conexão com a internet.';
    if (error.status === 404) return 'Serviço indisponível.';
    if (error.status === 500) return 'Erro no servidor.';
    return 'Ocorreu um erro. Tente novamente.';
  }
}