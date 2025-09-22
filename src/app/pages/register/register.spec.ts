import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RegisterComponent } from './register';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default form values', () => {
    expect(component.registerForm.firstName).toBe('');
    expect(component.registerForm.lastName).toBe('');
    expect(component.registerForm.email).toBe('');
    expect(component.registerForm.password).toBe('');
    expect(component.registerForm.confirmPassword).toBe('');
    expect(component.registerForm.agreeTerms).toBeFalsy();
    expect(component.registerForm.receiveUpdates).toBeFalsy();
  });

  it('should validate email format', () => {
    expect(component.isValidEmail('test@example.com')).toBeTruthy();
    expect(component.isValidEmail('user@domain.co.uk')).toBeTruthy();
    expect(component.isValidEmail('invalid-email')).toBeFalsy();
    expect(component.isValidEmail('test@')).toBeFalsy();
    expect(component.isValidEmail('')).toBeFalsy();
  });

  it('should validate phone format', () => {
    expect(component.isValidPhone('(86) 99999-9999')).toBeTruthy();
    expect(component.isValidPhone('86999999999')).toBeTruthy();
    expect(component.isValidPhone('11987654321')).toBeTruthy();
    expect(component.isValidPhone('123')).toBeFalsy();
    expect(component.isValidPhone('')).toBeFalsy();
  });

  it('should validate password strength', () => {
    expect(component.isValidPassword('123456')).toBeTruthy(); // Minimum length
    expect(component.isValidPassword('StrongPass123!')).toBeTruthy();
    expect(component.isValidPassword('12345')).toBeFalsy(); // Too short
    expect(component.isValidPassword('')).toBeFalsy();
  });

  it('should check if passwords match', () => {
    component.registerForm.password = 'password123';
    component.registerForm.confirmPassword = 'password123';
    expect(component.passwordsMatch()).toBeTruthy();

    component.registerForm.confirmPassword = 'different';
    expect(component.passwordsMatch()).toBeFalsy();
  });

  it('should validate age (must be 18+)', () => {
    const today = new Date();
    const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    const seventeenYearsAgo = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());

    expect(component.isValidAge(eighteenYearsAgo.toISOString().split('T')[0])).toBeTruthy();
    expect(component.isValidAge(seventeenYearsAgo.toISOString().split('T')[0])).toBeFalsy();
  });

  it('should validate complete form with all required fields', () => {
    const today = new Date();
    const validBirthDate = new Date(today.getFullYear() - 25, 5, 15);

    component.registerForm = {
      firstName: 'João',
      lastName: 'Silva',
      email: 'joao@example.com',
      phone: '(86) 99999-9999',
      password: 'password123',
      confirmPassword: 'password123',
      birthDate: validBirthDate.toISOString().split('T')[0],
      agreeTerms: true,
      receiveUpdates: false
    };

    const isValid = component.validateForm();
    expect(isValid).toBeTruthy();
    expect(component.showError).toBeFalsy();
  });

  it('should fail validation with missing required fields', () => {
    component.registerForm = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      birthDate: '',
      agreeTerms: false,
      receiveUpdates: false
    };

    const isValid = component.validateForm();
    expect(isValid).toBeFalsy();
    expect(component.showError).toBeTruthy();
  });

  it('should fail validation with invalid email', () => {
    component.registerForm = {
      firstName: 'João',
      lastName: 'Silva',
      email: 'invalid-email',
      phone: '(86) 99999-9999',
      password: 'password123',
      confirmPassword: 'password123',
      birthDate: '1990-05-15',
      agreeTerms: true,
      receiveUpdates: false
    };

    const isValid = component.validateForm();
    expect(isValid).toBeFalsy();
    expect(component.errorMessage).toContain('E-mail inválido');
  });

  it('should fail validation when passwords do not match', () => {
    component.registerForm = {
      firstName: 'João',
      lastName: 'Silva',
      email: 'joao@example.com',
      phone: '(86) 99999-9999',
      password: 'password123',
      confirmPassword: 'different',
      birthDate: '1990-05-15',
      agreeTerms: true,
      receiveUpdates: false
    };

    const isValid = component.validateForm();
    expect(isValid).toBeFalsy();
    expect(component.errorMessage).toContain('senhas não coincidem');
  });

  it('should fail validation when terms are not agreed', () => {
    component.registerForm = {
      firstName: 'João',
      lastName: 'Silva',
      email: 'joao@example.com',
      phone: '(86) 99999-9999',
      password: 'password123',
      confirmPassword: 'password123',
      birthDate: '1990-05-15',
      agreeTerms: false,
      receiveUpdates: false
    };

    const isValid = component.validateForm();
    expect(isValid).toBeFalsy();
    expect(component.errorMessage).toContain('termos');
  });

  it('should toggle password visibility', () => {
    expect(component.showPassword).toBeFalsy();
    component.togglePasswordVisibility();
    expect(component.showPassword).toBeTruthy();
    component.togglePasswordVisibility();
    expect(component.showPassword).toBeFalsy();
  });

  it('should format phone number on input', () => {
    const event = {
      target: { value: '86999999999' }
    } as any;
    
    component.onPhoneInput(event);
    expect(component.registerForm.phone).toBe('(86) 99999-9999');
  });

  it('should show error message with timeout', (done) => {
    const message = 'Test error';
    component.showErrorMessage(message);
    
    expect(component.errorMessage).toBe(message);
    expect(component.showError).toBeTruthy();
    
    // Test that error disappears after timeout
    setTimeout(() => {
      expect(component.showError).toBeFalsy();
      done();
    }, 5100);
  });

  it('should navigate to login page', () => {
    component.navigateToLogin();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should submit form successfully with valid data', () => {
    const today = new Date();
    const validBirthDate = new Date(today.getFullYear() - 25, 5, 15);

    component.registerForm = {
      firstName: 'João',
      lastName: 'Silva',
      email: 'joao@example.com',
      phone: '(86) 99999-9999',
      password: 'password123',
      confirmPassword: 'password123',
      birthDate: validBirthDate.toISOString().split('T')[0],
      agreeTerms: true,
      receiveUpdates: false
    };

    spyOn(component, 'onSubmit').and.callThrough();
    component.onSubmit();
    
    expect(component.isLoading).toBeTruthy();
  });
});