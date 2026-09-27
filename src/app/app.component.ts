import { CommonModule } from '@angular/common';
import { Component, inject , OnInit, OnDestroy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MockApiService } from './core/mock-api.service';
import { Router } from '@angular/router';
import { AuthService } from './core/auth.service';
import { Subscription } from 'rxjs';


@Component({
  selector: 'hen-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly api = inject(MockApiService);
  readonly selectedMonth = this.api.selectedMonth;
  readonly monthOptions = this.buildMonthOptions();
  isLoggedIn = false;
  private subscription!: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.subscription = this.authService.isLoggedIn$.subscribe((value) => {
      this.isLoggedIn = Boolean(value);
    });

    void this.authService.initializeAuthState();
  }

  onMonthChange(month: string): void {
    this.api.setSelectedMonth(month);
  }

  private buildMonthOptions(): { key: string; label: string }[] {
    const now = new Date();
    return Array.from({ length: 24 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(date);
      return { key, label };
    });
  }

  async logout(): Promise<void> {
    const { error } = await this.authService.signOut();

    if (error) {
      console.error('Logout failed:', error.message);
      return;
    }

    await this.router.navigate(['/login']);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
