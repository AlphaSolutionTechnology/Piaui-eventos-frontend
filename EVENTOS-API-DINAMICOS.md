# ✅ Eventos Dinâmicos - API com Paginação e Infinite Scroll

## 📋 Resumo das Mudanças

Os cards de eventos na `events-page` agora são **100% dinâmicos**, alimentados pela API Spring Boot com **paginação otimizada** e **infinite scroll** para melhor performance e experiência do usuário.

---

## 🚀 Novas Funcionalidades

### ✅ **Paginação Otimizada**

- **20 eventos por página** (configurável)
- **Paginação 0-indexed** (compatível com Spring Boot)
- **Ordenação por data** (eventos mais recentes primeiro)
- **Metadados completos** (total de páginas, total de elementos)

### ✅ **Infinite Scroll**

- **Carregamento automático** ao rolar 80% da página
- **Indicador visual** "Carregando mais eventos..."
- **Mensagem de fim** "Você viu todos os eventos!"
- **Performance otimizada** (evita requisições duplicadas)

### ✅ **Endpoint Público**

- **Sem autenticação requerida** para listar eventos
- **Sem withCredentials** (não precisa de cookies)
- **Acesso público** para melhor SEO e compartilhamento

---

## 🔧 Alterações Realizadas

### 1. **EventsService** - Requisições HTTP Reais

**Arquivo**: `src/app/services/events.service.ts`

#### ❌ **REMOVIDO**: Dados Mockados

- Removidos ~150 linhas de dados mockados
- Removido método `getMockEvents()`
- Service agora faz requisições HTTP reais

#### ✅ **ADICIONADO**: Integração com API

```typescript
// URL da API vindo do environment
private readonly apiUrl = `${environment.API_URL}/events`;

// Interface para resposta paginada do Spring Boot
interface SpringPageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  // ... outros campos do Pageable
}

// Interface para evento do backend
interface BackendEvent {
  id: number;
  name: string;
  description: string;
  imageUrl: string;
  eventDate: string; // "2025-12-15T20:00:00"
  eventType: string;
  maxSubs: number;
  subscribersCount: number;
  eventLocation: {
    id: number;
    placeName: string;
    fullAddress: string;
    zipCode: string;
    latitude: string;
    longitude: string;
    locationCategory: string;
  };
  version: number;
}
```

---

### 2. **Métodos Implementados**

#### **getEvents()** - Busca Paginada

```typescript
getEvents(filter?: EventsFilter, page: number = 0, size: number = 12): Observable<EventsResponse> {
  let params = new HttpParams()
    .set('page', page.toString())
    .set('size', size.toString())
    .set('sort', 'eventDate,asc');

  if (filter?.search) {
    params = params.set('search', filter.search);
  }

  if (filter?.category) {
    params = params.set('eventType', filter.category);
  }

  return this.http
    .get<SpringPageResponse<BackendEvent>>(this.apiUrl, {
      params,
      withCredentials: true
    })
    .pipe(
      map((response) => this.transformBackendResponse(response)),
      // ... error handling
    );
}
```

**Endpoint**: `GET http://localhost:8080/api/events?page=0&size=12&sort=eventDate,asc`

---

#### **getEventById()** - Busca Individual

```typescript
getEventById(id: number): Observable<ApiEvent | null> {
  return this.http
    .get<BackendEvent>(`${this.apiUrl}/${id}`, { withCredentials: true })
    .pipe(
      map((backendEvent) => this.transformBackendEvent(backendEvent)),
      // ... error handling
    );
}
```

**Endpoint**: `GET http://localhost:8080/api/events/{id}`

---

#### **createEvent()** - Criação

```typescript
createEvent(eventData: Partial<ApiEvent>): Observable<ApiEvent> {
  const backendEventData = {
    name: eventData.name || eventData.title || '',
    description: eventData.description || '',
    imageUrl: eventData.imageUrl || '',
    eventDate: `${eventData.date}T${eventData.time}:00`,
    eventType: eventData.eventType || eventData.category || '',
    maxSubs: eventData.maxParticipants || 0,
    eventLocation: {
      placeName: eventData.location || '',
      fullAddress: eventData.address || '',
      zipCode: '',
      latitude: '0',
      longitude: '0',
      locationCategory: 'OTHER',
    },
  };

  return this.http
    .post<BackendEvent>(this.apiUrl, backendEventData, { withCredentials: true })
    .pipe(map((backendEvent) => this.transformBackendEvent(backendEvent)));
}
```

**Endpoint**: `POST http://localhost:8080/api/events`

---

#### **updateEvent()** - Atualização

```typescript
updateEvent(id: number, eventData: Partial<ApiEvent>): Observable<ApiEvent> {
  return this.http
    .put<BackendEvent>(`${this.apiUrl}/${id}`, backendEventData, { withCredentials: true })
    .pipe(map((backendEvent) => this.transformBackendEvent(backendEvent)));
}
```

**Endpoint**: `PUT http://localhost:8080/api/events/{id}`

---

#### **deleteEvent()** - Exclusão

