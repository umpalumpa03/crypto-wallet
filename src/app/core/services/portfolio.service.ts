import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InstitutionalProfile } from '../models/portfolio.model';
import { API_URL } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PortfolioService {
  private http = inject(HttpClient);
  private apiUrl = `${API_URL}/portfolio/dashboard`;

  public getDashboardData(): Observable<InstitutionalProfile> {
    return this.http.get<InstitutionalProfile>(this.apiUrl);
  }
}
