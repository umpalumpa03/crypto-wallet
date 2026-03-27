import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_URL } from '../../environments/environment';

const WARMUP_KEY = 'aurora_backend_warmed_up';
const WARMUP_EXPIRY = 5 * 60 * 1000; // 5 minutes

let isWarmingUp = false;

export const warmupInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  
  if (req.url.startsWith(API_URL)) {
    const lastWarmup = localStorage.getItem(WARMUP_KEY);
    const now = Date.now();

    if (!isWarmingUp && (!lastWarmup || now - parseInt(lastWarmup) > WARMUP_EXPIRY)) {
      isWarmingUp = true;
      
      
      
      
      fetch(`${API_URL}/health`, { mode: 'no-cors' }).catch(() => {});
      
      localStorage.setItem(WARMUP_KEY, now.toString());
      
      
      setTimeout(() => { isWarmingUp = false; }, 2000);
    }
  }

  return next(req);
};
