import {Component, Input, OnInit} from '@angular/core';
import {BasicEventInfo} from '../model/basic-event-info';
import {TranslateService} from '@ngx-translate/core';
import {Params} from '@angular/router';
import {getLocalizedContent} from '../shared/subscription.service';

@Component({
  selector: 'app-basic-event-info',
  templateUrl: './basic-event-info.component.html',
  styleUrls: ['./basic-event-info.component.scss']
})
export class BasicEventInfoComponent implements OnInit {

  @Input()
  event: BasicEventInfo;

  @Input()
  params: Params;

  constructor(private translateService: TranslateService) { }

  ngOnInit(): void {
  }

  public get availableTickets(): number | null {
    return this.event.availableTicketsCount ?? null;
  }

  public get isPreSales(): boolean {
    return !!this.event.preSales;
  }

  public get isSoldOut(): boolean {
    return !this.isPreSales && this.availableTickets === 0;
  }

  public get isAvailable(): boolean {
    return !this.isPreSales && this.availableTickets === null;
  }

  public get saleInceptionDate(): string {
    if (this.event.formattedSaleInceptionDate) {
      return this.event.formattedSaleInceptionDate[this.translateService.currentLang]
        || Object.values(this.event.formattedSaleInceptionDate)[0]
        || '';
    }
    return '';
  }

  public get isEventOnline(): boolean {
    return this.event.format === 'ONLINE';
  }

  get title(): string {
    return getLocalizedContent(this.event.title, this.translateService.currentLang);
  }

}
