import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-markets',
  imports: [CommonModule],
  templateUrl: './markets.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Markets {
  // We will inject your NestJS WebSockets here later for live price updates!
}
