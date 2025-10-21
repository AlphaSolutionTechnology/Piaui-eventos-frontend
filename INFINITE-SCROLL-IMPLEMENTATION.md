# 🚀 Infinite Scroll - Implementação Completa

## 📋 Resumo

Implementação de **paginação otimizada** e **infinite scroll** na página de eventos para melhor performance e experiência do usuário.

---

## ✅ Funcionalidades Implementadas

### 1. **Paginação Otimizada**

- ✅ 20 eventos por página (aumentado de 12)
- ✅ Paginação 0-indexed (compatível com Spring Boot)
- ✅ Ordenação por data descendente (mais recentes primeiro)
- ✅ Metadados completos (totalPages, totalElements, first, last)

### 2. **Infinite Scroll**

- ✅ Carregamento automático ao rolar 80% da página
- ✅ Indicador visual "Carregando mais eventos..."
- ✅ Mensagem de fim "Você viu todos os eventos!"
- ✅ Prevenção de requisições duplicadas
- ✅ Tratamento de erros com rollback de página

### 3. **Endpoint Público**

- ✅ Sem autenticação requerida
- ✅ Removido `withCredentials: true`
- ✅ Melhor SEO e compartilhamento

---

## 🔧 Mudanças Técnicas

### **EventsService** (`src/app/services/events.service.ts`)

#### Método `getEvents()` Atualizado

**Assinatura**:

```typescript
getEvents(
  filter?: EventsFilter,
  page: number = 0,
  size: number = 20,
  append: boolean = false  // ← NOVO parâmetro
): Observable<EventsResponse>
```

**Parâmetros**:

- `filter` - Filtros de busca (search, eventType)
- `page` - Número da página (0-indexed)
- `size` - Quantidade de eventos por página (padrão: 20)
- **`append`** - **NOVO**: Se `true`, adiciona eventos à lista existente; se `false`, substitui

**Implementação**:

```typescript
getEvents(filter?, page = 0, size = 20, append = false): Observable<EventsResponse> {
  this.loadingSubject.next(true);
  this.errorSubject.next(null);

  let params = new HttpParams()
    .set('page', page.toString())
    .set('size', size.toString())
    .set('sort', 'eventDate,desc'); // Mais recentes primeiro

  if (filter?.search) {
    params = params.set('search', filter.search);
  }

  if (filter?.category) {
    params = params.set('eventType', filter.category);
  }

  // Endpoint PÚBLICO - sem withCredentials
  return this.http.get<SpringPageResponse<BackendEvent>>(this.apiUrl, { params })
    .pipe(
      map(response => this.transformBackendResponse(response)),
      tap(response => {
        // Se append=true, ADICIONA aos eventos existentes (infinite scroll)
        // Se append=false, SUBSTITUI os eventos (nova busca/filtro)
        const currentEvents = append ? this.eventsSubject.value : [];
        this.eventsSubject.next([...currentEvents, ...response.events]);
        this.loadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Erro ao carregar eventos:', error);
        this.errorSubject.next('Erro ao carregar eventos. Tente novamente.');
        this.loadingSubject.next(false);
        return of({
          events: [],
          pagination: { page: 0, size, total: 0, totalPages: 0 },
          total: 0,
        });
      })
    );
}
```

**Mudanças Chave**:

1. ✅ Parâmetro `append` controla se adiciona ou substitui eventos
2. ✅ Ordenação `eventDate,desc` (era `asc`)
3. ✅ Size padrão aumentado para 20 (era 12)
4. ✅ Removido `withCredentials: true` (endpoint público)
5. ✅ BehaviorSubject atualizado com lógica append

---

### **EventsPage Component** (`src/app/pages/events-page/events-page.ts`)

#### Novas Propriedades

```typescript
// Paginação
currentPage = 0;
totalEvents = 0;
totalPages = 0; // ← NOVO: Total de páginas disponíveis
eventsPerPage = 20; // Aumentado de 12 para 20
hasMoreEvents = true; // ← NOVO: Indica se há mais páginas
isLoadingMore = false; // ← NOVO: Loading específico do infinite scroll
```

---

#### Método `loadEvents()` Atualizado

Usado para **carregar a primeira página** ou **resetar** a lista:

