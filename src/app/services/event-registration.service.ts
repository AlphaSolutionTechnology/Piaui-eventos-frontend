import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { environment } from '../../../enviroment';
import { AuthService, User } from './auth';

/**
 * DTO para inscrição em evento - correspondente a UserRegistrationDTO do backend
 * Documentação: POST /api/events/{eventId}/register
 */
export interface UserRegistrationDTO {
  userId: number;
}

/**
 * Interface para resposta da API de inscrição
 */
export interface EventRegistrationResponse {
  id?: number;
  message?: string;
  success?: boolean;
  registrationId?: number;
  timestamp?: string;
}

@Injectable({
  providedIn: 'root',
})
export class EventRegistrationService {
  // Endpoint base conforme documentação do backend
  private apiUrl = environment.API_URL;

  private registrationLoadingSubject = new BehaviorSubject<boolean>(false);
  private registrationErrorSubject = new BehaviorSubject<string | null>(null);
  private isSubscribedSubject = new BehaviorSubject<boolean>(false);

  public registrationLoading$ = this.registrationLoadingSubject.asObservable();
  public registrationError$ = this.registrationErrorSubject.asObservable();
  public isSubscribed$ = this.isSubscribedSubject.asObservable();

  constructor(private authService: AuthService, @Inject(PLATFORM_ID) private platformId: Object) {}

  /**
   * Inscreve um usuário em um evento
   * Endpoint: POST /api/events/{eventId}/register
   *
   * @param eventId - ID do evento
   * @param userId - ID do usuário
   * @returns Promise com resultado da inscrição
   */
  async registerUserToEvent(eventId: number, userId: number): Promise<void> {
    this.registrationLoadingSubject.next(true);
    this.registrationErrorSubject.next(null);

    try {
      // Obter token do usuário autenticado
      const user = this.authService.getCurrentUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Preparar o payload conforme documentação do backend
      const payload: UserRegistrationDTO = {
        userId,
      };

      // Chamar endpoint de inscrição
      const response = await fetch(`${this.apiUrl}/events/${eventId}/register`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.getAccessToken()}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Enviar cookies
        body: JSON.stringify(payload),
      });

      // Tratamento de erros baseado no status HTTP
      if (!response.ok) {
        const error = await this.handleErrorResponse(response);
        throw new Error(error);
      }

      console.log('✅ Inscrito com sucesso no evento!');
      this.isSubscribedSubject.next(true);
      this.registrationLoadingSubject.next(false);
    } catch (error: any) {
      const errorMessage = this.getErrorMessage(error);
      this.registrationErrorSubject.next(errorMessage);
      console.error('❌ Erro ao inscrever:', errorMessage);
      this.registrationLoadingSubject.next(false);
      throw error;
    }
  }

  /**
   * Desinscreve um usuário de um evento
   * Endpoint: DELETE /api/events/{eventId}/register/{userId}
   *
   * @param eventId - ID do evento
   * @param userId - ID do usuário
   * @returns Promise com resultado da desinscrição
   */
  async unregisterUserFromEvent(eventId: number, userId: number): Promise<void> {
    this.registrationLoadingSubject.next(true);
    this.registrationErrorSubject.next(null);

    try {
      const user = this.authService.getCurrentUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Chamar endpoint de desinscrição
      const response = await fetch(`${this.apiUrl}/events/${eventId}/register/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.getAccessToken()}`,
        },
        credentials: 'include',
      });

      // Status 204 No Content é o esperado para DELETE bem-sucedido
      if (response.status !== 204 && !response.ok) {
        const error = await this.handleErrorResponse(response);
        throw new Error(error);
      }

      console.log('✅ Desinscrição realizada com sucesso!');
      this.isSubscribedSubject.next(false);
      this.registrationLoadingSubject.next(false);
    } catch (error: any) {
      const errorMessage = this.getErrorMessage(error);
      this.registrationErrorSubject.next(errorMessage);
      console.error('❌ Erro ao desinscrever:', errorMessage);
      this.registrationLoadingSubject.next(false);
      throw error;
    }
  }

  /**
   * Trata resposta de erro do servidor
   * @private
   */
  private async handleErrorResponse(response: Response): Promise<string> {
    switch (response.status) {
      case 400:
        return 'Dados inválidos. Verifique as informações.';
      case 401:
        return 'Sessão expirada. Por favor, faça login novamente.';
      case 403:
        return 'Você não tem permissão para realizar esta ação.';
      case 404:
        return 'Evento ou inscrição não encontrada.';
      case 409:
        return 'Você já está inscrito neste evento.';
      case 500:
        return 'Erro no servidor. Tente novamente em alguns minutos.';
      default:
        return `Erro ${response.status}: ${response.statusText}`;
    }
  }

  /**
   * Extrai mensagem de erro
   * @private
   */
  private getErrorMessage(error: any): string {
    if (!isPlatformBrowser(this.platformId)) {
      return 'Operação não disponível no servidor';
    }

    if (error instanceof TypeError) {
      if (error.message.includes('fetch')) {
        return 'Erro de conexão. Verifique sua internet.';
      }
      return error.message;
    }

    return error?.message || 'Erro desconhecido';
  }

  /**
   * Obtém o token de acesso do usuário autenticado
   * @private
   */
  private getAccessToken(): string {
    if (!isPlatformBrowser(this.platformId)) {
      return '';
    }

    // Tentar obter do localStorage (onde o AuthService salva)
    try {
      // O token geralmente é salvo via cookie HTTP-only
      // Se necessário acessar via JS, pode estar em localStorage
      return localStorage.getItem('accessToken') || '';
    } catch {
      return '';
    }
  }

  /**
   * Define o estado de inscrição
   */
  setSubscribedState(isSubscribed: boolean): void {
    this.isSubscribedSubject.next(isSubscribed);
  }

  /**
   * Obtém o estado atual de inscrição
   */
  getSubscribedState(): boolean {
    return this.isSubscribedSubject.value;
  }

  /**
   * Obtém o estado de carregamento atual
   */
  isRegistrationLoading(): boolean {
    return this.registrationLoadingSubject.value;
  }

  /**
   * Limpa as mensagens de erro
   */
  clearRegistrationError(): void {
    this.registrationErrorSubject.next(null);
  }
}
