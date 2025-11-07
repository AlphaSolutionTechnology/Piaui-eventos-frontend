import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  Inject,
  PLATFORM_ID,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventRegistrationService } from '../../services/event-registration.service';
import { AuthService, User } from '../../services/auth';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-event-registration-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './event-registration-modal.html',
  styleUrls: ['./event-registration-modal.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  comments = '';
  receiveUpdates = true;
  agreeTerms = false;

  constructor(
    private registrationService: EventRegistrationService,
    private authService: AuthService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();

    // Subscrever a mudanças no usuário
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.currentUser = user;
      }
    });
  }

  closeModal() {
    this.resetForm();
    this.close.emit();
  }

  resetForm() {
    this.comments = '';
    this.receiveUpdates = true;
    this.agreeTerms = false;
    this.showError = false;
    this.showSuccess = false;
    this.errorMessage = '';
    this.showConfirmUnsubscribe = false;
    this.isLoading = false;
    this.cdr.detectChanges();
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

    if (!this.currentUser) {
      this.showErrorMessage('Erro: Usuário não encontrado. Faça login primeiro.');
      this.toastService.error('Usuário não encontrado. Faça login primeiro.');
      console.log('❌ [EVENT-REGISTRATION-MODAL] Current user is null');
      return;
    }

    if (!this.validateForm()) {
      console.log('❌ [EVENT-REGISTRATION-MODAL] Form validation failed');
      return;
    }

    this.isLoading = true;
    this.showSuccess = false;
    this.showError = false;
    this.cdr.detectChanges();

    try {
      console.log(
        `🟡 [EVENT-REGISTRATION-MODAL] Calling registerUserToEvent(eventId=${this.eventId}, userId=${this.currentUser.id})`
      );

      // Call the async service method
      await this.registrationService.registerUserToEvent(this.eventId, this.currentUser.id);

      console.log('✅ [EVENT-REGISTRATION-MODAL] Registration successful');

      // Mostrar toast de sucesso
      this.toastService.success('✅ Inscrição confirmada com sucesso!', 3000);

      // Fechar modal imediatamente
      this.registerSuccess.emit();
      this.closeModal();
    } catch (error: any) {
      console.log('❌ [EVENT-REGISTRATION-MODAL] Catch block triggered', error);
      this.isLoading = false;
      this.cdr.detectChanges();
      const errorMsg = error.message || 'Erro ao confirmar inscrição. Tente novamente.';
      this.showErrorMessage(errorMsg);
      this.toastService.error(`Erro: ${errorMsg}`, 5000);
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
      this.toastService.error('Usuário não encontrado');
      console.log('❌ [EVENT-REGISTRATION-MODAL] Current user is null during unsubscribe');
      return;
    }

    this.isLoading = true;
    this.showSuccess = false;
    this.showError = false;
    this.cdr.detectChanges();

    try {
      console.log(
        `🟡 [EVENT-REGISTRATION-MODAL] Calling unregisterUserFromEvent(eventId=${this.eventId}, userId=${this.currentUser.id})`
      );

      // Call the async service method
      await this.registrationService.unregisterUserFromEvent(this.eventId, this.currentUser.id);

      console.log('✅ [EVENT-REGISTRATION-MODAL] Unsubscribe successful');

      // Mostrar toast de sucesso
      this.toastService.success('✅ Inscrição cancelada com sucesso!', 3000);

      // Fechar modal imediatamente
      this.unregisterSuccess.emit();
      this.closeModal();
    } catch (error: any) {
      console.log('❌ [EVENT-REGISTRATION-MODAL] Catch block triggered', error);
      this.isLoading = false;
      this.cdr.detectChanges();
      const errorMsg = error.message || 'Erro ao cancelar inscrição. Tente novamente.';
      this.showErrorMessage(errorMsg);
      this.toastService.error(`Erro: ${errorMsg}`, 5000);
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
