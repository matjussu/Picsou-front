import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { AccountService } from './data/account.service';
import { CategoryService } from './data/category.service';
import {
  Account,
  Category,
  Transaction,
  TransactionFilters,
} from './data/transaction.models';
import { TransactionService } from './data/transaction.service';
import { TransactionsPageComponent } from './transactions-page.component';

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

const CATS: Category[] = [
  { id: 'c1', name: 'Courses', iconKey: 'bag', colorKey: null, isDefault: true, parentId: null },
  { id: 'c2', name: 'Salaire', iconKey: 'wallet', colorKey: null, isDefault: true, parentId: null },
];

const ACCS: Account[] = [
  { id: 'a1', name: 'BNP Paribas', type: 'bank', balance: 1000, currency: 'EUR' },
];

describe('TransactionsPageComponent', () => {
  let fixture: ComponentFixture<TransactionsPageComponent>;
  let txServiceSpy: jasmine.SpyObj<TransactionService>;

  beforeEach(async () => {
    txServiceSpy = jasmine.createSpyObj<TransactionService>('TransactionService', [
      'search',
      'create',
      'delete',
    ]);
    txServiceSpy.search.and.returnValue(of(TX));

    const catSpy = jasmine.createSpyObj<CategoryService>('CategoryService', ['list']);
    catSpy.list.and.returnValue(of(CATS));
    const accSpy = jasmine.createSpyObj<AccountService>('AccountService', ['list']);
    accSpy.list.and.returnValue(of(ACCS));

    await TestBed.configureTestingModule({
      imports: [TransactionsPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: TransactionService, useValue: txServiceSpy },
        { provide: CategoryService, useValue: catSpy },
        { provide: AccountService, useValue: accSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionsPageComponent);
    fixture.detectChanges();
  });

  it('fetches via the backend on init and renders one row per transaction', () => {
    expect(txServiceSpy.search).toHaveBeenCalledTimes(1);
    const rows = fixture.nativeElement.querySelectorAll('.txn-table tbody tr');
    expect(rows.length).toBe(TX.length);
    expect(fixture.nativeElement.textContent).toContain('Monoprix — courses');
  });

  it('re-fetches from the backend (no client-side filter) when a filter changes', () => {
    expect(txServiceSpy.search).toHaveBeenCalledTimes(1);

    fixture.componentInstance.setType('income');
    fixture.detectChanges();

    // A new search() call was issued with the updated filter — backend re-fetch, not array .filter().
    expect(txServiceSpy.search).toHaveBeenCalledTimes(2);
    const lastArgs = txServiceSpy.search.calls.mostRecent().args[0] as TransactionFilters;
    expect(lastArgs.type).toBe('income');
  });

  it('removing an active filter chip re-fetches with the filter cleared', () => {
    fixture.componentInstance.setAccount('a1');
    fixture.detectChanges();
    expect(txServiceSpy.search.calls.mostRecent().args[0]?.accountId).toBe('a1');

    fixture.componentInstance.removeFilter('accountId');
    fixture.detectChanges();
    expect(txServiceSpy.search).toHaveBeenCalledTimes(3);
    expect(txServiceSpy.search.calls.mostRecent().args[0]?.accountId).toBeNull();
  });

  it('renders income amounts with a + prefix and expenses as neutral', () => {
    const amounts = fixture.nativeElement.querySelectorAll('.col-amount .amount');
    const texts = Array.from(amounts).map((el) => (el as HTMLElement).textContent?.trim());
    expect(texts.some((t) => t?.startsWith('+'))).toBeTrue();
  });

  it('Période preset sends from/to to the backend (date filter is server-side) + active chip', () => {
    fixture.componentInstance.setPeriod('month');
    fixture.detectChanges();

    const args = txServiceSpy.search.calls.mostRecent().args[0] as TransactionFilters;
    expect(args.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(args.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(args.from! <= args.to!).toBeTrue();
    expect(
      fixture.componentInstance
        .activeChips()
        .some((c) => c.key === 'period' && c.label === 'Ce mois'),
    ).toBeTrue();
  });

  it('removing the Période chip clears from/to via a backend re-fetch', () => {
    fixture.componentInstance.setPeriod('30d');
    fixture.detectChanges();
    expect(txServiceSpy.search.calls.mostRecent().args[0]?.from).toBeTruthy();

    fixture.componentInstance.removeFilter('period');
    fixture.detectChanges();

    const args = txServiceSpy.search.calls.mostRecent().args[0] as TransactionFilters;
    expect(args.from).toBeNull();
    expect(args.to).toBeNull();
    expect(fixture.componentInstance.period()).toBeNull();
  });

  it('Montant min filter is sent to the backend (minAmount query param)', () => {
    fixture.componentInstance.setMinAmount(50);
    fixture.detectChanges();
    expect(txServiceSpy.search.calls.mostRecent().args[0]?.minAmount).toBe(50);
  });
});
