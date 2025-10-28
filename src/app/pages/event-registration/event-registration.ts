import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

interface RegistrationForm {
  fullName: string;
  email: string;
  phone: string;
  occupation: string;
  company: string;
  dietaryRestrictions: string;
  comments: string;
  agreeTerms: boolean;
  receiveUpdates: boolean;
}

interface Event {
  id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  category: string;
  price: number;
  image: string;
  organizerName: string;
  availableSpots: number;
}

@Component({
  selector: 'app-event-registration',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './event-registration.html',
  styleUrls: ['./event-registration.css'],
  host: {
    '[class.dark-mode]': 'isDarkModeActive',
  },
})
export class EventRegistrationComponent implements OnInit, OnDestroy {
  isDarkModeActive = false;
  private darkModeObserver: MutationObserver | null = null;
  
  eventId: string | null = null;
  event: Event | null = null;
  isLoading = false;
  showSuccess = false;
  showError = false;
  errorMessage = '';

  registrationForm: RegistrationForm = {
    fullName: '',
    email: '',
    phone: '',
    occupation: '',
    company: '',
    dietaryRestrictions: '',
    comments: '',
    agreeTerms: false,
    receiveUpdates: true
  };

  // Mock event data
  mockEvents: Event[] = [
    {
      id: 1,
      title: 'Tech Conference Piauí 2024',
      date: '2024-03-15',
      time: '09:00',
      location: 'Centro de Convenções de Teresina',
      category: 'Tecnologia',
      price: 150.00,
      image: '/assets/evento-exemplo.jpeg',
      organizerName: 'TechPi Eventos',
      availableSpots: 50
    },
    {
      id: 2,
      title: 'Workshop de Marketing Digital',
      date: '2024-03-20',
      time: '14:00',
      location: 'Hotel Premium Teresina',
      category: 'Marketing',
      price: 80.00,
      image: '/assets/evento-exemplo.jpeg',
      organizerName: 'Marketing Pro',
      availableSpots: 30
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.eventId = this.route.snapshot.paramMap.get('id');
    this.loadEventData();
    this.observeDarkMode();
  }

  ngOnDestroy() {
    if (this.darkModeObserver) {
      this.darkModeObserver.disconnect();
    }
  }

  observeDarkMode() {
    if (isPlatformBrowser(this.platformId)) {
      // Verificar estado inicial
      this.isDarkModeActive = document.body.classList.contains('dark-mode');

      // Observar mudanças no body
      this.darkModeObserver = new MutationObserver(() => {
        this.isDarkModeActive = document.body.classList.contains('dark-mode');
      });

      this.darkModeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }
  }

  loadEventData() {
    if (this.eventId) {
      // Simulate API call
      const eventId = parseInt(this.eventId);
      this.event = this.mockEvents.find(e => e.id === eventId) || null;
    }
  }

  validateForm(): boolean {
    if (!this.registrationForm.fullName.trim()) {
      this.showErrorMessage('Nome completo é obrigatório');
      return false;
    }

    if (!this.registrationForm.email.trim()) {
      this.showErrorMessage('E-mail é obrigatório');
      return false;
    }

    if (!this.isValidEmail(this.registrationForm.email)) {
      this.showErrorMessage('E-mail inválido');
      return false;
    }

    if (!this.registrationForm.phone.trim()) {
      this.showErrorMessage('Telefone é obrigatório');
      return false;
    }

    if (!this.registrationForm.agreeTerms) {
      this.showErrorMessage('Você deve aceitar os termos e condições');
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

  onSubmit() {
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;

    // Simulate API call
    setTimeout(() => {
      this.isLoading = false;
      this.showSuccess = true;

      // Redirect after success
      setTimeout(() => {
        this.router.navigate(['/events']);
      }, 3000);
    }, 2000);
  }

  goBack() {
    window.history.back();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }
}
