import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { CreateEventComponent } from './create-event';

describe('CreateEventComponent', () => {
  let component: CreateEventComponent;
  let fixture: ComponentFixture<CreateEventComponent>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [CreateEventComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(CreateEventComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default form values', () => {
    expect(component.eventForm.title).toBe('');
    expect(component.eventForm.description).toBe('');
    expect(component.eventForm.category).toBe('');
    expect(component.currentStep).toBe(1);
    expect(component.totalSteps).toBe(3);
  });

  it('should validate required fields', () => {
    component.eventForm.title = '';
    component.eventForm.description = '';
    component.eventForm.category = '';
    
    const isValid = component.validateStep1();
    expect(isValid).toBeFalsy();
    expect(component.showError).toBeTruthy();
  });

  it('should proceed to next step when step 1 is valid', () => {
    component.eventForm.title = 'Test Event';
    component.eventForm.description = 'Test Description';
    component.eventForm.category = 'Tecnologia';
    component.eventForm.date = '2025-12-31';
    component.eventForm.time = '19:00';
    component.eventForm.location = 'Test Location';
    
    component.nextStep();
    expect(component.currentStep).toBe(2);
  });

  it('should go back to previous step', () => {
    component.currentStep = 2;
    component.prevStep();
    expect(component.currentStep).toBe(1);
  });

  it('should add tag to tags array', () => {
    component.newTag = 'música';
    component.addTag();
    expect(component.eventForm.tags).toContain('música');
    expect(component.newTag).toBe('');
  });

  it('should remove tag from tags array', () => {
    component.eventForm.tags = ['música', 'festival'];
    component.removeTag(0);
    expect(component.eventForm.tags).toEqual(['festival']);
  });

  it('should handle file selection', () => {
    const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
    const mockEvent = {
      target: { files: [mockFile] }
    } as any;

    component.onFileSelected(mockEvent);
    expect(component.eventForm.image).toBe(mockFile);
  });

  it('should submit form successfully with valid data', () => {
    // Setup valid form data
    component.eventForm = {
      title: 'Test Event',
      description: 'Test Description',
      category: 'Tecnologia',
      date: '2025-12-31',
      time: '19:00',
      location: 'Test Location',
      address: 'Test Address',
      price: 50,
      maxParticipants: 100,
      organizerName: 'Test Organizer',
      organizerEmail: 'test@example.com',
      organizerPhone: '(86) 99999-9999',
      image: null,
      tags: ['teste'],
      requiresApproval: false,
      isPublic: true,
      allowWaitlist: false
    };

    spyOn(component, 'submitEvent').and.callThrough();
    component.submitEvent();
    
    expect(component.isLoading).toBeTruthy();
  });
});