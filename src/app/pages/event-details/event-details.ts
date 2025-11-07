import { Component, OnInit, OnDestroy, PLATFORM_ID, inject, HostBinding } from '@angular/core';
import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  EventDetailService,
  EventDetailResponse,
  EventLocation,
} from '../../services/EventDetail/event-detail-service';
import { AppHeader } from '../../components/app-header/app-header';
import { AuthService } from '../../services/auth';
import { EventRegistrationModalComponent } from '../../components/event-registration-modal/event-registration-modal';

@Component({
  standalone: true,
  selector: 'event-details',
  imports: [CommonModule, RouterModule, AppHeader, EventRegistrationModalComponent],
  templateUrl: './event-details.html',
  styleUrl: './event-details.css',
  host: {
    '[class.dark-mode]': 'isDarkModeActive',
  },
})
export class EventDetailsPage implements OnInit, OnDestroy {
  @HostBinding('class.dark-mode') isDarkModeActive = false;
  private darkModeObserver: MutationObserver | null = null;

  private eventdetailservice = inject(EventDetailService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private location = inject(Location);

  event: EventDetailResponse | null = null;
  eventlocation: EventLocation | null = null;
  isLoading = true;
  error: string | null = null;
  showContent = false;
  isBrowser: boolean;
  renderKey = 0;
  showLoginModal = false;
  showRegistrationModal = false;
  isUserSubscribed = false;

  constructor() {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    // Carrega dados apenas no browser
    if (this.isBrowser) {
      // Observa mudanças no dark mode
      this.observeDarkMode();

      // Usar setTimeout para garantir que está após o ciclo de hidratação
      setTimeout(() => {
        this.loadEventData();
      }, 0);
    }
  }

  ngOnDestroy() {
    if (this.darkModeObserver) {
      this.darkModeObserver.disconnect();
    }
  }

  private observeDarkMode() {
    // Verifica se o dark mode já está ativo
    this.isDarkModeActive = document.documentElement.classList.contains('dark-mode');

    // Observa mudanças na classe dark-mode no elemento html
    this.darkModeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          this.isDarkModeActive = document.documentElement.classList.contains('dark-mode');
        }
      });
    });

    this.darkModeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  private loadEventData() {
    const eventId = Number(this.route.snapshot.paramMap.get('id'));

    this.eventdetailservice.getEventDetails(eventId).subscribe({
      next: (data: EventDetailResponse) => {
        this.event = data;
        this.eventlocation = data.location; // ✅ Agora usa "location"
        this.isLoading = false;
        this.showContent = true;
        this.renderKey++;
      },
      error: (error) => {
        this.error = 'Erro ao carregar evento. Tente novamente.';
        this.isLoading = false;
        this.showContent = false;
        this.renderKey++;
      },
    });
  }

  shareEvent() {
    if (navigator.share) {
      navigator.share({
        title: this.event?.name,
        text: this.event?.description,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  }

  toggleFavorite() {
    // Implementar lógica de favoritos
  }

  handleRegisterClick() {
    // Verifica se o usuário está autenticado
    if (this.authService.isAuthenticated()) {
      // Se estiver autenticado, abre o modal de confirmação de inscrição
      this.showRegistrationModal = true;
    } else {
      // Se não estiver autenticado, mostra o modal de login
      this.showLoginModal = true;
    }
  }

  closeLoginModal() {
    this.showLoginModal = false;
  }

  closeRegistrationModal() {
    this.showRegistrationModal = false;
  }

  handleRegistrationSuccess() {
    // Inscrição realizada com sucesso
    this.showRegistrationModal = false;
    this.isUserSubscribed = true;
    // Você pode atualizar dados do evento aqui se desejar
    this.loadEventData();
  }

  goToLogin() {
    this.showLoginModal = false;
    this.router.navigate(['/login']);
  }

  goToRegister() {
    this.showLoginModal = false;
    this.router.navigate(['/register']);
  }

  goBack() {
    this.location.back();
  }

  /**
   * Manipula evento de desinscrição bem-sucedida
   */
  handleUnregistrationSuccess() {
    console.log('✅ [EVENT-DETAILS] User successfully unregistered from event');
    this.showRegistrationModal = false;
    this.isUserSubscribed = false;
    // Você pode atualizar dados do evento aqui se desejar
    this.loadEventData();
  }

  /**
   * Manipula erro de carregamento de imagem
   */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    // Fallback para imagem padrão
    img.src = 'assets/events/evento-exemplo.svg';
    img.onerror = null; // Previne loop infinito se a imagem padrão também falhar
  }
}
