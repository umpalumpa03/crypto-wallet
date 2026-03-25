import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  computed,
  WritableSignal,
  Signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs/operators';
import { AuthResponse } from '../../core/models/auth.model';

@Component({
  selector: 'app-auth',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Auth {
  private fb: FormBuilder = inject(FormBuilder);
  private authService: AuthService = inject(AuthService);

  protected isLoginMode: WritableSignal<boolean> = signal<boolean>(true);
  protected isLoading: WritableSignal<boolean> = signal<boolean>(false);
  protected errorMessage: WritableSignal<string | null> = signal<string | null>(null);
  protected showPassword: WritableSignal<boolean> = signal<boolean>(false);

  protected loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected registerForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    terms: [false, [Validators.requiredTrue]],
  });

  private passwordValue: Signal<string | undefined> = toSignal(
    this.registerForm.get('password')!.valueChanges.pipe(
      startWith(this.registerForm.get('password')?.value || ''),
      map((v: string) => v as string),
    ),
  );

  protected passwordStrength: Signal<number> = computed((): number => {
    const password: string = this.passwordValue() || '';
    if (!password) return 0;

    let score: number = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    return score;
  });

  protected strengthText: Signal<string> = computed((): string => {
    const score: number = this.passwordStrength();
    if (score === 0) return 'Weak';
    if (score === 1) return 'Moderate';
    if (score === 2) return 'Strong';
    if (score === 3) return 'Robust';
    return 'Ethereal';
  });

  protected entropyBits: Signal<number> = computed((): number => {
    const password: string = this.passwordValue() || '';
    return Math.floor(password.length * 4.5);
  });

  public toggleMode(): void {
    this.isLoginMode.update((mode: boolean) => !mode);
    this.errorMessage.set(null);
    this.showPassword.set(false);
  }

  public togglePassword(): void {
    this.showPassword.update((show: boolean) => !show);
  }

  public onLogin(): void {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.loginForm.value).subscribe({
      next: (): void => this.isLoading.set(false),
      error: (err: any): void => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Login failed. Check your credentials.');
      },
    });
  }

  public onRegister(): void {
    if (this.registerForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { terms, ...registerData }: any = this.registerForm.value;

    this.authService.register(registerData).subscribe({
      next: (): void => this.isLoading.set(false),
      error: (err: any): void => {
        this.isLoading.set(false);
        const msg: string = Array.isArray(err.error?.message)
          ? err.error.message[0]
          : err.error?.message;
        this.errorMessage.set(msg || 'Registration failed.');
      },
    });
  }
}
