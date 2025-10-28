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

export interface EventDetailResponse {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  eventDate: string;
  eventType: string;
  maxSubs: number;
  eventLocation: EventLocation | null;
  version: number;
  subscribersCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class EventDetailService {
  private apiUrl = `${environment.API_URL}/events`;

  constructor(private http: HttpClient) {}

  getEventDetails(eventID: number): Observable<EventDetailResponse> {
    return this.http.get<EventDetailResponse>(`${this.apiUrl}/${eventID}`);
  }
}
