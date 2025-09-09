import { Routes } from '@angular/router';
import { EventsPage } from './pages/events-page';

export const routes: Routes = [
	{ path: 'events', component: EventsPage },
	{ path: '', redirectTo: '/events', pathMatch: 'full' },
];
