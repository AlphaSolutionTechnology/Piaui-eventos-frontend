import { Component, Input, Output, EventEmitter, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventRegistrationService, EventRegistrationData } from '../../services/event-registration.service';
import { AuthService, User } from '../../services/auth';

@Component({
  selector: 'app-event-registration-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './event-registration-modal.html',
  styleUrls: ['./event-registration-modal.css']
})
export class EventRegistrationModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() eventId: number = 0;
  @Input() eventName: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() registerSuccess = new EventEmitter<void>();

  currentUser: User | null = null;
  isLoading = false;
  showSuccess = false;
  showError = false;
  errorMessage = '';

  // Dados adicionais de inscrição
  dietaryRestrictions = '';
  comments = '';
  receiveUpdates = true;
  agreeTerms = false;

  constructor(
    private registrationService: EventRegistrationService,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
  }

  closeModal() {
    this.resetForm();
    this.close.emit();
  }

  resetForm() {
    this.dietaryRestrictions = '';
    this.comments = '';
    this.receiveUpdates = true;
    this.agreeTerms = false;
    this.showError = false;
    this.showSuccess = false;
    this.errorMessage = '';
  }

  validateForm(): boolean {
    if (!this.agreeTerms) {
      this.showErrorMessage('Você deve aceitar os termos de participação');
      return false;
    }
    return true;
  }

  showErrorMessage(message: string) {
    this.errorMessage = message;
    this.showError = true;
    setTimeout(() => {
      this.showError = false;
    }, 5000);
  }

  onConfirmRegistration() {
    if (!this.validateForm()) {
      return;
    }

    if (!this.currentUser) {
      this.showErrorMessage('Erro: Usuário não encontrado');
      return;
    }

    this.isLoading = true;

    // Preparar dados de inscrição
    const registrationData = this.registrationService.prepareRegistrationData(
      this.eventId,
      this.eventName,
      this.dietaryRestrictions,
      this.comments,
      this.receiveUpdates
    );

    if (!registrationData) {
      this.showErrorMessage('Erro ao preparar dados de inscrição');
      this.isLoading = false;
      return;
    }

    // Enviar inscrição para o backend
    this.registrationService.registerUserToEvent(registrationData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.showSuccess = true;

        // Fechar modal e notificar sucesso após 2 segundos
        setTimeout(() => {
          this.registerSuccess.emit();
          this.closeModal();
        }, 2000);
      },
      error: (error) => {
        this.isLoading = false;
        this.showErrorMessage(
          error.error?.message ||
          'Erro ao confirmar inscrição. Tente novamente.'
        );
      }
    });
  }

  // Função auxiliar para formatar telefone na exibição
  formatPhoneNumber(phone: string): string {
    if (!phone) return '';
    // Remove tudo que não é número
    const cleaned = phone.replace(/\D/g, '');
    // Formata como (XX) XXXXX-XXXX
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
}
