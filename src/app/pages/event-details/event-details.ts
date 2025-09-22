import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';

@Component({
  standalone: true,
  selector: 'event-details',
  imports: [CommonModule, RouterLink],
  templateUrl: './event-details.html',
  styleUrl: './event-details.css'
})
export class EventDetailsPage implements OnInit {
  eventId: string | null = null;

  // Dados mockados do evento
  event = {
    id: 1,
    tag: '046',
    title: 'Festival de Música',
    time: '19:00',
    date: '15 de Outubro, 2025',
    location: 'Centro de Convenções - Teresina, PI',
    desc: 'Uma noite inesquecível com os melhores artistas nacionais e internacionais. Prepare-se para uma experiência musical única que ficará para sempre na sua memória.',
    longDescription: 'O Festival de Música 2025 trará para Teresina uma seleção especial dos melhores artistas do cenário nacional e internacional. Com três palcos simultâneos, food trucks, área VIP e muito mais. Este evento marca o calendário cultural da cidade e promete ser o maior festival musical do Piauí.',
    imageUrl: 'assets/events/evento-exemplo.svg',
    bg: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    organizer: 'EventHub Produções',
    price: 'R$ 120,00',
    capacity: 2000,
    registered: 1456,
    category: 'Música & Shows',
    features: [
      'Três palcos simultâneos',
      'Food trucks variados',
      'Área VIP exclusiva',
      'Estacionamento gratuito',
      'Segurança 24h'
    ],
    artists: [
      'Banda Nacional A',
      'Artista Internacional B',
      'DJ Local C',
      'Grupo Regional D'
    ]
  };

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.eventId = this.route.snapshot.paramMap.get('id');
    // Aqui você carregaria os dados reais do evento baseado no ID
  }

  shareEvent() {
    if (navigator.share) {
      navigator.share({
        title: this.event.title,
        text: this.event.desc,
        url: window.location.href
      });
    } else {
      // Fallback para copiar URL
      navigator.clipboard.writeText(window.location.href);
      // Mostrar feedback visual
    }
  }

  toggleFavorite() {
    // Implementar lógica de favoritos
  }
}
