import { Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logout-modal',

  imports: [CommonModule],
  templateUrl: './logout-modal.html',
  styleUrl: './logout-modal.scss',
})
export class LogoutModal {
  public readonly confirm = output<void>();
  public readonly cancel = output<void>();

  public onConfirm(): void {
    this.confirm.emit();
  }
  public onCancel(): void {
    this.cancel.emit();
  }
}
