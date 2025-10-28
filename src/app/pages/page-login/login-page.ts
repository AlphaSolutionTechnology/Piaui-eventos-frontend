import { Component, Inject, PLATFORM_ID, HostBinding, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService, AuthResponse } from '../../services/auth';
import { DarkModeToggleComponent } from '../../components/dark-mode-toggle/dark-mode-toggle';

interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, DarkModeToggleComponent],
  templateUrl: './login-page.html',
  styleUrls: ['./login-page.css'],
  host: {
    '[class.dark-mode]': 'isDarkMode',
  },
})
export class LoginPage implements OnInit, OnDestroy {
  @HostBinding('class.dark-mode') isDarkMode = false;
  isLoading = false;
  showError = false;
  errorMessage = '';
  showPassword = false;
  private isBrowser: boolean;
  private observer: MutationObserver | null = null;

  loginForm: LoginForm = {
    email: '',
    password: '',
    rememberMe: false,
  };

  constructor(
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      // Verificar o tema inicial
      const savedTheme = localStorage.getItem('theme');
      this.isDarkMode = savedTheme === 'dark';
      console.log('🎨 [LOGIN PAGE] Tema inicial:', savedTheme, 'isDarkMode:', this.isDarkMode);

      // Carregar email salvo se "Lembrar de mim" estiver ativo
      this.loadRememberedEmail();

      // Observar mudanças na classe dark-mode do body
      this.observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class') {
            const newValue = document.body.classList.contains('dark-mode');
            console.log('🎨 [LOGIN PAGE] Body mudou! dark-mode presente:', newValue);
            this.isDarkMode = newValue;
            console.log('🎨 [LOGIN PAGE] isDarkMode atualizado para:', this.isDarkMode);
          }
        });
      });

      this.observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  validateForm(): boolean {
    if (!this.loginForm.email.trim()) {
      this.showErrorMessage('E-mail é obrigatório');
      return false;
    }
    if (!this.isValidEmail(this.loginForm.email)) {
      this.showErrorMessage('E-mail inválido');
      return false;
    }
    if (!this.loginForm.password.trim()) {
      this.showErrorMessage('Senha é obrigatória');
      return false;
    }
    if (this.loginForm.password.length < 6) {
      this.showErrorMessage('Senha deve ter pelo menos 6 caracteres');
      return false;
    }
    return true;
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  showErrorMessage(message: string) {
    this.errorMessage = message;
    this.showError = true;
    setTimeout(() => {
      this.showError = false;
    }, 5000);
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;
    this.showError = false;

    this.authService
      .login(this.loginForm.email, this.loginForm.password)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (response: AuthResponse) => {
          // Salvar email se "Lembrar de mim" estiver marcado
          this.saveRememberMePreference();

          // Dados do usuário já foram carregados pelo AuthService
          this.router.navigate(['/events']);
        },
        error: (err) => {
          const message = err.error?.message || 'Credenciais inválidas ou erro no servidor.';
          this.showErrorMessage(message);
        },
      });
  }

  /**
   * Carrega o email salvo se "Lembrar de mim" estiver ativo
   */
  private loadRememberedEmail(): void {
    if (!this.isBrowser) {
      return;
    }

    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      this.loginForm.email = rememberedEmail;
      this.loginForm.rememberMe = true;
      console.log('📧 Email lembrado carregado:', rememberedEmail);
    }
  }

  /**
   * Salva ou remove o email baseado na preferência "Lembrar de mim"
   */
  private saveRememberMePreference(): void {
    if (!this.isBrowser) {
      return;
    }

    if (this.loginForm.rememberMe) {
      // Salvar email para próximo login
      localStorage.setItem('rememberedEmail', this.loginForm.email);
      console.log('✅ Email salvo para lembrar:', this.loginForm.email);
    } else {
      // Remover email salvo
      localStorage.removeItem('rememberedEmail');
      console.log('🗑️ Email removido (não lembrar)');
    }
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }

  forgotPassword() {
    alert('Funcionalidade de recuperação de senha será implementada em breve!');
  }
}
