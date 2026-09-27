import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { MockApiService } from '../../core/mock-api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  email = '';
  password = '';

  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private mockApiService: MockApiService
  ) {}

  async login() {
    this.errorMessage = '';
    this.loading = true;

    try {
      const { error } = await this.authService.signIn(
        this.email,
        this.password
      );

      if (error) {
        this.errorMessage = error.message;
        return;
      }
      await this.mockApiService.refreshData();
      this.authService.setLoggedInState(true);
      await this.router.navigate(['/']);
    } catch (error) {
      this.errorMessage = 'Login failed. Please try again.';
    } finally {
      this.loading = false;
    }
  }
}