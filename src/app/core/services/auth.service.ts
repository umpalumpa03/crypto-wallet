import {
  Injectable,
  inject,
  signal,
  WritableSignal,
  Injector,
  runInInjectionContext,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { API_URL } from '../../environments/environment';
import { AuthResponse, User } from '../models/auth.model';
import { Observable } from 'rxjs';
import { PortfolioStore } from '../store/portfolio.store';
import { TradeStore } from '../store/trade.store';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http: HttpClient = inject(HttpClient);
  private router: Router = inject(Router);
  private injector: Injector = inject(Injector);
  private apiUrl: string = `${API_URL}/auth`;

  public currentUser: WritableSignal<User | null> = signal<User | null>(null);

  constructor() {
    const token: string | null = localStorage.getItem('token');
    const user: string | null = localStorage.getItem('user');
    if (token && user) {
      this.currentUser.set(JSON.parse(user) as User);
    }
  }

  public register(data: object): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/register`, data)
      .pipe(tap((res: AuthResponse) => this.handleAuthSuccess(res)));
  }

  public login(data: object): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, data)
      .pipe(tap((res: AuthResponse) => this.handleAuthSuccess(res)));
  }

  public logout(): void {
    const keysToRemove = [
      'token',
      'user',
      'crypto_token',
      'aurora_trade_state',
      'aurora_market_state',
    ];

    keysToRemove.forEach((key) => localStorage.removeItem(key));

    runInInjectionContext(this.injector, () => {
      const portfolioStore = inject(PortfolioStore);
      const tradeStore = inject(TradeStore);
      portfolioStore.clear();
      tradeStore.clear();
    });

    this.currentUser.set(null);
    this.router.navigate(['/auth']);
  }
  private handleAuthSuccess(res: AuthResponse): void {
    localStorage.setItem('token', res.access_token);
    localStorage.setItem('user', JSON.stringify(res.user));
    this.currentUser.set(res.user);
    this.router.navigate(['/dashboard']);
  }

  public getToken(): string | null {
    return localStorage.getItem('token');
  }

  public isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
