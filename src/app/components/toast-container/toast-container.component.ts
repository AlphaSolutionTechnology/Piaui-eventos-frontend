import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toasts; track toast.id) {
        <div [ngClass]="['toast', 'toast-' + toast.type]">
          <div class="toast-content">
            <span class="toast-icon">
              @switch (toast.type) {
                @case ('success') {
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                }
                @case ('error') {
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
                    <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2" />
                    <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2" />
                  </svg>
                }
                @case ('warning') {
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 20h20L12 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2" />
                    <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2" />
                  </svg>
                }
                @default {
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" />
                    <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2" />
                    <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" stroke-width="2" />
                  </svg>
                }
              }
            </span>
            <span class="toast-message">{{ toast.message }}</span>
          </div>
          <button class="toast-close" (click)="toastService.remove(toast.id)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 400px;
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 8px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slideInRight 0.3s ease-out;
      pointer-events: auto;
      max-width: 100%;
    }

    .toast-success {
      background: rgba(34, 197, 94, 0.1);
      border-color: rgba(34, 197, 94, 0.3);
      color: #86efac;
    }

    .toast-error {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.3);
      color: #fca5a5;
    }

    .toast-warning {
      background: rgba(245, 158, 11, 0.1);
      border-color: rgba(245, 158, 11, 0.3);
      color: #fcd34d;
    }

    .toast-info {
      background: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.3);
      color: #93c5fd;
    }

    .toast-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .toast-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .toast-message {
      font-size: 0.9rem;
      font-weight: 500;
      white-space: normal;
      word-break: break-word;
    }

    .toast-close {
      flex-shrink: 0;
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background 0.2s ease;
    }

    .toast-close:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    @keyframes slideInRight {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @media (max-width: 600px) {
      .toast-container {
        bottom: 10px;
        right: 10px;
        left: 10px;
        max-width: 100%;
      }

      .toast {
        width: 100%;
      }
    }
  `]
})
export class ToastContainerComponent implements OnInit {
  toasts: Toast[] = [];

  constructor(public toastService: ToastService) {}

  ngOnInit(): void {
    this.toastService.toasts.subscribe(toasts => {
      this.toasts = toasts;
    });
  }
}
