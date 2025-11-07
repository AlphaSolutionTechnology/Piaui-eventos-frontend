import { Routes } from '@angular/router';

// === IMPORTS DAS PÁGINAS ===
// Páginas de autenticação
import { LoginPage } from './pages/page-login/login-page';
import { RegisterComponent } from './pages/register/register';

// Páginas principais
import { EventsPage } from './pages/events-page/events-page';
import { EventDetailsPage } from './pages/event-details/event-details';
import { CreateEventComponent } from './pages/create-event/create-event';
import { MyEventsPage } from './pages/my-events/my-events';

// Guards
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  // === REDIRECIONAMENTO RAIZ ===
  {
    path: '',
    redirectTo: '/events',
    pathMatch: 'full',
  },

  // === ROTAS DE AUTENTICAÇÃO ===
  {
    path: 'login',
    component: LoginPage,
    title: 'Login - Piauí Eventos',
  },
  {
    path: 'register',
    component: RegisterComponent,
    title: 'Cadastro - Piauí Eventos',
  },

  // === ROTAS PRINCIPAIS ===
  {
    path: 'events',
    component: EventsPage,
    title: 'Eventos - Piauí Eventos',
  },
  {
    path: 'my-events',
    component: MyEventsPage,
    canActivate: [authGuard],
    title: 'Meus Eventos - Piauí Eventos',
  },
  {
    path: 'event/:id',
    component: EventDetailsPage,
    title: 'Detalhes do Evento - Piauí Eventos',
  },
  {
    path: 'create-event',
    component: CreateEventComponent,
    canActivate: [authGuard],
    title: 'Criar Evento - Piauí Eventos',
  },

  // === ROTA WILDCARD (SEMPRE POR ÚLTIMO) ===
  {
    path: '**',
    redirectTo: '/events',
  },
];
