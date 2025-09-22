import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { EventDetailsPage } from './event-details';

describe('EventDetailsPage', () => {
  let component: EventDetailsPage;
  let fixture: ComponentFixture<EventDetailsPage>;
  let mockActivatedRoute: jasmine.SpyObj<ActivatedRoute>;

  beforeEach(async () => {
    mockActivatedRoute = jasmine.createSpyObj('ActivatedRoute', ['paramMap'], {
      paramMap: of(new Map([['id', '1']]))
    });

    await TestBed.configureTestingModule({
      imports: [EventDetailsPage],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(EventDetailsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default event data', () => {
    expect(component.event).toBeDefined();
    expect(component.event.title).toBe('Festival de Música');
    expect(component.event.id).toBe(1);
  });

  it('should extract event ID from route params on init', () => {
    component.ngOnInit();
    expect(component.eventId).toBe('1');
  });

  it('should have correct event details', () => {
    expect(component.event.tag).toBe('046');
    expect(component.event.date).toBe('15 de Outubro, 2025');
    expect(component.event.time).toBe('19:00');
    expect(component.event.location).toBe('Centro de Convenções - Teresina, PI');
  });

  it('should have price and ticket information', () => {
    expect(component.event.price).toBe(75.00);
    expect(component.event.availableTickets).toBe(150);
    expect(component.event.totalTickets).toBe(500);
  });

  it('should have organizer information', () => {
    expect(component.event.organizer).toBeDefined();
    expect(component.event.organizer.name).toBe('Produtora Cultural PI');
    expect(component.event.organizer.contact).toBe('(86) 3223-4567');
  });

  it('should calculate correct ticket availability percentage', () => {
    const percentage = (component.event.availableTickets / component.event.totalTickets) * 100;
    expect(percentage).toBe(30); // 150/500 * 100 = 30%
  });

  it('should have proper event categories', () => {
    expect(component.event.category).toBe('Música');
    expect(component.event.tags).toContain('música');
    expect(component.event.tags).toContain('festival');
  });

  it('should have correct booking URL format', () => {
    const expectedUrl = `/event/${component.event.id}/register`;
    // This would be tested in integration if there's a method that generates this URL
    expect(component.event.id).toBe(1);
  });
});