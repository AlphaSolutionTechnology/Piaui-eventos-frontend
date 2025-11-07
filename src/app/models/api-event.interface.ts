export interface ApiEvent {
  id: number;
  title: string;
  name: string; // Alias for title
  description: string;
  category: string;
  eventType: string; // Alias for category
  date: string;
  eventDate: string; // Alias for date
  time: string;
  location: string;
  address: string;
  zipCode?: string; // CEP
  price: number;
  maxParticipants: number;
  currentParticipants: number;
  organizerName: string;
  organizerEmail: string;
  organizerPhone: string;
  imageUrl?: string;
  tags: string[];
  requiresApproval: boolean;
  isPublic: boolean;
  allowWaitlist: boolean;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface EventsFilter {
  search?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  priceMin?: number;
  priceMax?: number;
  location?: string;
  tags?: string[];
  status?: string;
}

export interface EventsPagination {
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface EventsResponse {
  events: ApiEvent[];
  pagination: EventsPagination;
  total: number; // Direct access to total events count
}
