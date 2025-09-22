import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { EventsPage } from './events-page';

describe('EventsPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, EventsPage],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(EventsPage);
    const comp = fixture.componentInstance;
    expect(comp).toBeTruthy();
  });

  it('should render cards', () => {
    const fixture = TestBed.createComponent(EventsPage);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.card').length).toBeGreaterThan(0);
  });
});
