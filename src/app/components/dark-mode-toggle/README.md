# Dark Mode Toggle Component

Componente reutilizável para alternar entre modo claro e escuro.

## Características

- **Standalone Component**: Pode ser importado diretamente em qualquer componente Angular
- **Persistência**: Salva a preferência do usuário no localStorage
- **SSR Compatible**: Verifica se está no browser antes de acessar localStorage/DOM
- **Ícones Animados**: Transições suaves entre os ícones de sol e lua
- **Auto-aplicação**: Aplica o tema automaticamente ao carregar a página

## Uso

### 1. Importar o componente

```typescript
import { DarkModeToggleComponent } from '../../components/dark-mode-toggle/dark-mode-toggle';

@Component({
  // ...
  imports: [CommonModule, DarkModeToggleComponent],
  // ...
})
```

### 2. Adicionar ao template

```html
<dark-mode-toggle></dark-mode-toggle>
```

### 3. Adicionar estilos de dark mode no CSS da página

```css
.dark-mode .seu-elemento {
  background: #1a1a2e;
  color: #e2e8f0;
}
```

## Estrutura

- **dark-mode-toggle.ts**: Lógica do componente
- **dark-mode-toggle.html**: Template com ícones SVG
- **dark-mode-toggle.css**: Estilos do botão

## Como funciona

1. Ao inicializar (`ngOnInit`), verifica a preferência salva no localStorage
2. Aplica a classe `dark-mode` ao `document.body`
3. Ao clicar no botão, alterna o estado e salva no localStorage
4. A classe `dark-mode` permite que outros elementos apliquem estilos condicionais

## Páginas que usam este componente

- ✅ Login Page (`src/app/pages/page-login`)
- ✅ Events Page (`src/app/pages/events-page`)
