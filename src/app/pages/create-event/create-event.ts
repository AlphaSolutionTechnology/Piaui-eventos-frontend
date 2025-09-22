import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

interface CreateEventForm {
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  location: string;
  address: string;
  price: number;
  maxParticipants: number;
  organizerName: string;
  organizerEmail: string;
  organizerPhone: string;
  image: File | null;
  tags: string[];
  requiresApproval: boolean;
  isPublic: boolean;
  allowWaitlist: boolean;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './create-event.html',
  styleUrls: ['./create-event.css']
})
export class CreateEventComponent implements OnInit {
  isLoading = false;
  showSuccess = false;
  showError = false;
  errorMessage = '';
  currentStep = 1;
  totalSteps = 3;

  selectedImagePreview: string | null = null;
  tagInput = '';

  createEventForm: CreateEventForm = {
    title: '',
    description: '',
    category: '',
    date: '',
    time: '',
    location: '',
    address: '',
    price: 0,
    maxParticipants: 50,
    organizerName: '',
    organizerEmail: '',
    organizerPhone: '',
    image: null,
    tags: [],
    requiresApproval: false,
    isPublic: true,
    allowWaitlist: true
  };

  categories: Category[] = [
    { id: 'tecnologia', name: 'Tecnologia', icon: '💻' },
    { id: 'negocios', name: 'Negócios', icon: '💼' },
    { id: 'educacao', name: 'Educação', icon: '📚' },
    { id: 'saude', name: 'Saúde', icon: '🏥' },
    { id: 'cultura', name: 'Cultura', icon: '🎭' },
    { id: 'esportes', name: 'Esportes', icon: '⚽' },
    { id: 'gastronomia', name: 'Gastronomia', icon: '🍽️' },
    { id: 'arte', name: 'Arte', icon: '🎨' },
    { id: 'musica', name: 'Música', icon: '🎵' },
    { id: 'outros', name: 'Outros', icon: '📋' }
  ];

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.setMinDate();
  }

  setMinDate() {
    // Only run this code in the browser, not during SSR
    if (isPlatformBrowser(this.platformId)) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const minDate = tomorrow.toISOString().split('T')[0];

      const dateInput = document.getElementById('date') as HTMLInputElement;
      if (dateInput) {
        dateInput.min = minDate;
      }
    }
  }

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
        return this.validateBasicInfo();
      case 2:
        return this.validateEventDetails();
      case 3:
        return this.validateOrganizerInfo();
      default:
        return false;
    }
  }

  validateBasicInfo(): boolean {
    if (!this.createEventForm.title.trim()) {
      this.showErrorMessage('Título do evento é obrigatório');
      return false;
    }

    if (!this.createEventForm.description.trim()) {
      this.showErrorMessage('Descrição do evento é obrigatória');
      return false;
    }

    if (!this.createEventForm.category) {
      this.showErrorMessage('Categoria do evento é obrigatória');
      return false;
    }

    return true;
  }

  validateEventDetails(): boolean {
    if (!this.createEventForm.date) {
      this.showErrorMessage('Data do evento é obrigatória');
      return false;
    }

    if (!this.createEventForm.time) {
      this.showErrorMessage('Horário do evento é obrigatório');
      return false;
    }

    if (!this.createEventForm.location.trim()) {
      this.showErrorMessage('Local do evento é obrigatório');
      return false;
    }

    if (!this.createEventForm.address.trim()) {
      this.showErrorMessage('Endereço do evento é obrigatório');
      return false;
    }

    if (this.createEventForm.maxParticipants <= 0) {
      this.showErrorMessage('Número máximo de participantes deve ser maior que zero');
      return false;
    }

    return true;
  }

  validateOrganizerInfo(): boolean {
    if (!this.createEventForm.organizerName.trim()) {
      this.showErrorMessage('Nome do organizador é obrigatório');
      return false;
    }

    if (!this.createEventForm.organizerEmail.trim()) {
      this.showErrorMessage('E-mail do organizador é obrigatório');
      return false;
    }

    if (!this.isValidEmail(this.createEventForm.organizerEmail)) {
      this.showErrorMessage('E-mail inválido');
      return false;
    }

    if (!this.createEventForm.organizerPhone.trim()) {
      this.showErrorMessage('Telefone do organizador é obrigatório');
      return false;
    }

    return true;
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.createEventForm.image = file;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedImagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  addTag() {
    if (this.tagInput.trim() && !this.createEventForm.tags.includes(this.tagInput.trim())) {
      this.createEventForm.tags.push(this.tagInput.trim());
      this.tagInput = '';
    }
  }

  removeTag(tag: string) {
    this.createEventForm.tags = this.createEventForm.tags.filter(t => t !== tag);
  }

  onTagInputKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addTag();
    }
  }

  showErrorMessage(message: string) {
    this.errorMessage = message;
    this.showError = true;
    setTimeout(() => {
      this.showError = false;
    }, 5000);
  }

  onSubmit() {
    if (!this.validateCurrentStep()) {
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

  getCategoryIcon(categoryId: string): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category ? category.icon : '📋';
  }

  getCategoryName(categoryId: string): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category ? category.name : categoryId;
  }

  getStepTitle(): string {
    switch (this.currentStep) {
      case 1:
        return 'Informações Básicas';
      case 2:
        return 'Detalhes do Evento';
      case 3:
        return 'Informações do Organizador';
      default:
        return '';
    }
  }

  goBack() {
    if (this.currentStep === 1) {
      this.router.navigate(['/events']);
    } else {
      this.prevStep();
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }
}
