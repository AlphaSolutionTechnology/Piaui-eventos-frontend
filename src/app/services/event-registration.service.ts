import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../enviroment';
import { AuthService, User } from './auth';

/**
 * Interface para dados de inscrição no evento
 * Adaptada para a estrutura do backend
 */
export interface EventRegistrationData {
  // Informações que vêm do usuário autenticado
  userId: number;
  userName: string;
  userEmail: string;
  userPhoneNumber: string;

  // Informações do evento
  eventId: number;
  eventName: string;

  // Informações adicionais de participação
  dietaryRestrictions?: string;
  comments?: string;
  receiveUpdates?: boolean;
}

/**
 * Interface para resposta da API de inscrição
 * Customize conforme resposta real do seu backend
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
  // TODO: CONECTAR ENDPOINT REAL - Atualize a URL do endpoint para inscrição
  // Exemplo: /api/registrations ou /api/events/{eventId}/register
  private registrationUrl = `${environment.API_URL}/registrations`;

  private registrationLoadingSubject = new BehaviorSubject<boolean>(false);
  private registrationErrorSubject = new BehaviorSubject<string | null>(null);

  public registrationLoading$ = this.registrationLoadingSubject.asObservable();
  public registrationError$ = this.registrationErrorSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  /**
   * Prepara os dados de inscrição do usuário autenticado
   * Esta função extrai as informações do usuário do contexto de autenticação
   *
   * @param eventId - ID do evento para inscrição
   * @param eventName - Nome do evento (para referência)
   * @param dietaryRestrictions - Restrições alimentares (opcional)
   * @param comments - Comentários adicionais (opcional)
   * @param receiveUpdates - Flag para receber atualizações (padrão: true)
   * @returns EventRegistrationData com todas as informações preenchidas
   */
  prepareRegistrationData(
    eventId: number,
    eventName: string,
    dietaryRestrictions?: string,
    comments?: string,
    receiveUpdates: boolean = true
  ): EventRegistrationData | null {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      this.registrationErrorSubject.next('Usuário não autenticado');
      return null;
    }

    return {
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      userPhoneNumber: currentUser.phoneNumber,
      eventId,
      eventName,
      dietaryRestrictions: dietaryRestrictions || '',
      comments: comments || '',
      receiveUpdates,
    };
  }

  /**
   * Registra um usuário em um evento
   *
   * TODO: AJUSTAR ESTRUTURA DE PAYLOAD - Modifique a estrutura do payload enviado
   * conforme esperado pelo seu backend. Exemplo:
   *
   * // Opção 1 - Sem transformação:
   * return this.http.post<EventRegistrationResponse>(
   *   `${this.registrationUrl}`,
   *   registrationData
   * )
   *
   * // Opção 2 - Com transformação de payload:
   * const payload = {
   *   participant: {
   *     id: registrationData.userId,
   *     name: registrationData.userName,
   *     email: registrationData.userEmail
   *   },
   *   event: { id: registrationData.eventId },
   *   preferences: {
   *     dietary: registrationData.dietaryRestrictions,
   *     notifications: registrationData.receiveUpdates
   *   }
   * };
   * return this.http.post<EventRegistrationResponse>(
   *   `${this.registrationUrl}/events/${registrationData.eventId}`,
   *   payload
   * )
   *
   * // Opção 3 - Via endpoint específico:
   * return this.http.post<EventRegistrationResponse>(
   *   `${environment.API_URL}/events/${registrationData.eventId}/subscribe`,
   *   { userId: registrationData.userId }
   * )
   *
   * @param registrationData - Dados preparados da inscrição
   * @returns Observable com resposta da inscrição
   */
  registerUserToEvent(
    registrationData: EventRegistrationData
  ): Observable<EventRegistrationResponse> {
    this.registrationLoadingSubject.next(true);
    this.registrationErrorSubject.next(null);

    // TODO: CONEXÃO COM BACKEND - Esta é a estrutura padrão.
    // Ajuste conforme sua API:
    // 1. Mude `this.registrationUrl` para o endpoint correto
    // 2. Mude `registrationData` para a estrutura esperada pelo backend
    // 3. Mude `EventRegistrationResponse` para o tipo de resposta real

    return this.http
      .post<EventRegistrationResponse>(
        this.registrationUrl,
        this.mapToBackendPayload(registrationData)
      )
      .pipe(
        tap((response) => {
          this.registrationLoadingSubject.next(false);
          console.log('✅ Inscrição realizada com sucesso:', response);
        }),
        catchError((error) => {
          this.registrationLoadingSubject.next(false);
          const errorMessage = this.getErrorMessage(error);
          this.registrationErrorSubject.next(errorMessage);
          console.error('❌ Erro ao inscrever no evento:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Mapeia os dados da aplicação para a estrutura esperada pelo backend
   *
   * TODO: CUSTOMIZAR TRANSFORMAÇÃO - Modifique esta função para transformar
   * os dados conforme a estrutura esperada do seu backend
   *
   * Exemplo de possíveis estruturas:
   *
   * // Estrutura 1 - Direta (sem transformação):
   * mapToBackendPayload(data: EventRegistrationData) {
   *   return data;
   * }
   *
   * // Estrutura 2 - Com agrupamento:
   * mapToBackendPayload(data: EventRegistrationData) {
   *   return {
   *     participant: {
   *       id: data.userId,
   *       name: data.userName,
   *       email: data.userEmail,
   *       phone: data.userPhoneNumber
   *     },
   *     event: { id: data.eventId },
   *     additionalInfo: {
   *       dietaryRestrictions: data.dietaryRestrictions,
   *       comments: data.comments,
   *       subscribeToNewsletter: data.receiveUpdates
   *     }
   *   };
   * }
   *
   * // Estrutura 3 - Flat com prefixos:
   * mapToBackendPayload(data: EventRegistrationData) {
   *   return {
   *     user_id: data.userId,
   *     user_name: data.userName,
   *     event_id: data.eventId,
   *     dietary_restrictions: data.dietaryRestrictions,
   *     newsletter: data.receiveUpdates
   *   };
   * }
   *
   * @param data - Dados da inscrição em formato padrão
   * @returns Dados transformados para a estrutura do backend
   */
  private mapToBackendPayload(data: EventRegistrationData): any {
    // PADRÃO ATUAL - Estrutura flat
    // Se o backend espera algo diferente, modifique aqui
    return {
      userId: data.userId,
      userName: data.userName,
      userEmail: data.userEmail,
      userPhoneNumber: data.userPhoneNumber,
      eventId: data.eventId,
      eventName: data.eventName,
      dietaryRestrictions: data.dietaryRestrictions,
      comments: data.comments,
      receiveUpdates: data.receiveUpdates,
    };
  }

  /**
   * Extrai mensagem de erro da resposta HTTP
   *
   * @param error - Objeto de erro do HTTP
   * @returns Mensagem de erro formatada
   */
  private getErrorMessage(error: any): string {
    if (error.status === 0) {
      return 'Sem conexão com a internet.';
    }
    if (error.status === 400) {
      return error.error?.message || 'Dados inválidos. Verifique as informações.';
    }
    if (error.status === 401) {
      return 'Sessão expirada. Por favor, faça login novamente.';
    }
    if (error.status === 403) {
      return 'Você não tem permissão para se inscrever neste evento.';
    }
    if (error.status === 404) {
      return 'Evento não encontrado.';
    }
    if (error.status === 409) {
      return 'Você já está inscrito neste evento.';
    }
    if (error.status === 500) {
      return 'Erro no servidor. Tente novamente em alguns minutos.';
    }
    return 'Erro ao inscrever no evento. Tente novamente.';
  }

  /**
   * Verifica se já existe uma inscrição do usuário em um evento
   *
   * TODO: IMPLEMENTAR VERIFICAÇÃO - Se o backend suporta, implemente a verificação
   * de inscrição existente. Exemplo:
   *
   * checkUserEventRegistration(userId: number, eventId: number): Observable<boolean> {
   *   return this.http.get<{exists: boolean}>(
   *     `${this.registrationUrl}/user/${userId}/event/${eventId}`
   *   ).pipe(
   *     map(response => response.exists),
   *     catchError(() => of(false))
   *   );
   * }
   *
   * @param userId - ID do usuário
   * @param eventId - ID do evento
   * @returns Observable indicando se já existe inscrição
   */
  checkUserEventRegistration(userId: number, eventId: number): Observable<boolean> {
    // TODO: Implementar endpoint de verificação
    console.warn('⚠️ checkUserEventRegistration não está implementado ainda');
    return new Observable((observer) => {
      observer.next(false);
      observer.complete();
    });
  }

  /**
   * Cancela a inscrição de um usuário em um evento
   *
   * TODO: IMPLEMENTAR CANCELAMENTO - Se o backend suporta, implemente o cancelamento
   * de inscrição. Exemplo:
   *
   * cancelEventRegistration(registrationId: number): Observable<any> {
   *   return this.http.delete(
   *     `${this.registrationUrl}/${registrationId}`
   *   ).pipe(
   *     tap(() => console.log('Inscrição cancelada')),
   *     catchError(error => {
   *       console.error('Erro ao cancelar inscrição:', error);
   *       return throwError(() => error);
   *     })
   *   );
   * }
   *
   * @param registrationId - ID da inscrição a cancelar
   * @returns Observable com resultado do cancelamento
   */
  cancelEventRegistration(registrationId: number): Observable<any> {
    // TODO: Implementar endpoint de cancelamento
    console.warn('⚠️ cancelEventRegistration não está implementado ainda');
    return new Observable((observer) => {
      observer.error('Método não implementado');
    });
  }

  /**
   * Obtém o estado de carregamento atual
   *
   * @returns boolean indicando se há uma requisição em progresso
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
