import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  selector: 'events-page',
  imports: [CommonModule, RouterLink],
  template: `
    <div class="events-root">
      <header class="topbar">
        <div class="brand">Events</div>
        <nav class="nav">
          <a routerLink="/events" class="active">Events</a>
          <a href="#">Categories</a>
          <a href="#">Venues</a>
        </nav>
        <div class="search"><input placeholder="Search" /></div>
      </header>

      <main class="grid-wrap">
        <section class="grid">
          <article *ngFor="let c of cards" class="card" [style.background]="c.bg">
            <div class="card-top">
              <div class="card-tag">{{ c.tag }}</div>
              <h3 class="card-title">{{ c.title }}</h3>
              <div class="card-time">{{ c.time }}</div>
              <p class="card-desc">{{ c.desc }}</p>
            </div>
            <div class="card-cta">
              <a class="btn">View Details</a>
            </div>
          </article>
        </section>
      </main>
    </div>
  `,
  styles: [`
    :host { display:block; font-family: Inter, system-ui, Arial; }
    .topbar { display:flex; align-items:center; gap:1rem; padding:1rem 2rem; background:linear-gradient(90deg,#6b2bd8,#ff6b6b); color:white; }
    .brand { background:#0ea5a4; padding:0.4rem 0.75rem; border-radius:8px; font-weight:700 }
    .nav { display:flex; gap:1rem; margin-left:1rem }
    .nav a { color:rgba(255,255,255,0.9); text-decoration:none }
    .nav a.active { font-weight:700 }
    .search { margin-left:auto }
    .search input { padding:0.5rem 0.75rem; border-radius:999px; border:0 }

    .grid-wrap { padding:2rem; background: linear-gradient(180deg,#f3e8ff, #fef3c7); min-height: calc(100vh - 72px); }
    .grid { display:grid; grid-template-columns: repeat(auto-fill,minmax(260px,1fr)); gap:1.25rem; max-width:1200px; margin:0 auto }
    .card { color:white; padding:1.25rem; border-radius:12px; display:flex; flex-direction:column; justify-content:space-between; min-height:220px }
    .card-top { }
    .card-tag { opacity:0.9; font-size:0.8rem }
    .card-title { margin:0.5rem 0; font-size:1.5rem }
    .card-time { font-weight:700; margin-bottom:0.5rem }
    .card-desc { opacity:0.95 }
    .card-cta { margin-top:1rem }
    .btn { background:rgba(0,0,0,0.12); color:white; padding:0.5rem 0.75rem; border-radius:8px; text-decoration:none }

    @media (max-width:600px){ .topbar{padding:0.75rem 1rem} .grid-wrap{padding:1rem} }
  `]
})
export class EventsPage {
  cards = [
    { tag: '703', title: 'Event Title', time: '12,52', desc: 'Eie Poattis Hore Can We Chvem Tfrats ...', bg: 'linear-gradient(180deg,#f59e0b,#ff7ab6)' },
    { tag: ' ', title: 'Event Title', time: '13:50', desc: 'Newven Sebeyeo Sabren Totett ...', bg: 'linear-gradient(180deg,#06b6d4,#06b6a4)' },
    { tag: ' ', title: 'Event Title', time: '21.50', desc: 'Plina Nfas. Thbes Frao Pri ...', bg: 'linear-gradient(180deg,#06b6a4,#f59e0b)' },
    { tag: '046', title: 'Eveg Fergusons', time: '', desc: 'Wa Astrav gamtt Annt Wa ...', bg: 'linear-gradient(180deg,#ff5a98,#f59e0b)' }
  ];
}
