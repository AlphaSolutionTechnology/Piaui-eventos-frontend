import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  selector: 'events-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './events-page.html',
  styleUrl: './events-page.css'
})
export class EventsPage {
  cards = [
    { tag: '703', title: 'Event Title', time: '12,52', desc: 'Eie Poattis Hore Can We Chvem Tfrats ...', bg: 'linear-gradient(180deg,#f59e0b,#ff7ab6)' },
    { tag: ' ', title: 'Event Title', time: '13:50', desc: 'Newven Sebeyeo Sabren Totett ...', bg: 'linear-gradient(180deg,#06b6d4,#06b6a4)' },
    { tag: ' ', title: 'Event Title', time: '21.50', desc: 'Plina Nfas. Thbes Frao Pri ...', bg: 'linear-gradient(180deg,#06b6a4,#f59e0b)' },
    { tag: '046', title: 'Eveg Fergusons', time: '', desc: 'Wa Astrav gamtt Annt Wa ...', bg: 'linear-gradient(180deg,#ff5a98,#f59e0b)' }
  ];
}
