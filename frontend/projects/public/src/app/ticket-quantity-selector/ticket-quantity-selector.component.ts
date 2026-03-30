import {Component, EventEmitter, Input, OnDestroy, Output} from '@angular/core';
import {TicketCategory} from '../model/ticket-category';
import {UntypedFormGroup} from '@angular/forms';
import {TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'app-ticket-quantity-selector',
  templateUrl: './ticket-quantity-selector.html'
})
export class TicketQuantitySelectorComponent implements OnDestroy {

  @Input()
  parentGroup: UntypedFormGroup;

  @Input()
  category: TicketCategory;

  @Input()
  quantityRange: number[];

  @Input()
  refreshInProgress: boolean = false;

  @Output()
  valueChange = new EventEmitter<number>();

  @Output()
  refreshCommand = new EventEmitter<number>();

  formGroup: UntypedFormGroup;
  refreshCooldown = false;
  private cooldownTimeout: ReturnType<typeof setTimeout>;

  constructor(public translate: TranslateService) {}

  selectionChanged(): void {
    this.valueChange.next(this.parentGroup.get('amount').value);
  }

  refreshCategories(): void {
    if (this.refreshCooldown || this.refreshInProgress) {
      return;
    }
    this.refreshCommand.next(new Date().getTime());
    this.refreshCooldown = true;
    this.cooldownTimeout = setTimeout(() => {
      this.refreshCooldown = false;
    }, 5000);
  }

  ngOnDestroy(): void {
    clearTimeout(this.cooldownTimeout);
  }
}
