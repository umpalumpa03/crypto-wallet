import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './auth.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Auth {
  protected isLoginMode = signal<boolean>(true);

  public toggleMode(): void {
    this.isLoginMode.update((mode) => !mode);
  }
}
