export interface ApiEvent {
  id: number;
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  location: string;
  address: string;
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
}