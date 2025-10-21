# 🔐 Sistema de Autenticação - Documentação

## Visão Geral

O sistema de autenticação foi implementado de forma segura utilizando o endpoint `/api/user/me` do backend Spring Boot. Os dados do usuário são buscados dinamicamente após o login e mantidos sincronizados com o backend.

---

## 📋 Fluxo de Autenticação

### 1. Login do Usuário

```typescript
// LoginPage chama AuthService.login()
this.authService.login(email, password).subscribe({
  next: (response) => {
    // Token JWT salvo automaticamente no localStorage
    // Dados do usuário buscados automaticamente via /api/user/me
    this.router.navigate(['/events']);
  }
});
```

**O que acontece:**
1. ✅ Requisição POST para `/api/auth/login`
2. ✅ Token JWT salvo no `localStorage` com chave `authToken`
3. ✅ Chamada automática para `/api/user/me` para buscar dados completos
4. ✅ Dados do usuário salvos no BehaviorSubject e localStorage
5. ✅ Redirecionamento para página de eventos

---

### 2. Busca de Dados do Usuário

```typescript
// AuthService.fetchCurrentUser()
GET /api/user/me
Headers: { credentials: 'include' }
```

**Resposta esperada:**
```json
{
  "id": 15,
  "name": "João Silva Santos",
  "email": "joao.silva@email.com",
  "phoneNumber": "86999887766",
  "role": {
    "id": 1,
    "name": "USER"
  }
}
```

**Mapeamento para Frontend:**
```typescript
{
  id: 15,
  name: "João Silva Santos",
  email: "joao.silva@email.com",
  phoneNumber: "86999887766",
  role: "Participante",      // Traduzido de "USER"
  roleId: 1,
  avatar: ""                 // Pode ser implementado futuramente
}
```

---

### 3. Tradução de Roles

O sistema traduz automaticamente as roles do backend para português:

| Backend | Frontend |
|---------|----------|
| USER | Participante |
| ADMIN | Administrador |
| MODERATOR | Moderador |
| ORGANIZER | Organizador |

```typescript
// AuthService.translateRole()
private translateRole(roleName: string): string {
  const roleMap = {
    'USER': 'Participante',
    'ADMIN': 'Administrador',
    'MODERATOR': 'Moderador',
    'ORGANIZER': 'Organizador'
  };
  return roleMap[roleName] || 'Participante';
}
```

---

## 🎯 Uso nos Componentes

### EventsPage

```typescript
export class EventsPage {
  user: User;

  ngOnInit() {
    // Carregar dados do usuário
    this.loadUserData();
  }

  loadUserData() {
    // 1. Carrega cache imediatamente (UX rápida)
    const cachedUser = this.authService.getCurrentUser();
    if (cachedUser) {
      this.user = cachedUser;
    }

    // 2. Subscreve para receber atualizações
    this.authService.currentUser$.subscribe(user => {
      if (user) this.user = user;
    });

    // 3. Busca dados atualizados do backend se necessário
    if (!cachedUser && this.authService.isAuthenticated()) {
      this.authService.fetchCurrentUser().subscribe();
    }
  }
}
```

### Template

```html
<!-- Avatar com iniciais ou foto -->
<div class="avatar-container">
  @if (user.avatar) {
    <img [src]="user.avatar" [alt]="user.name" />
  } @else {
    <div class="avatar-initials">
      {{ getUserInitials() }}
    </div>
  }
</div>

<!-- Nome e role do usuário -->
<div class="user-info">
  <span class="user-name">{{ user.name }}</span>
  <span class="user-role">{{ user.role }}</span>
</div>

<!-- Botão de logout -->
<a (click)="logout()">Sair</a>
```

---

## 🛡️ Proteção de Rotas

### Guard de Autenticação

Protege rotas que requerem login:

```typescript
// app.routes.ts
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'events',
    component: EventsPage,
    canActivate: [authGuard]  // ✅ Requer autenticação
  }
];
```

### Guard de Role

Protege rotas baseado em permissão:

```typescript
import { roleGuard } from './guards/auth.guard';

{
  path: 'admin',
  component: AdminPanel,
  canActivate: [roleGuard('ADMIN')]  // ✅ Apenas Administradores
}
```

