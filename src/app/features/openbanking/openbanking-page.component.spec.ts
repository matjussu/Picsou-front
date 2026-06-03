import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import {
  BankConnection,
  Institution,
} from './data/openbanking.models';
import { OpenBankingService } from './data/openbanking.service';
import { OpenBankingPageComponent } from './openbanking-page.component';

const INSTITUTIONS: Institution[] = [
  { slug: 'revolut', name: 'Revolut', brandColor: '#0666EB' },
  { slug: 'n26', name: 'N26', brandColor: '#36B49F' },
];

const CONNECTION: BankConnection = {
  id: 'conn-1',
  institutionSlug: 'revolut',
  institutionName: 'Revolut',
  brandColor: '#0666EB',
  status: 'active',
  accountId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee4821',
  transactionsImported: 12,
  lastSyncAt: '2026-06-03T08:00:00Z',
  connectedAt: '2026-06-03T08:00:00Z',
};

function setup(connections: BankConnection[]) {
  const spy = jasmine.createSpyObj<OpenBankingService>('OpenBankingService', [
    'institutions',
    'connections',
    'connect',
    'sync',
    'disconnect',
  ]);
  spy.connections.and.returnValue(of(connections));
  spy.institutions.and.returnValue(of(INSTITUTIONS));
  spy.connect.and.returnValue(of(CONNECTION));
  spy.sync.and.returnValue(
    of({ connectionId: 'conn-1', transactionsImported: 0, syncedAt: '' }),
  );
  spy.disconnect.and.returnValue(of(void 0));
  return spy;
}

async function createFixture(
  spy: jasmine.SpyObj<OpenBankingService>,
): Promise<ComponentFixture<OpenBankingPageComponent>> {
  await TestBed.configureTestingModule({
    imports: [OpenBankingPageComponent],
    providers: [
      provideRouter([]),
      { provide: OpenBankingService, useValue: spy },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(OpenBankingPageComponent);
  fixture.detectChanges();
  return fixture;
}

describe('OpenBankingPageComponent', () => {
  it('loads connections on init and shows the empty state when none', async () => {
    const spy = setup([]);
    const fixture = await createFixture(spy);
    expect(spy.connections).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain(
      'Aucune banque connectée',
    );
  });

  it('renders a card per connection with masked account and tx count', async () => {
    const spy = setup([CONNECTION]);
    const fixture = await createFixture(spy);
    const cards = fixture.nativeElement.querySelectorAll('.conn-card');
    expect(cards.length).toBe(1);
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Revolut');
    expect(text).toContain('····4821'); // 4 derniers hex de l'accountId
    expect(text).toContain('12 transactions');
    expect(text).toContain('Connecté');
  });

  it('opens the chooser and lists institutions from the backend', async () => {
    const spy = setup([CONNECTION]);
    const fixture = await createFixture(spy);
    fixture.componentInstance.openChooser();
    fixture.detectChanges();
    expect(spy.institutions).toHaveBeenCalledTimes(1);
    const rows = fixture.nativeElement.querySelectorAll('.bank-row');
    expect(rows.length).toBe(INSTITUTIONS.length);
  });

  it('connects a bank then reaches the done step and reloads connections', async () => {
    const spy = setup([]);
    const fixture = await createFixture(spy);
    const c = fixture.componentInstance;
    c.openChooser();
    c.selectBank(INSTITUTIONS[0]);
    c.authorize(INSTITUTIONS[0]);
    expect(spy.connect).toHaveBeenCalledWith('revolut');
    expect(c.modal()?.step).toBe('done');
    // 1 au init + 1 après connexion réussie
    expect(spy.connections).toHaveBeenCalledTimes(2);
  });

  it('resync calls the service and clears the busy state', async () => {
    const spy = setup([CONNECTION]);
    const fixture = await createFixture(spy);
    fixture.componentInstance.resync(CONNECTION);
    expect(spy.sync).toHaveBeenCalledWith('conn-1');
    expect(fixture.componentInstance.busyId()).toBeNull();
  });
});
