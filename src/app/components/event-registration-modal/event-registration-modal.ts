import { Component, Input, Output, EventEmitter, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventRegistrationService } from '../../services/event-registration.service';
import { AuthService, User } from '../../services/auth';

@Component({
  selector: 'app-event-registration-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './event-registration-modal.html',
  styleUrls: ['./event-registration-modal.css'],
})
export class EventRegistrationModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() eventId: number = 0;
  @Input() eventName: string = '';
  @Input() isUserSubscribed = false;
  
  @Output() close = new EventEmitter<void>();
  @Output() registerSuccess = new EventEmitter<void>();
  @Output() unregisterSuccess = new EventEmitter<void>();

  currentUser: User | null = null;
  isLoading = false;
  showSuccess = false;
  showError = false;
  errorMessage = '';
  
  // Unsubscribe confirmation
  showConfirmUnsubscribe = false;

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
    this.showConfirmUnsubscribe = false;
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

  /**
   * Handle subscription flow - call async service method
   * Uses fetch API with Bearer token authentication
   */
  async onConfirmRegistration() {
    console.log('🔵 [EVENT-REGISTRATION-MODAL] Starting registration process...');
    
    if (!this.validateForm()) {
      console.log('❌ [EVENT-REGISTRATION-MODAL] Form validation failed');
      return;
    }

    if (!this.currentUser) {
      this.showErrorMessage('Erro: Usuário não encontrado');
      console.log('❌ [EVENT-REGISTRATION-MODAL] Current user is null');
      return;
    }

    this.isLoading = true;

    try {
      console.log(`🟡 [EVENT-REGISTRATION-MODAL] Calling registerUserToEvent(eventId=${this.eventId}, userId=${this.currentUser.id})`);
      
      // Call the async service method
      await this.registrationService.registerUserToEvent(
        this.eventId,
        this.currentUser.id
      );

      this.isLoading = false;
      this.showSuccess = true;
      console.log('✅ [EVENT-REGISTRATION-MODAL] Registration successful');

      // Close modal and notify success after 2 seconds
      setTimeout(() => {
        this.registerSuccess.emit();
        this.closeModal();
      }, 2000);
    } catch (error: any) {
      this.isLoading = false;
      const errorMsg = error.message || 'Erro ao confirmar inscrição. Tente novamente.';
      this.showErrorMessage(errorMsg);
      console.log(`❌ [EVENT-REGISTRATION-MODAL] Registration error: ${errorMsg}`);
    }
  }

  /**
   * Show unsubscribe confirmation dialog
   */
  showUnsubscribeConfirmation() {
    console.log('🔵 [EVENT-REGISTRATION-MODAL] Showing unsubscribe confirmation');
    this.showConfirmUnsubscribe = true;
  }

  /**
   * Cancel unsubscribe operation
   */
  cancelUnsubscribe() {
    console.log('🔵 [EVENT-REGISTRATION-MODAL] Unsubscribe cancelled');
    this.showConfirmUnsubscribe = false;
  }

  /**
   * Handle unsubscription flow - call async service method with confirmation
   * Uses fetch API with Bearer token authentication
   */
  async onConfirmUnsubscribe() {
    console.log('🔵 [EVENT-REGISTRATION-MODAL] Starting unsubscribe process...');
    
    if (!this.currentUser) {
      this.showErrorMessage('Erro: Usuário não encontrado');
      console.log('❌ [EVENT-REGISTRATION-MODAL] Current user is null during unsubscribe');
      return;
    }

    this.isLoading = true;

    try {
      console.log(`🟡 [EVENT-REGISTRATION-MODAL] Calling unregisterUserFromEvent(eventId=${this.eventId}, userId=${this.currentUser.id})`);
      
      // Call the async service method
      await this.registrationService.unregisterUserFromEvent(
        this.eventId,
        this.currentUser.id
      );

      this.isLoading = false;
      this.showConfirmUnsubscribe = false;
      this.showSuccess = true;
      console.log('✅ [EVENT-REGISTRATION-MODAL] Unsubscribe successful');

      // Close modal and notify success after 2 seconds
      setTimeout(() => {
        this.unregisterSuccess.emit();
        this.closeModal();
      }, 2000);
    } catch (error: any) {
      this.isLoading = false;
      const errorMsg = error.message || 'Erro ao cancelar inscrição. Tente novamente.';
      this.showErrorMessage(errorMsg);
      console.log(`❌ [EVENT-REGISTRATION-MODAL] Unsubscribe error: ${errorMsg}`);
    }
  }

  /**
   * Função auxiliar para formatar telefone na exibição
   */
  formatPhoneNumber(phone: string): string {
    if (!phone) return '';
    // Remove tudo que não é número
    const cleaned = phone.replace(/\D/g, '');
    // Formata como (XX) XXXXX-XXXX
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
}
