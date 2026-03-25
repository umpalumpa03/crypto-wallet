import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const notificationService = inject(NotificationService);
  const token = authService.getToken();

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected error occurred';

      if (error.error instanceof ErrorEvent) {
        
        errorMessage = error.error.message;
      } else {
        
        errorMessage = error.error?.message || error.message || errorMessage;

        if (error.status === 401) {
          authService.logout();
          if (!req.url.includes('/auth/login') && !req.url.includes('/auth/register')) {
            notificationService.error('Session expired. Please login again.');
          }
        } else if (error.status === 403) {
          notificationService.error('You do not have permission to perform this action.');
        } else if (error.status === 0) {
          notificationService.error('Could not connect to the server. Please check your connection.');
        } else {
          
          notificationService.error(errorMessage);
        }
      }

      return throwError(() => error);
    }),
  );
};
