import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ledger',
  imports: [CommonModule],
  templateUrl: './ledger.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Ledger {}
