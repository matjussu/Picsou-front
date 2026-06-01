import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Goal } from './data/goal.models';
import { GoalService } from './data/goal.service';
import { GoalsPageComponent } from './goals-page.component';

const GOALS: Goal[] = [
  {
    id: 'g1',
    name: 'Voyage à Lisbonne',
    targetAmount: 1500,
    currentAmount: 920,
    deadline: '2026-08-01',
    template: 'travel',
    completed: false,
    progressPercent: 61,
  },
  {
    id: 'g2',
    name: 'Réserve de précaution',
    targetAmount: 1000,
    currentAmount: 1000,
    deadline: null,
    template: 'savings',
    completed: true,
    progressPercent: 100,
  },
];

describe('GoalsPageComponent', () => {
  let fixture: ComponentFixture<GoalsPageComponent>;
  let goalSpy: jasmine.SpyObj<GoalService>;

  beforeEach(async () => {
    goalSpy = jasmine.createSpyObj<GoalService>('GoalService', ['list', 'create']);
    goalSpy.list.and.returnValue(of(GOALS));

    await TestBed.configureTestingModule({
      imports: [GoalsPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        { provide: GoalService, useValue: goalSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GoalsPageComponent);
    fixture.detectChanges();
  });

  it('loads goals from GoalService.list on init and renders one card per goal', () => {
    expect(goalSpy.list).toHaveBeenCalledTimes(1);
    const cards = fixture.nativeElement.querySelectorAll('.goal-card');
    expect(cards.length).toBe(GOALS.length);
    expect(fixture.nativeElement.textContent).toContain('Voyage à Lisbonne');
    expect(fixture.nativeElement.textContent).toContain('Réserve de précaution');
  });

  it('shows the total saved (sum of currentAmount) and a completed badge for a reached goal', () => {
    // 920 + 1000 = 1920 € → "1 920,00 €"
    expect(fixture.componentInstance.totalSaved()).toContain('920');
    expect(fixture.componentInstance.completedCount()).toBe(1);
    // a completed goal renders its pct as done (Atteint / 100 %)
    expect(fixture.nativeElement.querySelector('.goal-pct.done')).toBeTruthy();
  });
});
