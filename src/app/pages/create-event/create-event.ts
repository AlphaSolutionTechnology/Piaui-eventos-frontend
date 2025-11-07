import { Component, OnInit, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { EventsService } from '../../services/events.service';
import { UserService } from '../../services/user.service';
import { ApiEvent } from '../../models/api-event.interface';
import { ToastService } from '../../services/toast.service';

interface CreateEventForm {
  title: string;
  description: string;
  category: string;
  date: string;
  time: string;
  zipCode: string;
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
  imports: [CommonModule, FormsModule],
  templateUrl: './create-event.html',
  styleUrls: ['./create-event.css'],
  host: {
    '[class.dark-mode]': 'isDarkModeActive',
  },
})
export class CreateEventComponent implements OnInit, OnDestroy {
  isDarkModeActive = false;
  private darkModeObserver: MutationObserver | null = null;

  isLoading = false;
  showSuccess = false;
  showError = false;
  errorMessage = '';
  currentStep = 1;
  totalSteps = 3;
  
  isLoadingAddress = false;
  cepError = '';
  emailError = '';

  selectedImagePreview: string | null = null;
  tagInput = '';

  // Edit mode tracking
  isEditMode = false;
  eventIdToEdit: number | null = null;
  pageTitle = 'Criar Novo Evento';
  submitButtonText = 'Criar Evento';

  createEventForm: CreateEventForm = {
    title: '',
    description: '',
    category: '',
    date: '',
    time: '',
    zipCode: '',
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
    private activatedRoute: ActivatedRoute,
    private location: Location,
    private eventsService: EventsService,
    private userService: UserService,
    private toastService: ToastService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    // Check if we're in edit mode by looking at the route parameter
    this.activatedRoute.paramMap.subscribe((params) => {
      const idParam = params.get('id');
      if (idParam) {
        this.eventIdToEdit = parseInt(idParam, 10);
        this.isEditMode = true;
        this.pageTitle = 'Editar Evento';
        this.submitButtonText = 'Atualizar Evento';
        this.loadEventForEditing(this.eventIdToEdit);
      }
    });

    this.setMinDate();
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

    if (!this.createEventForm.zipCode.trim()) {
      this.showErrorMessage('CEP é obrigatório');
      return false;
    }

    const cleanCep = this.createEventForm.zipCode.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      this.showErrorMessage('CEP deve conter 8 dígitos');
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

  /**
   * Search address by CEP using ViaCEP API (called automatically)
   */
  searchAddressByCep() {
    const cep = this.createEventForm.zipCode.replace(/\D/g, '');
    
    // Silently return if CEP is not complete
    if (cep.length !== 8) {
      return;
    }

    this.isLoadingAddress = true;
    this.cepError = '';

    this.eventsService.getAddressByCep(cep).subscribe({
      next: (response) => {
        this.isLoadingAddress = false;
        
        // Auto-fill address fields
        const fullAddress = `${response.logradouro}${response.complemento ? ', ' + response.complemento : ''}, ${response.bairro} - ${response.localidade}/${response.uf}`;
        this.createEventForm.address = fullAddress;
        
        // Auto-focus on location field after successful CEP lookup
        if (isPlatformBrowser(this.platformId)) {
          setTimeout(() => {
            const locationInput = document.getElementById('location') as HTMLInputElement;
            if (locationInput) {
              locationInput.focus();
            }
          }, 100);
        }
        
        console.log('Address found:', response);
      },
      error: (error) => {
        this.isLoadingAddress = false;
        this.cepError = 'CEP não encontrado. Verifique o número digitado.';
        this.createEventForm.address = ''; // Clear on error
        console.error('Error fetching address:', error);
      }
    });
  }

  /**
   * Format CEP as user types and auto-search when complete
   */
  onCepInput(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    
    if (value.length > 8) {
      value = value.substring(0, 8);
    }
    
    if (value.length > 5) {
      value = value.replace(/(\d{5})(\d)/, '$1-$2');
    }
    
    this.createEventForm.zipCode = value;
    this.cepError = '';

    // Auto-search when CEP is complete (8 digits)
    const cleanCep = value.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      this.searchAddressByCep();
    } else {
      // Clear address if CEP is incomplete
      if (this.createEventForm.address) {
        this.createEventForm.address = '';
      }
    }
  }