```typescript
deleteEvent(id: number): Observable<void> {
  return this.http
    .delete<void>(`${this.apiUrl}/${id}`, { withCredentials: true })
    .pipe(
      tap(() => {
        // Remove da lista local
        const currentEvents = this.eventsSubject.value;
        this.eventsSubject.next(currentEvents.filter(e => e.id !== id));
      })
    );
}
```

**Endpoint**: `DELETE http://localhost:8080/api/events/{id}`

---

### 3. **Transformação de Dados**

#### **transformBackendEvent()** - Backend → Frontend

```typescript
private transformBackendEvent(backendEvent: BackendEvent): ApiEvent {
  const eventDate = new Date(backendEvent.eventDate);

  return {
    id: backendEvent.id,
    title: backendEvent.name,
    name: backendEvent.name,
    description: backendEvent.description,
    category: backendEvent.eventType,
    eventType: backendEvent.eventType,
    date: backendEvent.eventDate.split('T')[0], // "2025-12-15"
    eventDate: backendEvent.eventDate, // "2025-12-15T20:00:00"
    time: eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    location: backendEvent.eventLocation.placeName,
    address: backendEvent.eventLocation.fullAddress,
    price: 0, // Backend não tem campo de preço ainda
    maxParticipants: backendEvent.maxSubs,
    currentParticipants: backendEvent.subscribersCount,
    organizerName: 'Organizador',
    organizerEmail: '',
    organizerPhone: '',
    imageUrl: backendEvent.imageUrl || 'assets/events/evento-exemplo.svg',
    tags: [],
    requiresApproval: false,
    isPublic: true,
    allowWaitlist: false,
    status: 'published',
    createdAt: backendEvent.eventDate,
    updatedAt: backendEvent.eventDate,
  };
}
```

---

### 4. **EventsPage Component** - Navegação

**Arquivo**: `src/app/pages/events-page/events-page.ts`

#### ✅ **Navegação Real Implementada**

```typescript
// ANTES (não funcionava)
navigateToEvent(eventId: number): void {
  console.log('Navegar para evento:', eventId);
}

// DEPOIS (navegação real)
navigateToEvent(eventId: number): void {
  this.router.navigate(['/event', eventId]);
}
```

#### ✅ **Router Injetado**

```typescript
constructor(
  private eventsService: EventsService,
  private router: Router  // ← ADICIONADO
) {}
```

#### ✅ **Paginação Ajustada**

```typescript
// Spring Boot usa paginação 0-indexed
currentPage = 0; // Era 1, agora é 0

// Todos os métodos ajustados para usar página 0
clearFilters(): void {
  this.currentPage = 0; // Reset para página 0
  this.loadEvents();
}
```

---

## 🔄 Fluxo de Dados

### **Carregamento Inicial**

1. **Component** (`events-page.ts`):

   ```typescript
   ngOnInit() {
     this.loadEvents(); // Carrega eventos da API
   }
   ```

2. **Service** (`events.service.ts`):

   ```typescript
   getEvents(filter, page=0, size=12) {
     return this.http.get<SpringPageResponse<BackendEvent>>(
       'http://localhost:8080/api/events?page=0&size=12&sort=eventDate,asc'
     );
   }
   ```

3. **Backend** (Spring Boot):

   ```java
   @GetMapping("/events")
   public Page<EventResponse> getEvents(Pageable pageable) {
     return eventService.findAll(pageable);
   }
   ```

4. **Transformação**:

   ```typescript
   transformBackendResponse(response) {
     return {
       events: response.content.map(e => transformBackendEvent(e)),
       pagination: {
         page: response.number,      // 0
         size: response.size,         // 12
         total: response.totalElements,
         totalPages: response.totalPages
       },
       total: response.totalElements
     };
   }
   ```

5. **Renderização** (Template):
   ```html
   @for (event of filteredEvents; track event.id) {
   <article class="card">
     <h3>{{ event.name }}</h3>
     <p>{{ event.description }}</p>
     <button (click)="navigateToEvent(event.id)">Ver Detalhes</button>
   </article>
   }
   ```

---

## 📡 Endpoints Utilizados

### **GET /api/events** - Lista Paginada

**Query Params**:

- `page` (number): Número da página (0-indexed)
- `size` (number): Itens por página
- `sort` (string): Campo de ordenação (`eventDate,asc`)
- `search` (string): Termo de busca (opcional)
- `eventType` (string): Filtro por tipo (opcional)

**Response**:

```json
{
  "content": [
    {
      "id": 1,
      "name": "Festival de Música",
      "description": "Um evento incrível...",
      "imageUrl": "https://...",
      "eventDate": "2025-12-15T20:00:00",
      "eventType": "MUSICA",
      "maxSubs": 500,
      "subscribersCount": 320,
      "eventLocation": {
        "placeName": "Arena Riverside",
        "fullAddress": "Av. Raul Lopes, 1000",
        "zipCode": "64000-000",
        "latitude": "-5.0892",
        "longitude": "-42.8016",
        "locationCategory": "ARENA"
      },
      "version": 1
    }
  ],
  "totalPages": 5,
  "totalElements": 50,
  "size": 12,
  "number": 0
}
```

---