---

## 🔄 Sincronização de Estado

O sistema usa **BehaviorSubject** para manter o estado do usuário sincronizado:

```typescript
// AuthService
private currentUserSubject = new BehaviorSubject<User | null>(null);
public currentUser$ = this.currentUserSubject.asObservable();

// Qualquer componente pode subscrever
this.authService.currentUser$.subscribe(user => {
  console.log('Usuário atualizado:', user);
});
```

**Vantagens:**
- ✅ Estado reativo e sempre atualizado
- ✅ Múltiplos componentes podem observar o mesmo usuário
- ✅ Sincronização automática ao buscar do backend
- ✅ Cache em localStorage para persistência

---

## 📝 Métodos Disponíveis no AuthService

### Autenticação

```typescript
// Login
login(email: string, password: string): Observable<AuthResponse>

// Logout
logout(): void

// Verificar autenticação
isAuthenticated(): boolean

// Buscar dados do usuário do backend
fetchCurrentUser(): Observable<User | null>
```

### Dados do Usuário

```typescript
// Obter usuário atual (síncrono - do cache)
getCurrentUser(): User | null

// Observable do usuário (reativo)
currentUser$: Observable<User | null>

// Gerar iniciais do nome
getUserInitials(name: string): string
```

### Permissões

```typescript
// Verificar role específica
hasRole(roleName: string): boolean

// Verificar se é admin
isAdmin(): boolean
```

---

## 🔒 Segurança

### Armazenamento

- **Token JWT:** `localStorage.setItem('authToken', token)`
- **Dados do Usuário:** `localStorage.setItem('user', JSON.stringify(user))`

⚠️ **Importante:** Em produção, considere usar:
- **httpOnly cookies** para tokens (mais seguro)
- **SessionStorage** para dados temporários
- **Criptografia** para dados sensíveis

### Tratamento de Erros

```typescript
// 401 Unauthorized
if (error.status === 401) {
  // Limpar dados e redirecionar para login
  this.authService.logout();
  this.router.navigate(['/login']);
}

// Token expirado
if (response.error === 'Token expirado') {
  alert('Sua sessão expirou. Faça login novamente.');
  this.authService.logout();
}
```

### Headers HTTP

Todas as requisições incluem:

```typescript
{
  withCredentials: true  // Envia cookies automaticamente
}
```

---

## 🎨 Iniciais do Avatar

O sistema gera iniciais automaticamente:

```typescript
getUserInitials("João Silva") // → "JS"
getUserInitials("Maria") // → "M"
getUserInitials("José da Silva Santos") // → "JS"
```

**Regras:**
- Nome único: primeira letra
- Múltiplos nomes: primeira + última letra
- Sempre em maiúsculas

---

## ✅ Checklist de Implementação

- [x] AuthService com método `fetchCurrentUser()`
- [x] Interface `UserMeResponse` mapeando resposta do backend
- [x] Interface `User` para uso no frontend
- [x] BehaviorSubject para estado reativo
- [x] Cache em localStorage
- [x] Tradução de roles para português
- [x] Método `getUserInitials()` para avatar
- [x] Método `hasRole()` para verificação de permissões
- [x] Método `isAdmin()` para verificação de admin
- [x] Guard `authGuard` para proteção de rotas
- [x] Guard `roleGuard` para proteção por role
- [x] Integração com EventsPage
- [x] Template com avatar dinâmico
- [x] Botão de logout funcional
- [x] Tratamento de erro 401
- [x] Logs para debug

---

## 🚀 Próximos Passos

1. **Implementar avatar com upload de foto**
   - Endpoint: `POST /api/user/avatar`
   - Integrar com User.avatar

2. **Refresh token automático**
   - Interceptor HTTP para renovar token expirado

3. **Perfil do usuário editável**
   - Página de perfil com formulário
   - Endpoint: `PUT /api/user/me`

4. **SSR (Server-Side Rendering)**
   - Verificar compatibilidade com Angular Universal
   - Usar `isPlatformBrowser()` onde necessário

---

## 📚 Referências

- [Documentação Spring Security](https://spring.io/projects/spring-security)
- [Angular Authentication Guide](https://angular.io/guide/security)
- [JWT Best Practices](https://jwt.io/introduction)
