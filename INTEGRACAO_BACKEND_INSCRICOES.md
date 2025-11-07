# Guia de Integração: Sistema de Inscrição em Eventos

## 📋 Resumo das Alterações

A página `event-registration` foi removida e substituída por um **modal de confirmação de inscrição** mais eficiente que:

✅ Reutiliza dados do cadastro do usuário (nome, email, telefone)
✅ Permite adicionar informações complementares (restrições alimentares, comentários)
✅ Oferece uma experiência mais fluida sem necessidade de navegação
✅ Está totalmente preparada para integração com seu backend

---

## 🔧 Arquivos Criados/Modificados

### Novos Arquivos:

1. **`src/app/services/event-registration.service.ts`**
   - Serviço completo para gerenciar inscrições em eventos
   - Funções pré-prontas com comentários de integração

2. **`src/app/components/event-registration-modal/event-registration-modal.ts`**
   - Component do modal de confirmação

3. **`src/app/components/event-registration-modal/event-registration-modal.html`**
   - Template do modal

4. **`src/app/components/event-registration-modal/event-registration-modal.css`**
   - Estilos responsivos com suporte a dark mode

### Arquivos Modificados:

1. **`src/app/pages/event-details/event-details.ts`**
   - Adicionado import do modal
   - Novo método `handleRegistrationModal()`
   - Novo método `handleRegistrationSuccess()`

2. **`src/app/pages/event-details/event-details.html`**
   - Adicionado component do modal no template

3. **`src/app/app.routes.ts`**
   - Removida rota `event/:id/register`
   - Removido import de `EventRegistrationComponent`

### Arquivos Deletados:

- ❌ `src/app/pages/event-registration/` (pasta completa)

---

## 🎯 Como Integrar com Seu Backend

### Passo 1: Identificar Seu Endpoint de Inscrição

Primeiro, confirme com seu backend qual é o endpoint e a estrutura esperada:

```typescript
// Exemplos possíveis:
POST /api/registrations
POST /api/events/{eventId}/subscribe
POST /api/participants/{userId}/events/{eventId}
PUT  /api/events/{eventId}/participants
```

### Passo 2: Ajustar a URL do Endpoint

Abra `src/app/services/event-registration.service.ts` e procure por:

```typescript
private registrationUrl = `${environment.API_URL}/registrations`;
```

**Modifique conforme seu endpoint real:**

```typescript
// Exemplo 1: URL simples
private registrationUrl = `${environment.API_URL}/events/subscribe`;

// Exemplo 2: Será construída dinamicamente
// (veja método registerUserToEvent)
```

### Passo 3: Ajustar a Estrutura do Payload

Localize o método `mapToBackendPayload()` no arquivo `event-registration.service.ts`.

**Opção A - Payload Flat (estrutura atual):**
```typescript
private mapToBackendPayload(data: EventRegistrationData): any {
  return {
    userId: data.userId,
    userEmail: data.userEmail,
    eventId: data.eventId,
    dietaryRestrictions: data.dietaryRestrictions,
    comments: data.comments,
    receiveUpdates: data.receiveUpdates
  };
}
```

**Opção B - Payload com Agrupamento:**
```typescript
private mapToBackendPayload(data: EventRegistrationData): any {
  return {
    participant: {
      id: data.userId,
      name: data.userName,
      email: data.userEmail
    },
    event: { id: data.eventId },
    preferences: {
      dietary: data.dietaryRestrictions,
      notifications: data.receiveUpdates
    }
  };
}
```

**Opção C - Payload com Nomes Customizados:**
```typescript
private mapToBackendPayload(data: EventRegistrationData): any {
  return {
    user_id: data.userId,
    user_name: data.userName,
    event_id: data.eventId,
    dietary_restrictions: data.dietaryRestrictions,
    subscription_notes: data.comments,
    receive_newsletter: data.receiveUpdates
  };
}
```

### Passo 4: Ajustar o Método de Requisição