```typescript
loadEvents(): void {
  const filters = {
    search: this.filters.name,
    eventType: this.filters.eventType,
    page: this.currentPage,
    limit: this.eventsPerPage,
  };

  // append=false: SUBSTITUI a lista de eventos
  this.eventsService
    .getEvents(filters, this.currentPage, this.eventsPerPage, false)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.events = response.events;
        this.totalEvents = response.total;
        this.totalPages = response.pagination.totalPages;

        // Verifica se há mais páginas disponíveis
        this.hasMoreEvents = this.currentPage < response.pagination.totalPages - 1;

        this.applyFilters();
      },
      error: (error) => {
        this.error = 'Erro ao carregar eventos. Tente novamente.';
        console.error('Erro ao carregar eventos:', error);
      },
    });
}
```

---

#### Método `loadMoreEvents()` - NOVO

Usado para **infinite scroll** (adicionar eventos):

```typescript
/**
 * Carrega mais eventos (infinite scroll)
 */
loadMoreEvents(): void {
  // Proteções contra requisições duplicadas
  if (this.isLoadingMore || !this.hasMoreEvents || this.isLoading) {
    return;
  }

  this.isLoadingMore = true;
  this.currentPage++;

  const filters = {
    search: this.filters.name,
    eventType: this.filters.eventType,
    page: this.currentPage,
    limit: this.eventsPerPage,
  };

  // append=true: ADICIONA à lista existente
  this.eventsService
    .getEvents(filters, this.currentPage, this.eventsPerPage, true)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        // Adiciona novos eventos aos existentes
        this.events = [...this.events, ...response.events];
        this.totalEvents = response.total;
        this.totalPages = response.pagination.totalPages;
        this.hasMoreEvents = this.currentPage < response.pagination.totalPages - 1;
        this.isLoadingMore = false;
        this.applyFilters();
      },
      error: (error) => {
        console.error('Erro ao carregar mais eventos:', error);
        this.isLoadingMore = false;
        this.currentPage--; // Rollback da página em caso de erro
      },
    });
}
```

**Lógica de Proteção**:

- `isLoadingMore`: Evita múltiplas requisições simultâneas
- `!hasMoreEvents`: Não carrega se já atingiu a última página
- `isLoading`: Não carrega se ainda está carregando a primeira página

---

#### @HostListener('window:scroll') - NOVO

Detecta o scroll da página e dispara `loadMoreEvents()` automaticamente:

```typescript
/**
 * Detecta scroll para carregar mais eventos (infinite scroll)
 */
@HostListener('window:scroll')
onScroll(): void {
  // Proteções
  if (this.isLoadingMore || !this.hasMoreEvents || this.isLoading) {
    return;
  }

  // Calcula posições
  const scrollPosition = window.pageYOffset + window.innerHeight;
  const pageHeight = document.documentElement.scrollHeight;

  // Threshold: 80% da página
  const threshold = pageHeight * 0.8;

  // Se passou de 80%, carrega mais
  if (scrollPosition >= threshold) {
    this.loadMoreEvents();
  }
}
```

**Como Funciona**:

1. Usuário rola a página
2. Calcula: `posição atual + altura da janela`
3. Compara com: `80% da altura total`
4. Se passou de 80%, dispara `loadMoreEvents()`
5. Carrega próxima página (20 eventos)
6. Adiciona ao final da lista

**Configurável**:

- Mudar `0.8` para `0.9` = carrega ao atingir 90%
- Mudar `0.8` para `0.5` = carrega ao atingir 50%

---

### **Template HTML** (`src/app/pages/events-page/events-page.html`)

#### Indicador de Loading (Infinite Scroll)

Mostrado **abaixo** da lista de eventos enquanto carrega mais:

```html
<!-- Indicador de Loading para Infinite Scroll -->
@if (isLoadingMore) {
<div class="loading-more-container">
  <div class="loading-spinner"></div>
  <p>Carregando mais eventos...</p>
</div>
}
```

---

#### Mensagem de Fim da Lista

Mostrada quando **não há mais eventos** para carregar:

```html
<!-- Mensagem quando não há mais eventos -->
@if (!hasMoreEvents && filteredEvents.length > 0 && !isLoading) {
<div class="end-of-list">
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
    <path d="M8 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
  </svg>
  <p>Você viu todos os eventos disponíveis!</p>
</div>
}
```

