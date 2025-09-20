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
  
  @Input()
  ticketsLeft?: number;

  constructor(private translateService: TranslateService) { }

  ngOnInit(): void {
  }

  // Helper method to ensure we're always getting a numeric value
  public getTicketsLeft(): number {
    if (this.ticketsLeft !== undefined && this.ticketsLeft !== null) {
      return Number(this.ticketsLeft);
    }
    return 0;
  }

  public get isEventOnline(): boolean {
    return this.event.format === 'ONLINE';
  }

  get title(): string {
    return getLocalizedContent(this.event.title, this.translateService.currentLang);
  }

}
