import {Component, OnDestroy, OnInit} from '@angular/core';
import {EventService} from '../shared/event.service';
import {ActivatedRoute, Router} from '@angular/router';
import {BasicEventInfo} from '../model/basic-event-info';
import {Event as AlfioEvent} from '../model/event';
import {TicketCategory} from '../model/ticket-category';
import {I18nService} from '../shared/i18n.service';
import {Language, TermsPrivacyLinksContainer} from '../model/event';
import {TranslateService} from '@ngx-translate/core';
import {AnalyticsService} from '../shared/analytics.service';
import {InfoService} from '../shared/info.service';
import {Observable, of, zip} from 'rxjs';
import {catchError, mergeMap} from 'rxjs/operators';
import {SubscriptionService} from '../shared/subscription.service';
import {BasicSubscriptionInfo} from '../model/subscription';
import {SearchParams} from '../model/search-params';
import {globalTermsPrivacyLinks, Info} from '../model/info';
import {filterAvailableLanguages} from '../model/purchase-context';
import {FormBuilder, FormGroup, UntypedFormGroup} from '@angular/forms';

// Baserat på din EventService
interface ItemsByCategory {
  ticketCategories: TicketCategory[];
  expiredCategories?: TicketCategory[];
  additionalServices: any[];
  preSales?: any;
  waitingList?: any;
  ticketCategoriesForWaitingList?: any;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {

  event: AlfioEvent | null = null;
  ticketCategories: TicketCategory[] = [];
  expiredCategories: TicketCategory[] = [];
  events: BasicEventInfo[] = [];
  allEvents: BasicEventInfo[] = [];
  subscriptions: BasicSubscriptionInfo[] = [];
  allSubscriptions: BasicSubscriptionInfo[] = [];
  languages: Language[] = [];
  linksContainer: TermsPrivacyLinksContainer | null = null;
  reservationForm: FormGroup;
  supplementCategories: any[] = [];
  donationCategories: any[] = [];
  preSales: any;
  waitingList: any;
  ticketCategoriesForWaitingList: any;
  ticketCategoryAmount: {[key: number]: number[]} = {};
  private searchParams?: SearchParams;
  private eventShortName?: string;
  private refreshInterval: any;

  constructor(
    private eventService: EventService,
    private subscriptionService: SubscriptionService,
    private i18nService: I18nService,
    private router: Router,
    public translate: TranslateService,
    private info: InfoService,
    private analytics: AnalyticsService,
    private route: ActivatedRoute,
    private formBuilder: FormBuilder) {
      // Initiera tomma formulär
      this.reservationForm = this.formBuilder.group({
        reservation: this.formBuilder.array([]),
        additionalService: this.formBuilder.array([]),
        captcha: null,
        promoCode: null
      });
    }

  public ngOnInit(): void {
    // Set up refresh interval to periodically check for ticket updates
    this.setupTicketRefresh();
    
    zip(this.route.params, this.route.queryParams).pipe(
      mergeMap(([pathParams, queryParams]) => {
        this.searchParams = SearchParams.fromQueryAndPathParams(queryParams, pathParams);
        this.eventShortName = pathParams['eventShortName'];

        // Hämta både event-lista och specifik event-info om eventShortName finns
        const itemsByCategoryObs: Observable<ItemsByCategory | null> = this.eventShortName ?
          this.eventService.getEventTicketsInfo(this.eventShortName).pipe(
            catchError(err => {
              console.error('Error fetching ticket categories:', err);
              return of(null);
            })
          ) :
          of(null);

        return zip(
          this.eventService.getEvents(this.searchParams).pipe(
            catchError(err => {
              console.error('Error fetching events:', err);
              return of([]);
            })
          ),
          itemsByCategoryObs,
          this.subscriptionService.getSubscriptions(this.searchParams).pipe(
            catchError(err => {
              console.error('Error fetching subscriptions:', err);
              return of([]);
            })
          ),
          this.info.getInfo().pipe(
            catchError(err => {
              console.error('Error fetching info:', err);
              // Return a minimal Info object with all required properties
              const defaultInfo: Info = {
                demoModeEnabled: false,
                devModeEnabled: false,
                prodModeEnabled: true,
                analyticsConfiguration: {
                  googleAnalyticsKey: null,
                  googleAnalyticsScrambledInfo: false,
                  clientId: null
                },
                walletConfiguration: { 
                  gWalletEnabled: false, 
                  passEnabled: false 
                },
                challengeConfiguration: { 
                  enabled: false 
                }
              };
              return of(defaultInfo);
            })
          ),
          this.i18nService.getAvailableLanguages().pipe(
            catchError(err => {
              console.error('Error fetching languages:', err);
              return of([]);
            })
          )
        );
      })
    ).subscribe({
      next: ([events, itemsByCategory, subscriptions, info, activeLanguages]) => {
        // Om vi bara har ett event och inga prenumerationer, navigera direkt till eventet
        if (events.length === 1 && subscriptions.length === 0 && !itemsByCategory) {
          this.router.navigate(['/event', events[0].shortName], {replaceUrl: true});
          return;
        }

        // Hantera events
        this.allEvents = events;
        this.events = events; // Visa alla events direkt

        // Hantera prenumerationer
        this.allSubscriptions = subscriptions;
        this.subscriptions = subscriptions; // Visa alla prenumerationer direkt

        // Ta bort analytics-konfigurationen som orsakade felet
        // Raden som orsakade felet har tagits bort härifrån

        // Konfigurera länkcontainer
        this.linksContainer = globalTermsPrivacyLinks(info);

        // Konfigurera språk
        const allPurchaseContexts = [...events, ...subscriptions];
        this.languages = filterAvailableLanguages(activeLanguages, allPurchaseContexts);

        // Hitta event baserat på eventShortName i URL
        if (this.eventShortName && events.length > 0) {
          const foundEvent = events.find(e => e.shortName === this.eventShortName);
          if (foundEvent) {
            this.event = foundEvent as AlfioEvent;
          }
        }

        // Hantera itemsByCategory om det finns
        if (itemsByCategory) {
          this.applyItemsByCat(itemsByCategory);
        }
      },
      error: (err) => {
        console.error('Error in subscribe:', err);
      }
    });

    this.i18nService.setPageTitle('event-list.header.title', null);
  }

  private applyItemsByCat(itemsByCat: ItemsByCategory) {
    if (!itemsByCat) return;

    try {
      this.ticketCategories = itemsByCat.ticketCategories || [];
      this.expiredCategories = itemsByCat.expiredCategories || [];

      this.ticketCategoryAmount = {};
      this.ticketCategories.forEach(tc => {
        if (tc && tc.id != null) {
          this.ticketCategoryAmount[tc.id] = [];
          const maxTickets = typeof tc.maximumSaleableTickets === 'number' ? tc.maximumSaleableTickets : 0;
          for (let i = 0; i <= maxTickets; i++) {
            this.ticketCategoryAmount[tc.id].push(i);
          }
        }
      });

      this.supplementCategories = (itemsByCat.additionalServices || []).filter(e => e && e.type === 'SUPPLEMENT');
      this.donationCategories = (itemsByCat.additionalServices || []).filter(e => e && e.type === 'DONATION');

      this.preSales = itemsByCat.preSales;
      this.waitingList = itemsByCat.waitingList;
      this.ticketCategoriesForWaitingList = itemsByCat.ticketCategoriesForWaitingList;

      this.createWaitingListFormIfNecessary();

      // Skapa formuläret för biljettreservation
      if (this.ticketCategories.length > 0) {
        this.reservationForm = this.formBuilder.group({
          reservation: this.formBuilder.array(this.createItems(this.ticketCategories)),
          additionalService: this.formBuilder.array([]),
          captcha: null,
          promoCode: null
        });
      }
    } catch (error) {
      console.error('Error in applyItemsByCat:', error);
    }
  }

  private createItems(ticketCategories: TicketCategory[]): UntypedFormGroup[] {
    if (!Array.isArray(ticketCategories)) return [];

    return ticketCategories
      .filter(category => category && category.id != null)
      .map(category => this.formBuilder.group({ticketCategoryId: category.id, amount: 0}));
  }

  private createWaitingListFormIfNecessary() {
    // Implementeras vid behov
  }

  // VIKTIGT: Denna metod orsakade felet. Den måste vara extra försiktig med null checks!
  ticketsLeftInCategory(category: TicketCategory | null | undefined): number | null {
    if (!category) return null;
    return (category.availableTickets !== undefined) ? category.availableTickets : null;
  }

  // VIKTIGT: Denna metod orsakade felet. Den måste vara extra försiktig med null checks!
  showTicketsLeftInCategory(category: TicketCategory | null | undefined): boolean {
    if (!category) return false;
    return (category.availableTickets !== undefined) && category.availableTickets > 0;
  }

  ticketsLeftCountVisible(): boolean {
    return !!this.event &&
           this.event.availableTicketsCount != null &&
           this.event.availableTicketsCount > 0 &&
           this.ticketCategories.every(tc => !tc.bounded);
  }

  get containsEvents(): boolean {
    return Array.isArray(this.events) && this.events.length > 0;
  }

  get displayViewAllEventsButton() {
    return Array.isArray(this.allEvents) && this.allEvents.length > 4;
  }

  get containsSubscriptions(): boolean {
    return Array.isArray(this.subscriptions) && this.subscriptions.length > 0;
  }

  get displayViewAllSubscriptionsButton() {
    return Array.isArray(this.allSubscriptions) && this.allSubscriptions.length > 4;
  }

  get allEventsPath(): Array<string> {
    if (this.searchParams?.organizerSlug != null) {
      return ['/o', this.searchParams.organizerSlug, 'events-all'];
    }
    return ['events-all'];
  }

  get allSubscriptionsPath(): Array<string> {
    if (this.searchParams?.organizerSlug != null) {
      return ['/o', this.searchParams.organizerSlug, 'subscriptions-all'];
    }
    return ['subscriptions-all'];
  }

  // Helper methods to calculate ticket availability
  getActualTicketCount(event: BasicEventInfo): number {
    // Get the ticket count directly from the event object, ensuring it's treated as a number
    if (event.availableTicketsCount != null) {
      // Make sure we're dealing with a numeric value by converting to Number if needed
      const ticketCount = typeof event.availableTicketsCount === 'number' ? 
        event.availableTicketsCount : Number(event.availableTicketsCount);
      
      return ticketCount > 0 ? ticketCount : 0;
    }
    return 0;
  }
  
  // Set up a refresh interval to periodically check for ticket updates
  private setupTicketRefresh(): void {
    // Refresh events data every 30 seconds to get updated ticket counts
    this.refreshInterval = setInterval(() => {
      if (this.searchParams) {
        this.eventService.getEvents(this.searchParams).subscribe({
          next: (events) => {
            this.allEvents = events;
            this.events = events; // Visa alla events vid uppdatering också
            console.log('Refreshed events data');
          },
          error: (err) => console.error('Error refreshing events:', err)
        });
      }
    }, 30000); // 30 seconds
  }
  
  // Clean up intervals on component destruction
  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}
