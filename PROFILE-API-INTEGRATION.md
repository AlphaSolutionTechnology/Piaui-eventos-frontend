# Integração da Página de Perfil com API

## Visão Geral

A página de perfil agora está totalmente integrada com o backend através do `UserService`. As informações são carregadas dinamicamente da API e as alterações feitas pelo usuário são persistidas no banco de dados.

## Endpoints Utilizados

### 1. **GET /api/user/profile**
Retorna o perfil completo do usuário autenticado.

**Resposta esperada:**
```json
{
  "id": 1,
  "name": "João Silva",
  "email": "joao@email.com",
  "phoneNumber": "(86) 99999-9999",
  "role": "Participante",
  "roleId": 1,
  "avatar": "https://example.com/avatar.jpg",
  "createdAt": "2024-01-01T00:00:00Z",
  "eventsAttended": 5,
  "eventsOrganized": 2
}
```

### 2. **PUT /api/user/profile**
Atualiza as informações do perfil do usuário.

**Body da requisição:**
```json
{
  "name": "João Silva Updated",
  "email": "joao.updated@email.com",
  "phoneNumber": "(86) 98888-8888",
  "currentPassword": "senha_atual",  // Opcional, necessário para alterar senha
  "newPassword": "nova_senha"        // Opcional
}
```

**Resposta esperada:**
```json
{
  "id": 1,
  "name": "João Silva Updated",
  "email": "joao.updated@email.com",
  "phoneNumber": "(86) 98888-8888",
  "role": "Participante",
  "roleId": 1,
  "avatar": "https://example.com/avatar.jpg"
}
```

### 3. **GET /api/user/stats**
Retorna as estatísticas do usuário.

**Resposta esperada:**
```json
{
  "eventsAttended": 5,
  "eventsOrganized": 2,
  "totalEvents": 7
}
```

### 4. **POST /api/user/avatar** (Futuro)
Upload de foto de perfil (avatar).

**Body:** FormData com campo `avatar` (arquivo de imagem)

**Resposta esperada:**
```json
{
  "avatarUrl": "https://example.com/avatars/user-123.jpg"
}
```

### 5. **POST /api/user/delete** (Futuro)
Deleta a conta do usuário.

**Body da requisição:**
```json
{
  "password": "senha_do_usuario"
}
```

## Fluxo de Funcionamento

### Carregamento Inicial
1. Componente verifica autenticação
2. Se autenticado, faz requisições paralelas usando `forkJoin`:
   - `getUserProfile()` - dados do perfil
   - `getUserStats()` - estatísticas
3. Atualiza a interface com os dados recebidos
4. Se não autenticado, redireciona para `/login`

### Edição de Perfil
1. Usuário clica em "Editar"
2. Formulário é preenchido com dados atuais
3. Usuário modifica campos desejados
4. Ao clicar em "Salvar Alterações":
   - Validações client-side são executadas
   - Dados são enviados para `PUT /api/user/profile`
   - Em caso de sucesso:
     - Interface é atualizada
     - LocalStorage é sincronizado
     - AuthService é atualizado
     - Mensagem de sucesso é exibida
   - Em caso de erro:
     - Mensagem de erro específica é exibida

### Alteração de Senha (Opcional)
Se o usuário preencher os campos de senha:
1. Valida senha atual
2. Valida nova senha (mínimo 6 caracteres)
3. Valida confirmação de senha
4. Envia junto com os outros dados do perfil

## Tratamento de Erros

### Erros HTTP Tratados
- **400** - Dados inválidos → "Dados inválidos. Verifique os campos."
- **401** - Senha incorreta → "Senha atual incorreta"
- **403** - Não autorizado → Redireciona para login
- **409** - Email já existe → "Email já está em uso por outro usuário"
- **Outros** - Erro genérico → "Erro ao atualizar perfil. Tente novamente."

### Estados de Loading
- `isLoading` - Carregamento inicial da página
- `isSaving` - Salvando alterações (desabilita botões e mostra spinner)

## Sincronização de Dados

Após atualização bem-sucedida:
1. `UserService` atualiza localStorage automaticamente
2. `AuthService.fetchCurrentUser()` é chamado para sincronizar
3. AppHeader e outros componentes são atualizados via Observable

## Validações Client-Side

### Campos Obrigatórios
- Nome não pode estar vazio
- Email não pode estar vazio
- Email deve ter formato válido

### Validações de Senha
- Se alterar senha, senha atual é obrigatória
- Nova senha deve ter mínimo 6 caracteres
- Nova senha e confirmação devem coincidir

## Estrutura de Arquivos

```
src/app/
├── services/
│   ├── auth.ts                    # Serviço de autenticação
│   └── user.service.ts            # Novo: Serviço de gerenciamento de usuário
└── pages/
    └── profile/
        ├── profile.ts              # Lógica do componente (atualizado)
        ├── profile.html            # Template (atualizado)
        └── profile.css             # Estilos (atualizado)
```

## Funcionalidades Implementadas

✅ Carregamento dinâmico de dados do perfil
✅ Edição de nome, email e telefone
✅ Alteração de senha (opcional)
✅ Validações de formulário
✅ Mensagens de erro específicas
✅ Mensagens de sucesso com auto-dismiss
✅ Loading states (spinner)
✅ Sincronização com localStorage e AuthService
✅ Estatísticas dinâmicas
✅ Suporte a dark mode
✅ Tratamento de erros HTTP
✅ Redirecionamento automático se não autenticado

## Funcionalidades Futuras

🔲 Upload de avatar (foto de perfil)
🔲 Exclusão de conta
🔲 Histórico de eventos participados
🔲 Edição de preferências/notificações
🔲 Integração com eventos favoritos
🔲 Visualização de certificados

## Testando a Integração

### Requisitos do Backend
O backend deve implementar os seguintes endpoints:
- `GET /api/user/profile` - Retornar perfil completo
- `PUT /api/user/profile` - Atualizar perfil
- `GET /api/user/stats` - Retornar estatísticas

### Exemplo de Teste
1. Faça login na aplicação
2. Acesse "Meu Perfil" no dropdown do usuário
3. Os dados devem ser carregados da API
4. Clique em "Editar"
5. Modifique algum campo
6. Clique em "Salvar Alterações"
7. Verifique se os dados foram atualizados no backend
8. Recarregue a página e confirme persistência

## Notas de Implementação

- O componente usa `forkJoin` para carregar perfil e estatísticas em paralelo
- `ChangeDetectorRef` é usado para forçar atualização da interface
- `takeUntil` pattern é usado para evitar memory leaks
- Todas as requisições HTTP respeitam o padrão de autenticação com cookies
- LocalStorage é usado como cache, mas API é a fonte da verdade
