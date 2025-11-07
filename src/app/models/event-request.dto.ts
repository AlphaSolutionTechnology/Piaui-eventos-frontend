/**
 * DTOs matching the backend API contract for event creation
 * Based on com.alphasolutions.piauieventos.dto.EventRequestDTO
 */

export interface EventLocationDTO {
  id?: number;
  placeName: string;
  latitude?: string;
  longitude?: string;
  fullAddress: string;
  zipCode?: string;
  category?: string;
}

export interface EventRequestDTO {
  name: string;
  description: string;
  imageUrl: string;
  eventDate: string; // LocalDateTime format: "yyyy-MM-ddTHH:mm:ss"
  eventType: string;
  maxSubs: number;
  createdBy: number; // User ID who creates the event
  location: EventLocationDTO;
}

export interface EventResponseDTO {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  eventDate: string;
  eventType: string;
  maxSubs: number;
  subscribedCount?: number;
  location: EventLocationDTO;
  version?: number;
}

/**
 * DTO for updating an existing event (partial update)
 * Based on com.alphasolutions.piauieventos.dto.EventUpdateDTO
 */
export interface EventUpdateDTO {
  name?: string;
  description?: string;
  imageUrl?: string;
  eventDate?: string; // LocalDateTime format: "yyyy-MM-ddTHH:mm:ss"
  eventType?: string;
  maxSubs?: number;
  location?: EventLocationDTO;
}

