import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Transaction } from '../transactions/data/transaction.models';
import { TransactionService } from '../transactions/data/transaction.service';
import { Goal } from '../goals/data/goal.models';
import { GoalService } from '../goals/data/goal.service';
import { PredictionResponse } from '../insights/data/ai.models';
import { PredictionService } from '../insights/data/prediction.service';
import {
  CategorySlice,
  DashboardSummary,
  MonthlyPoint,
} from './data/dashboard.models';
import { DashboardService } from './data/dashboard.service';
import { DashboardPageComponent } from './dashboard-page.component';

const SUMMARY: DashboardSummary = {
  income: 1240,
  expense: 847.32,
  balance: 392.68,
  transactionCount: 14,
};

const MONTHLY: MonthlyPoint[] = [
  { period: '2026-04', total: 800, current: false },
  { period: '2026-05', total: 847.32, current: true },
];

const CATEGORIES: CategorySlice[] = [
  { category: 'Restos', total: 220 },
  { category: 'Courses', total: 180 },
];

const TX: Transaction[] = [
  {
    id: 't1',
    amount: 62.4,
    date: '2026-05-26',
    description: 'Monoprix — courses',
    type: 'expense',
    source: 'manual',
    categoryId: 'c1',
    accountId: 'a1',
    note: null,
  },
  {
    id: 't2',
    amount: 1240,
    date: '2026-05-02',
    description: 'Alternance Capgemini',
    type: 'income',
    source: 'openbanking',
    categoryId: 'c2',
    accountId: 'a1',
    note: null,
  },
];

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
];

describe('DashboardPageComponent', () => {
  let fixture: ComponentFixture<DashboardPageComponent>;
  let dashSpy: jasmine.SpyObj<DashboardService>;

  beforeEach(async () => {
    dashSpy = jasmine.createSpyObj<DashboardService>('DashboardService', [
      'summary',
      'monthly',
      'categoryBreakdown',
    ]);
    dashSpy.summary.and.returnValue(of(SUMMARY));
    dashSpy.monthly.and.returnValue(of(MONTHLY));
    dashSpy.categoryBreakdown.and.returnValue(of(CATEGORIES));

    const txSpy = jasmine.createSpyObj<TransactionService>(
      'TransactionService',
      ['search'],
    );
    txSpy.search.and.returnValue(of(TX));

    const goalSpy = jasmine.createSpyObj<GoalService>('GoalService', ['list']);
    goalSpy.list.and.returnValue(of(GOALS));

    const predictionSpy = jasmine.createSpyObj<PredictionService>(
      'PredictionService',
      ['endOfMonth'],
    );
    const PREDICTION: PredictionResponse = {
      forecastDate: '2026-05-31',
      predictedBalance: 420,
      lowConfidence: false,
      anomalies: [],
    };
    predictionSpy.endOfMonth.and.returnValue(of(PREDICTION));

    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        provideRouter([]),
        { provide: DashboardService, useValue: dashSpy },
        { provide: TransactionService, useValue: txSpy },
        { provide: GoalService, useValue: goalSpy },
        { provide: PredictionService, useValue: predictionSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
  });

  it('loads KPIs from DashboardService.summary and renders the balance/income/expense tiles', () => {
    expect(dashSpy.summary).toHaveBeenCalledTimes(1);
    const tiles = fixture.nativeElement.querySelectorAll('.stats .stat');
    expect(tiles.length).toBe(3);
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Solde du mois');
    expect(text).toContain('Revenus');
    expect(text).toContain('Dépenses');
  });

  it('renders the recent transactions from TransactionService.search (size 6)', () => {
    const args = (
      TestBed.inject(TransactionService).search as jasmine.Spy
    ).calls.mostRecent().args[0];
    expect(args.size).toBe(6);
    const rows = fixture.nativeElement.querySelectorAll('.txn-row');
    expect(rows.length).toBe(TX.length);
    expect(fixture.nativeElement.textContent).toContain('Monoprix — courses');
  });

  it('renders mini goal tiles from GoalService.list', () => {
    const goals = fixture.nativeElement.querySelectorAll('.goal-mini');
    expect(goals.length).toBe(GOALS.length);
    expect(fixture.nativeElement.textContent).toContain('Voyage à Lisbonne');
  });

  it('renders the category breakdown bars from DashboardService.categoryBreakdown', () => {
    expect(dashSpy.categoryBreakdown).toHaveBeenCalledTimes(1);
    const rows = fixture.nativeElement.querySelectorAll('.cat-row');
    expect(rows.length).toBe(CATEGORIES.length);
    // largest slice gets the Or lead style
    expect(fixture.nativeElement.querySelector('.cat-fill.lead')).toBeTruthy();
  });
});