**Condições**:

- `!hasMoreEvents` - Não há mais páginas
- `filteredEvents.length > 0` - Há eventos na tela
- `!isLoading` - Não está carregando

---

### **Estilos CSS** (`src/app/pages/events-page/events-page.css`)

#### Loading More Container

```css
.loading-more-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  text-align: center;
  color: #6b7280;
  background: linear-gradient(180deg, transparent 0%, rgba(103, 126, 234, 0.05) 100%);
  border-radius: 16px;
  margin: 2rem auto;
  max-width: 400px;
}

.loading-more-container .loading-spinner {
  width: 32px;
  height: 32px;
  border-width: 2px;
}

.loading-more-container p {
  margin-top: 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #667eea;
}
```

---

#### End of List

```css
.end-of-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  text-align: center;
  color: #6b7280;
  background: linear-gradient(135deg, rgba(103, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-radius: 16px;
  margin: 2rem auto;
  max-width: 400px;
  border: 1px solid rgba(103, 126, 234, 0.2);
}

.end-of-list svg {
  color: #667eea;
  margin-bottom: 1rem;
}

.end-of-list p {
  font-size: 0.9375rem;
  font-weight: 500;
  color: #667eea;
  margin: 0;
}
```

---

## 📡 Endpoint da API

### **GET /api/events** (Público)

**Descrição**: Retorna uma lista paginada de todos os eventos.

**Autenticação**: ❌ Não requerida (endpoint público)

**Query Params**:

```typescript
{
  page?: number;  // Número da página (0-indexed, default: 0)
  size?: number;  // Itens por página (default: 20)
  sort?: string;  // Ordenação (default: "eventDate,desc")
}
```

**Exemplo de Requisição**:

```typescript
// Angular HttpClient
this.http.get('http://localhost:8080/api/events', {
  params: {
    page: '0',
    size: '20',
    sort: 'eventDate,desc',
  },
});
```

**Resposta (200 OK)**:

```json
{
  "content": [
    {
      "id": 1,
      "name": "Festival de Música 2025",
      "description": "Maior festival do estado do Piauí",
      "imageUrl": "https://example.com/imagem.jpg",
      "eventDate": "2025-12-15T20:00:00",
      "eventType": "Musical",
      "maxSubs": 500,
      "subscribersCount": 245,
      "eventLocation": {
        "id": 1,
        "placeName": "Arena Riverside",
        "fullAddress": "Avenida Frei Serafim, 2000",
        "zipCode": "64000000",
        "latitude": "-5.0920",
        "longitude": "-42.8034",
        "locationCategory": "Arena"
      },
      "version": 0
    }
    // ... mais 19 eventos
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20
  },
  "totalPages": 5,
  "totalElements": 100,
  "last": false,
  "first": true,
  "numberOfElements": 20,
  "empty": false
}
```

**Metadados de Paginação**:

- `totalPages` - Total de páginas disponíveis
- `totalElements` - Total de eventos no sistema
- `first` - Se é a primeira página
- `last` - Se é a última página
- `numberOfElements` - Quantidade de eventos nesta página

---

## 🎯 Fluxo Completo

### **1. Carregamento Inicial**

```typescript
// Component ngOnInit()
this.loadEvents();

// Service getEvents(filters, page=0, size=20, append=false)
GET /api/events?page=0&size=20&sort=eventDate,desc

// Response
{ content: [20 eventos], totalPages: 5, totalElements: 95 }

// Component
this.events = [20 eventos]
this.currentPage = 0
this.totalPages = 5
this.hasMoreEvents = true (0 < 4)
```

---

### **2. Usuário Rola a Página**

```typescript
// @HostListener('window:scroll')
scrollPosition = 2400px
pageHeight = 3000px
threshold = 2400px (80% de 3000)

// scrollPosition >= threshold
this.loadMoreEvents();
```

---

### **3. Infinite Scroll**

```typescript
// loadMoreEvents()
this.isLoadingMore = true
this.currentPage++ // 0 → 1

// Service getEvents(filters, page=1, size=20, append=true)
GET /api/events?page=1&size=20&sort=eventDate,desc

// Response
{ content: [20 eventos], totalPages: 5, totalElements: 95 }

// Component
this.events = [...40 eventos anteriores, ...20 novos]
this.currentPage = 1
this.hasMoreEvents = true (1 < 4)
this.isLoadingMore = false
```

