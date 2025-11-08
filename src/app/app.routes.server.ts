import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Usar Server-Side Rendering para todas as rotas
  // Evita problemas com 'document is not defined' durante prerender
  {
    path: '**',
    renderMode: RenderMode.Server
  }
];
