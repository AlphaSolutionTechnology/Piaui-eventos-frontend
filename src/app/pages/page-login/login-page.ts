import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { AuthService, AuthResponse } from '../../services/auth';

interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login-page.html',
  styleUrls: ['./login-page.css'],
})
export class LoginPage {
  isLoading = false;
  showError = false;
  errorMessage = '';
  showPassword = false;

  loginForm: LoginForm = {
    email: '',
    password: '',
    rememberMe: false,
  };

  constructor(private authService: AuthService, private router: Router) {}

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
    this.showError = false; // Reseta o erro antes de tentar novamente

    this.authService
      .login(this.loginForm.email, this.loginForm.password)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        // Callback para SUCESSO na chamada
        next: (response: AuthResponse) => {
          // O token já foi salvo no AuthService.login()
          // Os dados do usuário serão buscados automaticamente via /api/user/me
          console.log('Login bem-sucedido, redirecionando...');
          
          // Navega para a página de eventos após o login
          this.router.navigate(['/events']);
        },
        error: (err) => {
          const message = err.error?.message || 'Credenciais inválidas ou erro no servidor.';
          this.showErrorMessage(message);
        },
      });
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }

  forgotPassword() {
    alert('Funcionalidade de recuperação de senha será implementada em breve!');
  }
}
