import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterModule, ChildrenOutletContexts } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { PortfolioStore } from '../../core/store/portfolio.store';
import { LogoutModal } from '../../shared/components/logout-modal/logout-modal';
import { routeAnimations } from '../../shared/animations/route-animations';

@Component({
  selector: 'app-main-layout',

  imports: [RouterModule, CommonModule, LogoutModal],
  templateUrl: './main-layout.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [routeAnimations],
})
export class MainLayout implements OnInit {
  protected authService = inject(AuthService);
  protected portfolioStore = inject(PortfolioStore);
  private contexts = inject(ChildrenOutletContexts);

  public showLogoutConfirm = signal<boolean>(false);

  public getRouteAnimationData() {
    return this.contexts.getContext('primary')?.route?.snapshot?.data?.['animation'];
  }

  ngOnInit() {
    this.portfolioStore.loadPortfolio();
  }

  public onLogout(): void {
    this.showLogoutConfirm.set(true);
  }

  public confirmLogout(): void {
    this.authService.logout();
    this.showLogoutConfirm.set(false);
  }

  public cancelLogout(): void {
    this.showLogoutConfirm.set(false);
  }
}
