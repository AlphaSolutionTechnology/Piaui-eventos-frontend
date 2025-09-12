import { Routes } from '@angular/router';
import { EventsPage } from './pages/events-page';
import { LoginPage } from './login-page/login-page';

export const routes: Routes = [
	{ path: 'events', component: EventsPage },
	{ path: '', redirectTo: '/events', pathMatch: 'full' },
  { path: 'login', component: LoginPage }
];
