import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RegisterService } from '../../services/register-service';

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  birthDate: string;
  agreeTerms: boolean;
  receiveUpdates: boolean;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrls: ['./register.css'],
})
export class RegisterComponent {
  isLoading = false;
  showSuccess = false;
  showError = false;
  errorMessage = '';
  showPassword = false;
  showConfirmPassword = false;
  currentStep = 1;
  totalSteps = 2;

  registerForm: RegisterForm = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    birthDate: '',
    agreeTerms: false,
    receiveUpdates: true,
  };

  constructor(private registerService: RegisterService, private router: Router) {}

  nextStep() {
    if (this.validateCurrentStep()) {
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
      }
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1:
        return this.validatePersonalInfo();
      case 2:
        return this.validateAccountInfo();
      default:
        return false;
    }
  }

  validatePersonalInfo(): boolean {
    if (!this.registerForm.firstName.trim()) {
      this.showErrorMessage('Nome é obrigatório');
      return false;
    }

    if (!this.registerForm.lastName.trim()) {
      this.showErrorMessage('Sobrenome é obrigatório');
      return false;
    }

    if (!this.registerForm.email.trim()) {
      this.showErrorMessage('E-mail é obrigatório');
      return false;
    }

    if (!this.isValidEmail(this.registerForm.email)) {
      this.showErrorMessage('E-mail inválido');
      return false;
    }

    if (!this.registerForm.phone.trim()) {
      this.showErrorMessage('Telefone é obrigatório');
      return false;
    }

    return true;
  }

  validateAccountInfo(): boolean {
    if (!this.registerForm.password.trim()) {
      this.showErrorMessage('Senha é obrigatória');
      return false;
    }

    if (this.registerForm.password.length < 8) {
      this.showErrorMessage('Senha deve ter pelo menos 8 caracteres');
      return false;
    }

    if (!this.hasUpperCase(this.registerForm.password)) {
      this.showErrorMessage('Senha deve conter pelo menos uma letra maiúscula');
      return false;
    }

    if (!this.hasLowerCase(this.registerForm.password)) {
      this.showErrorMessage('Senha deve conter pelo menos uma letra minúscula');
      return false;
    }

    if (!this.hasNumber(this.registerForm.password)) {
      this.showErrorMessage('Senha deve conter pelo menos um número');
      return false;
    }

    if (this.registerForm.password !== this.registerForm.confirmPassword) {
      this.showErrorMessage('Senhas não coincidem');
      return false;
    }

    if (!this.registerForm.agreeTerms) {
      this.showErrorMessage('Você deve aceitar os termos e condições');
      return false;
    }

    return true;
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  hasUpperCase(str: string): boolean {
    return /[A-Z]/.test(str);
  }

  hasLowerCase(str: string): boolean {
    return /[a-z]/.test(str);
  }

  hasNumber(str: string): boolean {
    return /\d/.test(str);
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

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  getPasswordStrength(): string {
    const password = this.registerForm.password;
    if (password.length === 0) return '';

    let strength = 0;
    if (password.length >= 8) strength++;
    if (this.hasUpperCase(password)) strength++;
    if (this.hasLowerCase(password)) strength++;
    if (this.hasNumber(password)) strength++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;

    if (strength <= 2) return 'weak';
    if (strength <= 3) return 'medium';
    return 'strong';
  }

  getPasswordStrengthLabel(): string {
    const strength = this.getPasswordStrength();
    switch (strength) {
      case 'weak':
        return 'Fraca';
      case 'medium':
        return 'Média';
      case 'strong':
        return 'Forte';
      default:
        return '';
    }
  }

  onSubmit() {
    if (!this.validateCurrentStep()) {
      return;
    }

    this.isLoading = true;

    this.registerService
      .register(
        this.registerForm.firstName + ' ' + this.registerForm.lastName,
        this.registerForm.email,
        this.registerForm.password,
        this.registerForm.phone
      )
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.showSuccess = true;

          setTimeout(() => {
            this.isLoading = false;
            this.router.navigate(['/login']);
          }, 3000);
        },
        error: (error) => {
          this.isLoading = false;
          this.showErrorMessage('Erro ao criar conta');
        },
      });
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  goBack() {
    if (this.currentStep === 1) {
      this.router.navigate(['/login']);
    } else {
      this.prevStep();
    }
  }

  getStepTitle(): string {
    switch (this.currentStep) {
      case 1:
        return 'Informações Pessoais';
      case 2:
        return 'Criar Conta';
      default:
        return '';
    }
  }

  calculateAge(): number {
    if (!this.registerForm.birthDate) return 0;

    const today = new Date();
    const birthDate = new Date(this.registerForm.birthDate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }
}