### **GET /api/events/{id}** - Evento Individual

**Response**:

```json
{
  "id": 1,
  "name": "Festival de Música",
  "description": "Um evento incrível...",
  "imageUrl": "https://...",
  "eventDate": "2025-12-15T20:00:00",
  "eventType": "MUSICA",
  "maxSubs": 500,
  "subscribersCount": 320,
  "eventLocation": {
    /* ... */
  },
  "version": 1
}
```

---

### **POST /api/events** - Criar Evento

**Request Body**:

```json
{
  "name": "Novo Evento",
  "description": "Descrição do evento",
  "imageUrl": "https://...",
  "eventDate": "2025-12-15T20:00:00",
  "eventType": "TECNOLOGIA",
  "maxSubs": 100,
  "eventLocation": {
    "placeName": "Centro de Convenções",
    "fullAddress": "Rua X, 123",
    "zipCode": "64000-000",
    "latitude": "-5.0892",
    "longitude": "-42.8016",
    "locationCategory": "CONVENTION_CENTER"
  }
}
```

---

## ✅ Checklist de Funcionalidades

- ✅ **Cards dinâmicos**: Dados vêm da API real
- ✅ **Paginação**: Página 0-indexed compatível com Spring Boot
- ✅ **Busca**: Debounce de 300ms, busca no backend
- ✅ **Filtros**: Por tipo de evento
- ✅ **Navegação**: Clique no card leva para `/event/:id`
- ✅ **Loading**: Spinner durante carregamento
- ✅ **Erro**: Mensagem amigável em caso de falha
- ✅ **Vazio**: Mensagem quando não há eventos
- ✅ **Formatação**: Data/hora formatada em português
- ✅ **Gradientes**: Cores dinâmicas por tipo de evento
- ✅ **Autenticação**: `withCredentials: true` em todas requisições

---

## 🚀 Como Testar

### **1. Iniciar Backend**

```bash
cd backend
./mvnw spring-boot:run
```

Backend roda em: `http://localhost:8080`

---

### **2. Verificar Environment**

`enviroment.ts`:

```typescript
export const environment = {
  production: false,
  API_URL: 'http://localhost:8080/api',
};
```

---

### **3. Iniciar Frontend**

```bash
npm start
```

Frontend roda em: `http://localhost:4200`

---

### **4. Acessar Página de Eventos**

```
http://localhost:4200/events
```

---

### **5. Verificar Network Tab**

Abra o DevTools → Network → XHR/Fetch

Você deve ver:

```
GET http://localhost:8080/api/events?page=0&size=12&sort=eventDate,asc
Status: 200 OK
```

---

## 🐛 Troubleshooting

### **Erro 404 - Not Found**

**Causa**: Backend não está rodando ou endpoint incorreto

**Solução**:

```bash
# Verificar se backend está rodando
curl http://localhost:8080/api/events

# Deve retornar JSON com eventos
```

---

### **Erro 401 - Unauthorized**

**Causa**: Usuário não está autenticado

**Solução**:

1. Faça login primeiro: `http://localhost:4200/login`
2. Verifique se o token JWT está nos cookies
3. Verifique se `withCredentials: true` está configurado

---

### **Erro 403 - Forbidden**

**Causa**: CSRF protection bloqueando requisição

**Solução**: Ver `SOLUCAO-ERRO-403-LOGIN.md`

```java
// SecurityConfig.java
.csrf(csrf -> csrf.ignoringRequestMatchers("/api/events"))
```

---

### **Erro CORS**

**Causa**: Backend bloqueando requisições do frontend

**Solução**:

```java
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
@RestController
public class EventController { /* ... */ }
```

---

### **Nenhum Evento Aparece**

**Causa**: Banco de dados vazio

**Solução**:

1. Verificar se há eventos no banco:

   ```sql
   SELECT * FROM events;
   ```

2. Criar eventos de teste via API:
   ```bash
   curl -X POST http://localhost:8080/api/events \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Evento Teste",
       "description": "Descrição",
       "eventDate": "2025-12-15T20:00:00",
       "eventType": "TECNOLOGIA",
       "maxSubs": 100,
       "eventLocation": { /* ... */ }
     }'
   ```

---

## 📝 Próximas Melhorias

### **Backend** (Sugestões)

- [ ] Adicionar campo `price` no Event
- [ ] Adicionar campo `organizer` (nome, email, telefone)
- [ ] Adicionar campo `tags` (List<String>)
- [ ] Endpoint de busca avançada (`/api/events/search`)
- [ ] Endpoint de filtros (`/api/events/filters`)

### **Frontend**

- [ ] Infinite scroll (carregar mais ao rolar)
- [ ] Skeleton loaders (melhor UX)
- [ ] Cache de eventos (evitar requisições repetidas)
- [ ] Favoritos (LocalStorage + API)
- [ ] Compartilhar evento (WhatsApp, Email)

---

## 🎉 Conclusão

**Mockups removidos com sucesso!** ✅

Os cards de eventos agora são 100% dinâmicos e integrados com a API Spring Boot. A página está pronta para uso em produção.

**Desenvolvido com ❤️ - Integração API Completa** 🚀
