import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../enviroment';

export interface EventLocation {
  id: number;
  placeName: string;
  latitude: string;
  longitude: string;
  fullAddress: string;
  zipCode: string;
  category: string;
}

// Estrutura ATUALIZADA retornada pelo backend:
// {
//   "id": 6,
//   "name": "Tech Summit 2025",
//   "description": "Annual tech conference",
//   "imageUrl": "https://cdn.example.com/img/events/tech-summit.jpg",
//   "eventDate": "31/12/2025 20:00:00",
//   "eventType": "CONFERENCE",
//   "maxSubs": 500,
//   "location": {                        // ✅ Agora retorna objeto "location"
//     "id": 21,
//     "placeName": "Centro de Convenções",
//     "latitude": "-5.08921",
//     "longitude": "-42.8016",
//     "fullAddress": "Av. Principal, 1000 - Centro, Teresina - PI",
//     "zipCode": "64000-000",
//     "category": "INDOOR"
//   },
//   "version": 0,
//   "subscribedCount": 0
// }
export interface EventDetailResponse {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  eventDate: string; // Formato: "31/12/2025 20:00:00"
  eventType: string;
  maxSubs: number;
  location: EventLocation | null; // ✅ Backend usa "location", não "eventLocation"
  version: number;
  subscribedCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class EventDetailService {
  private apiUrl = `${environment.API_URL}/events`;

  constructor(private http: HttpClient) {}

  /**
   * Busca detalhes de um evento específico
   * O authInterceptor adiciona automaticamente withCredentials: true para enviar cookies HTTP-only
   */
  getEventDetails(eventID: number): Observable<EventDetailResponse> {
    return this.http.get<EventDetailResponse>(`${this.apiUrl}/${eventID}`);
  }
}
