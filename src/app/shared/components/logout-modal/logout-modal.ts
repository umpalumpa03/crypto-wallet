import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logout-modal',
  imports: [CommonModule],
  templateUrl: './logout-modal.html',
  styleUrl: './logout-modal.scss',
})
export class LogoutModal {
  @Output() public confirm = new EventEmitter<void>();
  @Output() public cancel = new EventEmitter<void>();

  public onConfirm() {
    this.confirm.emit();
  }
  public onCancel() {
    this.cancel.emit();
  }
}
