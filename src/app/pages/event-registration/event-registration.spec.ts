import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { EventRegistrationComponent } from './event-registration';

describe('EventRegistrationComponent', () => {
  let component: EventRegistrationComponent;
  let fixture: ComponentFixture<EventRegistrationComponent>;
  let mockActivatedRoute: jasmine.SpyObj<ActivatedRoute>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockActivatedRoute = jasmine.createSpyObj('ActivatedRoute', ['paramMap'], {
      paramMap: of(new Map([['id', '1']]))
    });
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [EventRegistrationComponent],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(EventRegistrationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default form values', () => {
    expect(component.registrationForm.fullName).toBe('');
    expect(component.registrationForm.email).toBe('');
    expect(component.registrationForm.phone).toBe('');
    expect(component.registrationForm.agreeTerms).toBeFalsy();
  });

  it('should extract event ID from route params on init', () => {
    component.ngOnInit();
    expect(component.eventId).toBe('1');
  });

  it('should have default event information', () => {
    expect(component.event).toBeDefined();
    expect(component.event.title).toBe('Festival de Música');
    expect(component.event.price).toBe(75.00);
  });

  it('should validate email format', () => {
    expect(component.isValidEmail('test@example.com')).toBeTruthy();
    expect(component.isValidEmail('invalid-email')).toBeFalsy();
    expect(component.isValidEmail('')).toBeFalsy();
  });

  it('should validate phone format', () => {
    expect(component.isValidPhone('(86) 99999-9999')).toBeTruthy();
    expect(component.isValidPhone('86999999999')).toBeTruthy();
    expect(component.isValidPhone('123')).toBeFalsy();
  });

  it('should validate required fields', () => {
    component.registrationForm = {
      fullName: '',
      email: '',
      phone: '',
      occupation: '',
      company: '',
      dietaryRestrictions: '',
      comments: '',
      agreeTerms: false,
      receiveUpdates: false
    };

    const isValid = component.validateForm();
    expect(isValid).toBeFalsy();
    expect(component.showError).toBeTruthy();
  });

  it('should validate form with valid data', () => {
    component.registrationForm = {
      fullName: 'João Silva',
      email: 'joao@example.com',
      phone: '(86) 99999-9999',
      occupation: 'Desenvolvedor',
      company: 'Tech Corp',
      dietaryRestrictions: '',
      comments: '',
      agreeTerms: true,
      receiveUpdates: false
    };

    const isValid = component.validateForm();
    expect(isValid).toBeTruthy();
    expect(component.showError).toBeFalsy();
  });

  it('should require terms agreement', () => {
    component.registrationForm = {
      fullName: 'João Silva',
      email: 'joao@example.com',
      phone: '(86) 99999-9999',
      occupation: 'Desenvolvedor',
      company: 'Tech Corp',
      dietaryRestrictions: '',
      comments: '',
      agreeTerms: false, // Terms not agreed
      receiveUpdates: false
    };

    const isValid = component.validateForm();
    expect(isValid).toBeFalsy();
    expect(component.errorMessage).toContain('termos');
  });

  it('should show error message', () => {
    const message = 'Test error message';
    component.showErrorMessage(message);
    
    expect(component.errorMessage).toBe(message);
    expect(component.showError).toBeTruthy();
  });

  it('should format phone number', () => {
    expect(component.formatPhone('86999999999')).toBe('(86) 99999-9999');
    expect(component.formatPhone('(86) 99999-9999')).toBe('(86) 99999-9999');
  });

  it('should calculate total price correctly', () => {
    expect(component.getTotalPrice()).toBe(75.00); // Base price
    
    // If there were additional fees, they would be tested here
  });

  it('should submit registration with valid data', () => {
    component.registrationForm = {
      fullName: 'João Silva',
      email: 'joao@example.com',
      phone: '(86) 99999-9999',
      occupation: 'Desenvolvedor',
      company: 'Tech Corp',
      dietaryRestrictions: '',
      comments: '',
      agreeTerms: true,
      receiveUpdates: false
    };

    spyOn(component, 'onSubmit').and.callThrough();
    component.onSubmit();
    
    expect(component.isLoading).toBeTruthy();
  });
});