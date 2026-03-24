import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logout-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-surface/80 backdrop-blur-md" (click)="onCancel()"></div>

      <!-- Modal Card -->
      <div class="relative w-full max-w-md bg-surface-container-lowest border border-outline-variant/10 rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
        
        <!-- Top Aurora Glow -->
        <div class="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-error/10 blur-[60px] pointer-events-none"></div>

        <div class="p-8 relative z-10">
          <!-- Icon -->
          <div class="w-16 h-16 bg-error/10 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-error/20">
            <span class="material-symbols-outlined text-error text-3xl" style="font-variation-settings: 'FILL' 1;">power_settings_new</span>
          </div>

          <!-- Content -->
          <div class="text-center mb-8">
            <h2 class="font-headline text-2xl font-bold text-on-surface mb-2">Terminate Session?</h2>
            <p class="text-on-surface-variant text-sm leading-relaxed">
              You are about to disconnect from the secure ledger. All real-time market streams will be terminated.
            </p>
          </div>

          <!-- Actions -->
          <div class="grid grid-cols-2 gap-4">
            <button 
              (click)="onCancel()"
              class="py-3.5 px-6 rounded-xl border border-outline-variant/20 text-on-surface font-label text-sm font-bold hover:bg-surface-container-high transition-all active:scale-[0.98]">
              Cancel
            </button>
            <button 
              (click)="onConfirm()"
              class="py-3.5 px-6 rounded-xl bg-error text-on-error font-label text-sm font-bold shadow-lg shadow-error/20 hover:brightness-110 transition-all active:scale-[0.98]">
              Logout
            </button>
          </div>
        </div>

        <!-- Security Badge -->
        <div class="bg-surface-container-low px-8 py-3 flex items-center justify-center gap-2 border-t border-outline-variant/5">
          <span class="material-symbols-outlined text-[14px] text-outline-variant">shield_lock</span>
          <span class="text-[10px] font-bold uppercase tracking-widest text-outline-variant">Secure Session Management</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-scale-up {
      animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    @keyframes scaleUp {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
  `]
})
export class LogoutModal {
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm() { this.confirm.emit(); }
  onCancel() { this.cancel.emit(); }
}
