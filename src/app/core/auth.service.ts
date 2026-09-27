import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly isLoggedInSubject = new BehaviorSubject<boolean>(false);
  readonly isLoggedIn$ = this.isLoggedInSubject.asObservable();

  constructor(private supabase: SupabaseService) {
    void this.initializeAuthState();
  }

  setLoggedInState(value: boolean): void {
    this.isLoggedInSubject.next(value);
  }

  async initializeAuthState(): Promise<boolean> {
    const { data, error } = await this.getSession();
    const isAuthenticated = !error && !!data.session;
    this.setLoggedInState(isAuthenticated);
    return isAuthenticated;
  }

  async signIn(email: string, password: string) {
    const response = await this.supabase.client.auth.signInWithPassword({
      email,
      password
    });

    if (!response.error) {
      this.setLoggedInState(true);
    }

    return response;
  }

  async signUp(email: string, password: string) {
    return this.supabase.client.auth.signUp({
      email,
      password
    });
  }

  async signOut() {
    const response = await this.supabase.client.auth.signOut();

    if (!response.error) {
      this.setLoggedInState(false);
    }

    return response;
  }

  async getSession() {
    return this.supabase.client.auth.getSession();
  }

  async getCurrentUser() {
    return this.supabase.client.auth.getUser();
  }
}