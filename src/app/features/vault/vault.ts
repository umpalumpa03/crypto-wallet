import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vault',
  imports: [CommonModule],
  templateUrl: './vault.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Vault {}
