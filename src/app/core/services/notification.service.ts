import { Injectable, signal, computed } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private notificationsSignal = signal<AppNotification[]>([]);
  public readonly notifications = this.notificationsSignal.asReadonly();

  public show(message: string, type: NotificationType = 'info', duration: number = 5000): void {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotification: AppNotification = { id, type, message, duration };

    this.notificationsSignal.update((prev) => [...prev, newNotification]);

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  public success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  public error(message: string, duration?: number): void {
    this.show(message, 'error', duration);
  }

  public info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  public warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }

  public remove(id: string): void {
    this.notificationsSignal.update((prev) => prev.filter((n) => n.id !== id));
  }
}
