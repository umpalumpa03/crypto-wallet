import { Component, ChangeDetectionStrategy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './auth.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Auth {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  protected isLoginMode = signal<boolean>(true);
  protected isLoading = signal<boolean>(false);
  protected errorMessage = signal<string | null>(null);
  protected showPassword = signal<boolean>(false);

  protected loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected registerForm = this.fb.group({
    fullName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    terms: [false, [Validators.requiredTrue]],
  });

  // Track password changes as a signal so 'computed' can react to it
  private passwordValue = toSignal(
    this.registerForm.get('password')!.valueChanges.pipe(
      startWith(this.registerForm.get('password')?.value || ''),
      map(v => v as string)
    )
  );

  protected passwordStrength = computed(() => {
    const password = this.passwordValue() || '';
    if (!password) return 0;

    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    return score;
  });

  protected strengthText = computed(() => {
    const score = this.passwordStrength();
    if (score === 0) return 'Weak';
    if (score === 1) return 'Moderate';
    if (score === 2) return 'Strong';
    if (score === 3) return 'Robust';
    return 'Ethereal';
  });

  protected entropyBits = computed(() => {
    const password = this.passwordValue() || '';
    return Math.floor(password.length * 4.5);
  });

  public toggleMode(): void {
    this.isLoginMode.update((mode) => !mode);
    this.errorMessage.set(null);
    this.showPassword.set(false);
  }

  public togglePassword(): void {
    this.showPassword.update((show) => !show);
  }

  public onLogin(): void {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.loginForm.value).subscribe({
      next: () => this.isLoading.set(false),
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Login failed. Check your credentials.');
      },
    });
  }

  public onRegister(): void {
    if (this.registerForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    // FIX: Remove 'terms' property before sending to backend
    // Backend uses 'forbidNonWhitelisted' and will reject if 'terms' is present
    const { terms, ...registerData } = this.registerForm.value;

    this.authService.register(registerData).subscribe({
      next: () => this.isLoading.set(false),
      error: (err) => {
        this.isLoading.set(false);
        const msg = Array.isArray(err.error?.message) ? err.error.message[0] : err.error?.message;
        this.errorMessage.set(msg || 'Registration failed.');
      },
    });
  }
}
