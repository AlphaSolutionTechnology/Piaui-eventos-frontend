import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number; // ms, 0 = permanent
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts$ = new BehaviorSubject<Toast[]>([]);
  public toasts: Observable<Toast[]> = this.toasts$.asObservable();

  constructor() {}

  /**
   * Mostra um toast de sucesso
   * @param message - Mensagem a exibir
   * @param duration - Duração em ms (padrão: 3000)
   */
  success(message: string, duration: number = 3000): void {
    this.show({
      id: this.generateId(),
      message,
      type: 'success',
      duration,
    });
  }

  /**
   * Mostra um toast de erro
   * @param message - Mensagem a exibir
   * @param duration - Duração em ms (padrão: 5000)
   */
  error(message: string, duration: number = 5000): void {
    this.show({
      id: this.generateId(),
      message,
      type: 'error',
      duration,
    });
  }

  /**
   * Mostra um toast de informação
   * @param message - Mensagem a exibir
   * @param duration - Duração em ms (padrão: 3000)
   */
  info(message: string, duration: number = 3000): void {
    this.show({
      id: this.generateId(),
      message,
      type: 'info',
      duration,
    });
  }

  /**
   * Mostra um toast de aviso
   * @param message - Mensagem a exibir
   * @param duration - Duração em ms (padrão: 4000)
   */
  warning(message: string, duration: number = 4000): void {
    this.show({
      id: this.generateId(),
      message,
      type: 'warning',
      duration,
    });
  }

  /**
   * Mostra um toast customizado
   */
  private show(toast: Toast): void {
    const currentToasts = this.toasts$.value;
    const updatedToasts = [...currentToasts, toast];
    this.toasts$.next(updatedToasts);

    // Auto-remove após duração
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        this.remove(toast.id);
      }, toast.duration);
    }
  }

  /**
   * Remove um toast pelo ID
   */
  remove(id: string): void {
    const currentToasts = this.toasts$.value;
    const updatedToasts = currentToasts.filter(t => t.id !== id);
    this.toasts$.next(updatedToasts);
  }

  /**
   * Gera um ID único para o toast
   */
  private generateId(): string {
    return `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
