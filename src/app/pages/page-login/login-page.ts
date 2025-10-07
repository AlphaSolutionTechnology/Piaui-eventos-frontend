import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

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
    rememberMe: false
  };

  constructor(private router: Router) {}

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

    // Simulate API call
    setTimeout(() => {
      this.isLoading = false;
      // For demo purposes, accept any valid email/password combination
      if (this.loginForm.email && this.loginForm.password.length >= 6) {
        // Store login state (in a real app, use proper authentication)
        localStorage.setItem('user', JSON.stringify({
          email: this.loginForm.email,
          name: this.loginForm.email.split('@')[0]
        }));

        this.router.navigate(['/events']);
      } else {
        this.showErrorMessage('Credenciais inválidas');
      }
    }, 1500);
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }

  forgotPassword() {
    // In a real app, this would trigger a password reset flow
    alert('Funcionalidade de recuperação de senha será implementada em breve!');
  }
}