Localize o método `registerUserToEvent()` e configure:

**Opção A - POST Simples (atual):**
```typescript
return this.http.post<EventRegistrationResponse>(
  this.registrationUrl,
  this.mapToBackendPayload(registrationData)
).pipe(...)
```

**Opção B - POST com URL Dinâmica:**
```typescript
return this.http.post<EventRegistrationResponse>(
  `${environment.API_URL}/events/${registrationData.eventId}/subscribe`,
  { userId: registrationData.userId }
).pipe(...)
```

**Opção C - PUT com ID de Inscrição:**
```typescript
return this.http.put<EventRegistrationResponse>(
  `${this.registrationUrl}/${registrationData.eventId}`,
  this.mapToBackendPayload(registrationData)
).pipe(...)
```

### Passo 5: Ajustar a Interface de Resposta

Se sua API retorna uma estrutura diferente, modifique a interface `EventRegistrationResponse`:

```typescript
// Estrutura esperada atualmente
export interface EventRegistrationResponse {
  id?: number;
  message?: string;
  success?: boolean;
  registrationId?: number;
  timestamp?: string;
}

// Exemplo de customização
export interface EventRegistrationResponse {
  status: string; // 'success' ou 'error'
  data: {
    subscriptionId: number;
    eventId: number;
    userId: number;
    createdAt: string;
  };
  error?: string;
}
```

---

## 🔌 Exemplo Prático de Integração

Suponha que seu backend espera:

```
POST /api/inscricoes
Content-Type: application/json

{
  "participante": {
    "id": 1,
    "nome": "João Silva",
    "email": "joao@email.com",
    "telefone": "(86) 99999-9999"
  },
  "evento": {
    "id": 5
  },
  "inscricaoInfo": {
    "restricoesAlimentares": "Vegetariano",
    "comentarios": "Gostaria de mais informações",
    "receberAtualizacoes": true
  }
}
```

### Implementação:

1. **Atualizar URL:**
```typescript
private registrationUrl = `${environment.API_URL}/inscricoes`;
```

2. **Atualizar o payload:**
```typescript
private mapToBackendPayload(data: EventRegistrationData): any {
  return {
    participante: {
      id: data.userId,
      nome: data.userName,
      email: data.userEmail,
      telefone: data.userPhoneNumber
    },
    evento: {
      id: data.eventId
    },
    inscricaoInfo: {
      restricoesAlimentares: data.dietaryRestrictions,
      comentarios: data.comments,
      receberAtualizacoes: data.receiveUpdates
    }
  };
}
```

3. **Resposta esperada:**
```typescript
export interface EventRegistrationResponse {
  id: number;
  mensagem: string;
  timestamp: string;
}
```

---

## ✨ Funcionalidades Pré-Prontas (TODO)

O serviço possui outras funções pré-prontas mas ainda não implementadas. Para utilizá-las, siga os comentários `TODO`:

### 1. Verificar Inscrição Existente

```typescript
// Localize em event-registration.service.ts
checkUserEventRegistration(userId: number, eventId: number): Observable<boolean>
```

Descomente e implemente:
```typescript
checkUserEventRegistration(userId: number, eventId: number): Observable<boolean> {
  return this.http.get<{exists: boolean}>(
    `${environment.API_URL}/inscricoes/verificar/${userId}/${eventId}`
  ).pipe(
    map(response => response.exists),
    catchError(() => of(false))
  );
}
```

### 2. Cancelar Inscrição

```typescript
// Localize em event-registration.service.ts
cancelEventRegistration(registrationId: number): Observable<any>
```

Descomente e implemente:
```typescript
cancelEventRegistration(registrationId: number): Observable<any> {
  return this.http.delete(
    `${this.registrationUrl}/${registrationId}`
  ).pipe(
    tap(() => console.log('Inscrição cancelada')),
    catchError(error => {
      console.error('Erro ao cancelar inscrição:', error);
      return throwError(() => error);
    })
  );
}
```

