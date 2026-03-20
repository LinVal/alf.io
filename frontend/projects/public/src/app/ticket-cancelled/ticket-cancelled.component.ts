import {Component} from '@angular/core';
import {Router} from '@angular/router';

@Component({
  selector: 'app-ticket-cancelled',
  templateUrl: './ticket-cancelled.component.html'
})
export class TicketCancelledComponent {
  constructor(private router: Router) {}

  goToEvents(): void {
    this.router.navigate(['events-all']);
  }
}
