import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  EventDetailService,
  EventDetailResponse,
  EventLocation,
} from '../../services/EventDetail/event-detail-service';

@Component({
  standalone: true,
  selector: 'event-details',
  imports: [CommonModule],
  templateUrl: './event-details.html',
  styleUrl: './event-details.css',
})
export class EventDetailsPage implements OnInit {
  event: EventDetailResponse | null = null;
  eventlocation: EventLocation | null = null;

  constructor(private eventdetailservice: EventDetailService, private route: ActivatedRoute) {}

  ngOnInit() {
    this.eventdetailservice
      .getEventDetails(Number(this.route.snapshot.paramMap.get('id')))
      .subscribe({
        next: (data: EventDetailResponse) => {
          this.event = data;
          this.eventlocation = data.eventLocation;
        },
        error: (error) => {
          console.error('Erro ao carregar evento:', error);
        },
      });
  }

  shareEvent() {
    if (navigator.share) {
      navigator.share({
        title: this.event?.name,
        text: this.event?.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  }

  toggleFavorite() {
    // Implementar lógica de favoritos
  }
}