  /**
   * Format phone number as user types: (XX) XXXXX-XXXX
   */
  formatPhone(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    
    if (value.length > 11) {
      value = value.substring(0, 11);
    }
    
    if (value.length > 10) {
      // Mobile: (XX) XXXXX-XXXX
      value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (value.length > 6) {
      // Landline or partial mobile: (XX) XXXX-XXXX
      value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    } else if (value.length > 2) {
      value = value.replace(/(\d{2})(\d{0,5})/, '($1) $2');
    }
    
    this.createEventForm.organizerPhone = value;
  }

  /**
   * Validate email in real-time
   */
  validateEmail() {
    const email = this.createEventForm.organizerEmail.trim();
    
    if (!email) {
      this.emailError = '';
      return;
    }
    
    if (!this.isValidEmail(email)) {
      this.emailError = 'E-mail inválido';
    } else {
      this.emailError = '';
    }
  }

  /**
   * Check if email is valid and return visual feedback
   */
  isEmailValid(): boolean {
    const email = this.createEventForm.organizerEmail.trim();
    return email.length > 0 && this.isValidEmail(email);
  }

  /**
   * Load existing event data for editing
   */
  loadEventForEditing(eventId: number) {
    this.isLoading = true;
    this.eventsService.getEventById(eventId).subscribe({
      next: (event) => {
        this.isLoading = false;
        this.populateFormWithEventData(event);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error loading event for editing:', error);
        this.toastService.error('Erro ao carregar evento para edição');
        setTimeout(() => {
          this.router.navigate(['/my-events']);
        }, 2000);
      }
    });
  }

  /**
   * Map API event data to form structure
   */
  populateFormWithEventData(event: any) {
    try {
      // Parse date and time from eventDate field (format: "30/11/2025 14:30:00")
      let date = '';
      let time = '';
      
      if (event.eventDate) {
        const parts = event.eventDate.split(' ');
        if (parts.length === 2) {
          const dateParts = parts[0].split('/');
          if (dateParts.length === 3) {
            // Convert from DD/MM/YYYY to YYYY-MM-DD for input type="date"
            date = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
            time = parts[1].substring(0, 5); // Get HH:MM from HH:MM:SS
          }
        }
      }

      // Pre-populate form
      this.createEventForm = {
        title: event.name || event.title || '',
        description: event.description || '',
        category: event.eventType || event.category || '',
        date: date,
        time: time,
        zipCode: event.zipCode || '',
        location: event.location?.name || event.location || '',
        address: event.address || '',
        price: event.price || 0,
        maxParticipants: event.maxSubs || event.maxParticipants || 50,
        organizerName: event.createdBy?.name || '',
        organizerEmail: event.createdBy?.email || '',
        organizerPhone: event.organizerPhone || '',
        image: null,
        tags: event.tags || [],
        requiresApproval: event.requiresApproval || false,
        isPublic: event.isPublic !== false,
        allowWaitlist: event.allowWaitlist !== false
      };

      // Set image preview if available
      if (event.imageUrl) {
        this.selectedImagePreview = event.imageUrl;
      }
    } catch (error) {
      console.error('Error mapping event data to form:', error);
      this.toastService.error('Erro ao carregar dados do evento');
    }
  }

  onSubmit() {
    if (!this.validateCurrentStep()) {
      return;
    }

    this.isLoading = true;
    this.showError = false;
    this.errorMessage = '';

    // Map form data to ApiEvent format
    const eventData: Partial<ApiEvent> = {
      title: this.createEventForm.title,
      name: this.createEventForm.title,
      description: this.createEventForm.description,
      category: this.createEventForm.category,
      eventType: this.createEventForm.category,
      date: this.createEventForm.date,
      time: this.createEventForm.time,
      zipCode: this.createEventForm.zipCode.replace(/\D/g, ''), // Send only numbers
      location: this.createEventForm.location,
      address: this.createEventForm.address,
      price: this.createEventForm.price,
      maxParticipants: this.createEventForm.maxParticipants,
      organizerName: this.createEventForm.organizerName,
      organizerEmail: this.createEventForm.organizerEmail,
      organizerPhone: this.createEventForm.organizerPhone,
      imageUrl: this.selectedImagePreview || 'assets/events/evento-exemplo.svg',
      tags: this.createEventForm.tags,
      requiresApproval: this.createEventForm.requiresApproval,
      isPublic: this.createEventForm.isPublic,
      allowWaitlist: this.createEventForm.allowWaitlist,
      status: 'published',
      currentParticipants: 0
    };

    if (this.isEditMode && this.eventIdToEdit) {
      // Update existing event
      this.eventsService.updateEvent(this.eventIdToEdit, eventData).subscribe({
        next: (updatedEvent) => {
          this.isLoading = false;
          this.showSuccess = true;
          this.toastService.success('Evento atualizado com sucesso!');
          console.log('Event updated successfully:', updatedEvent);

          // Redirect after success
          setTimeout(() => {
            this.router.navigate(['/my-events']);
          }, 2000);
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error updating event:', error);
          this.handleSubmitError(error, 'atualizar');
        }
      });
    } else {
      // Create new event - need user ID
      this.userService.getUserProfile().subscribe({
        next: (userProfile) => {
          this.eventsService.createEvent(eventData, userProfile.id).subscribe({
            next: (createdEvent) => {
              this.isLoading = false;
              this.showSuccess = true;
              this.toastService.success('Evento criado com sucesso!');
              console.log('Event created successfully:', createdEvent);

              // Redirect after success
              setTimeout(() => {
                this.router.navigate(['/events']);
              }, 2000);
            },
            error: (error) => {
              this.isLoading = false;
              console.error('Error creating event:', error);
              this.handleSubmitError(error, 'criar');
            }
          });
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error fetching user profile:', error);
          this.errorMessage = 'Erro ao obter informações do usuário. Faça login novamente.';
          this.showError = true;
          this.toastService.error('Erro ao obter informações do usuário');

          // Redirect to login if user is not authenticated
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        }
      });
    }
  }

  /**
   * Handle submit errors with appropriate messages
   */
  private handleSubmitError(error: any, action: string) {
    // Extract error message from different possible sources
    if (error.error?.message) {
      this.errorMessage = error.error.message;
    } else if (error.error?.error) {
      this.errorMessage = error.error.error;
    } else if (error.status === 0) {
      this.errorMessage = 'Sem conexão com a internet. Verifique sua conexão e tente novamente.';
    } else if (error.status === 400) {
      this.errorMessage = 'Dados inválidos. Verifique os campos e tente novamente.';
    } else if (error.status === 401 || error.status === 403) {
      this.errorMessage = 'Você não tem permissão para ' + action + ' eventos. Faça login novamente.';
    } else if (error.status === 404) {
      this.errorMessage = 'Evento não encontrado.';
    } else if (error.status === 409) {
      this.errorMessage = 'Conflito ao ' + action + ' evento. O evento pode ter sido modificado por outro usuário.';
    } else if (error.status === 500) {
      this.errorMessage = 'Erro no servidor ao ' + action + ' evento. Tente novamente mais tarde.';
    } else {
      this.errorMessage = 'Erro ao ' + action + ' evento. Verifique os dados e tente novamente.';
    }
    
    this.showError = true;
    this.toastService.error(this.errorMessage);
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
      this.location.back();
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