---

## 🎨 Personalizando o Modal

### Adicionar Campos Adicionais

Se quiser adicionar mais campos ao formulário de inscrição:

1. **Atualize `EventRegistrationData` em `event-registration.service.ts`:**
```typescript
export interface EventRegistrationData {
  // ... campos existentes
  localidade?: string;
  dataCheckIn?: string;
  necessidadesEspeciais?: string;
}
```

2. **Adicione o campo no template do modal:**
```html
<div class="form-group">
  <label for="specialNeeds">Necessidades Especiais</label>
  <input
    type="text"
    id="specialNeeds"
    [(ngModel)]="specialNeeds"
    name="specialNeeds"
    placeholder="Descreva suas necessidades...">
</div>
```

3. **Atualize o component TypeScript:**
```typescript
specialNeeds = '';

onConfirmRegistration() {
  const registrationData = this.registrationService.prepareRegistrationData(
    this.eventId,
    this.eventName,
    this.dietaryRestrictions,
    this.comments,
    this.receiveUpdates
  );
  // ... resto do código
}
```

---

## 🚀 Testando a Integração

### 1. Verificar Fluxo de Inscrição

1. Faça login na aplicação
2. Navegue para um evento
3. Clique no botão "Inscrever-se"
4. Verifique se o modal abre com dados pré-preenchidos
5. Preencha campos adicionais
6. Clique em "Confirmar Inscrição"
7. Verifique no DevTools (Network) se a requisição é enviada corretamente

### 2. Verificar Dados Enviados

Abra o console do navegador (F12) e vá para a aba Network:

- Procure por uma requisição POST para seu endpoint
- Verifique o payload no corpo da requisição
- Compare com o esperado pelo seu backend

### 3. Tratamento de Erros

O serviço já possui tratamento automático de erros:

- **400**: "Dados inválidos"
- **401**: "Sessão expirada"
- **403**: "Sem permissão"
- **404**: "Evento não encontrado"
- **409**: "Já inscrito neste evento"
- **500**: "Erro no servidor"

Para customizar, edite `getErrorMessage()` em `event-registration.service.ts`.

---

## 📝 Checklist de Implementação

- [ ] Confirmar endpoint correto com backend
- [ ] Atualizar `registrationUrl` no serviço
- [ ] Customizar `mapToBackendPayload()`
- [ ] Customizar `EventRegistrationResponse` se necessário
- [ ] Testar requisição no Postman/Insomnia
- [ ] Testar fluxo completo na aplicação
- [ ] Verificar mensagens de erro
- [ ] Testar em dark mode
- [ ] Testar responsividade em mobile
- [ ] Implementar endpoints adicionais (check, cancel) se necessário

---

## 🆘 Troubleshooting

### Modal não abre
- Verifique se `showRegistrationModal` está sendo setado para `true`
- Confirme que o user está autenticado

### Dados não são enviados
- Verifique console (F12) para erros de JavaScript
- Confira o payload no Network tab
- Valide se a URL do endpoint está correta

### Erros 400 (Bad Request)
- Verifique a estrutura do payload vs esperado
- Use `JSON.stringify()` no console para debug
- Confirme tipos de dados (string, number, boolean)

### Erros 401/403
- Verifique se o token está sendo enviado
- Confirme se os cookies estão sendo salvos
- Verificar auth interceptor

---

## 📞 Resumo de Contatos do Backend

Para completar a integração, você precisará de:

1. ✉️ **Endpoint de inscrição:** qual é a URL?
2. 📋 **Estrutura do payload:** qual é o formato esperado?
3. 📤 **Resposta esperada:** quais campos retorna?
4. 🔐 **Autenticação:** qual tipo de autorização? (JWT, Bearer, etc)
5. ⚠️ **Códigos de erro:** quais status HTTP pode retornar?

---

**Pronto para implementar! Qualquer dúvida, consulte os comentários `TODO` no arquivo `event-registration.service.ts`.**