---

### **4. Última Página**

```typescript
// Usuário continua rolando...
// currentPage = 3 → 4

// Service getEvents(filters, page=4, size=20, append=true)
GET /api/events?page=4&size=20&sort=eventDate,desc

// Response
{ content: [15 eventos], totalPages: 5, totalElements: 95, last: true }

// Component
this.events = [...80 eventos, ...15 novos] // Total: 95
this.currentPage = 4
this.hasMoreEvents = false (4 < 4 é false)

// Mostra mensagem "Você viu todos os eventos!"
```

---

## ✅ Benefícios

### **Performance**

- ✅ Carrega apenas 20 eventos por vez (reduz payload)
- ✅ Lazy loading (não carrega tudo de uma vez)
- ✅ Menor uso de memória (100 eventos = 5 requisições)

### **UX (Experiência do Usuário)**

- ✅ Sem botão "Carregar Mais" (automático)
- ✅ Scroll infinito natural
- ✅ Feedback visual claro (spinners e mensagens)
- ✅ Sem quebras de experiência

### **SEO**

- ✅ Endpoint público (sem autenticação)
- ✅ Pode ser indexado por crawlers
- ✅ Melhor compartilhamento em redes sociais

---

## 🐛 Tratamento de Erros

### **Erro ao Carregar Mais**

```typescript
error: (error) => {
  console.error('Erro ao carregar mais eventos:', error);
  this.isLoadingMore = false;
  this.currentPage--; // ROLLBACK: Volta para página anterior
};
```

**Comportamento**:

1. Erro ocorre ao carregar página 2
2. `currentPage` volta de 2 para 1
3. Usuário pode tentar novamente
4. `isLoadingMore = false` permite nova tentativa

---

### **Proteções Contra Duplicação**

```typescript
if (this.isLoadingMore || !this.hasMoreEvents || this.isLoading) {
  return; // Bloqueia requisição
}
```

**Evita**:

- ✅ Múltiplas requisições simultâneas
- ✅ Carregar além da última página
- ✅ Conflito com carregamento inicial

---

## 🚀 Como Testar

### **1. Iniciar Backend**

```bash
cd backend
./mvnw spring-boot:run
```

### **2. Iniciar Frontend**

```bash
npm start
```

### **3. Acessar Página**

```
http://localhost:4200/events
```

### **4. Testar Infinite Scroll**

1. ✅ Verifique que carrega 20 eventos inicialmente
2. ✅ Role a página até 80%
3. ✅ Veja o spinner "Carregando mais eventos..."
4. ✅ Novos 20 eventos aparecem automaticamente
5. ✅ Repita até ver "Você viu todos os eventos!"

### **5. Verificar Network Tab**

Abra DevTools → Network → XHR:

```
GET /api/events?page=0&size=20&sort=eventDate,desc  → 200 OK (20 eventos)
GET /api/events?page=1&size=20&sort=eventDate,desc  → 200 OK (20 eventos)
GET /api/events?page=2&size=20&sort=eventDate,desc  → 200 OK (20 eventos)
...
```

---

## 📝 Configurações Personalizáveis

### **Alterar Quantidade por Página**

```typescript
// events-page.ts
eventsPerPage = 30; // Era 20
```

### **Alterar Threshold do Scroll**

```typescript
// events-page.ts → onScroll()
const threshold = pageHeight * 0.9; // 90% em vez de 80%
```

### **Alterar Ordenação**

```typescript
// events.service.ts → getEvents()
.set('sort', 'eventDate,asc'); // Mais antigos primeiro
.set('sort', 'name,asc');       // Alfabética A-Z
```

---

## 🎉 Conclusão

**Infinite scroll implementado com sucesso!** 🚀

✅ Paginação otimizada (20 por página)  
✅ Carregamento automático ao rolar  
✅ Indicadores visuais claros  
✅ Tratamento de erros robusto  
✅ Endpoint público (sem autenticação)  
✅ Performance melhorada

**Pronto para produção!** 🎊
