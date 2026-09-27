import { Injectable, inject, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import {
  Expense,
  ExpenseRequest,
  MajorCategory,
  MinorCategory
} from '../models/expense.models';

import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class MockApiService {

  private readonly supabase = inject(SupabaseService);

  readonly selectedMonth = signal(this.currentMonthKey());

  private readonly major$ =
    new BehaviorSubject<MajorCategory[]>([]);

  private readonly minor$ =
    new BehaviorSubject<MinorCategory[]>([]);

  private readonly expenses$ =
    new BehaviorSubject<Expense[]>([]);

  constructor() {
    this.refreshData();
  }

  // Get the currently authenticated user's ID
  private async getCurrentUserId(): Promise<string> {
    const { data, error } =
      await this.supabase.client.auth.getUser();

    if (error || !data.user) {
      throw error ?? new Error('User is not logged in');
    }

    return data.user.id;
  }

  // Selected month
  setSelectedMonth(month: string): void {
    if (/^\d{4}-\d{2}$/.test(month)) {
      this.selectedMonth.set(month);
    }
  }

  // Observable getters
  getMajorCategories(): Observable<MajorCategory[]> {
    return this.major$.asObservable();
  }

  getMinorCategories(): Observable<MinorCategory[]> {
    return this.minor$.asObservable();
  }

  getExpenses(): Observable<Expense[]> {
    return this.expenses$.asObservable();
  }

  // Load all data from Supabase
  async refreshData(): Promise<void> {
    const client = this.supabase.client;

    const [
      { data: majorData, error: majorError },
      { data: minorData, error: minorError },
      { data: expenseData, error: expenseError }
    ] = await Promise.all([
      client
        .from('major_categories')
        .select('id, name, icon, accent, description'),

      client
        .from('minor_categories')
        .select('id, major_category_id, name'),

      client
        .from('expenses')
        .select(
          'id, major_category_id, minor_category_id, amount, date, description, image_url'
        )
    ]);

    if (majorError || minorError || expenseError) {
      console.error('Supabase data loading failed:', {
        majorError,
        minorError,
        expenseError
      });
      return;
    }

    this.major$.next(
      (majorData ?? []).map(item =>
        this.normalizeMajor({
          ...item,
          id: Number(item.id)
        } as MajorCategory)
      )
    );

    this.minor$.next(
      (minorData ?? []).map(item =>
        this.normalizeMinor({
          ...item,
          id: String(item.id),
          majorCategoryId: Number(item.major_category_id)
        } as MinorCategory)
      )
    );

    this.expenses$.next(
      (expenseData ?? []).map(item =>
        this.normalizeExpense({
          ...item,
          id: String(item.id),
          majorCategoryId: Number(item.major_category_id),
          minorCategoryId: String(item.minor_category_id),
          imageUrl: item.image_url ?? undefined
        } as Expense)
      )
    );
  }

  // Add major category
  addMajorCategory(name: string): Observable<MajorCategory> {
    return new Observable<MajorCategory>(subscriber => {
      const save = async () => {
        const userId = await this.getCurrentUserId();

        const payload = {
          user_id: userId,
          name: name.trim(),
          icon: '✦',
          accent: 'blue'
        };

        const { data, error } = await this.supabase.client
          .from('major_categories')
          .insert(payload)
          .select('id, name, icon, accent, description')
          .single();

        if (error) {
          throw error;
        }

        const category = this.normalizeMajor({
          ...data,
          id: Number(data.id)
        } as MajorCategory);

        this.major$.next([
          ...this.major$.value,
          category
        ]);

        subscriber.next(category);
        subscriber.complete();
      };

      save().catch(error => subscriber.error(error));
    });
  }

  // Add minor category
  addMinorCategory(
    majorCategoryId: number,
    name: string
  ): Observable<MinorCategory> {
    return new Observable<MinorCategory>(subscriber => {
      const save = async () => {
        const userId = await this.getCurrentUserId();

        const payload = {
          id: crypto.randomUUID(),
          user_id: userId,
          major_category_id: Number(majorCategoryId),
          name: name.trim()
        };

        const { data, error } = await this.supabase.client
          .from('minor_categories')
          .insert(payload)
          .select('id, major_category_id, name')
          .single();

        if (error) {
          throw error;
        }

        const category = this.normalizeMinor({
          ...data,
          id: String(data.id),
          majorCategoryId: Number(data.major_category_id)
        } as MinorCategory);

        this.minor$.next([
          ...this.minor$.value,
          category
        ]);

        subscriber.next(category);
        subscriber.complete();
      };

      save().catch(error => subscriber.error(error));
    });
  }

  // Add expense
  addExpense(request: ExpenseRequest): Observable<Expense> {
    return new Observable<Expense>(subscriber => {
      const save = async () => {
        const userId = await this.getCurrentUserId();

        const payload = {
          user_id: userId,
          major_category_id: Number(request.majorCategoryId),
          minor_category_id: String(request.minorCategoryId),
          amount: Number(request.amount),
          date: request.date,
          description: request.description ?? '',
          image_url: request.imageUrl ?? null
        };

        const { data, error } = await this.supabase.client
          .from('expenses')
          .insert(payload)
          .select(
            'id, major_category_id, minor_category_id, amount, date, description, image_url'
          )
          .single();

        if (error) {
          throw error;
        }

        const expense = this.normalizeExpense({
          ...data,
          id: String(data.id),
          majorCategoryId: Number(data.major_category_id),
          minorCategoryId: String(data.minor_category_id),
          imageUrl: data.image_url ?? undefined
        } as Expense);

        this.expenses$.next([
          expense,
          ...this.expenses$.value
        ]);

        subscriber.next(expense);
        subscriber.complete();
      };

      save().catch(error => subscriber.error(error));
    });
  }


    // Edit major category
  updateMajorCategory(
    id: number,
    name: string
  ): Observable<MajorCategory> {
    return new Observable<MajorCategory>(subscriber => {
      const update = async () => {
        const { data, error } = await this.supabase.client
          .from('major_categories')
          .update({ name: name.trim() })
          .eq('id', id)
          .select('id, name, icon, accent, description')
          .single();

        if (error) {
          throw error;
        }

        const category = this.normalizeMajor({
          ...data,
          id: Number(data.id)
        } as MajorCategory);

        this.major$.next(
          this.major$.value.map(item =>
            item.id === id ? category : item
          )
        );

        subscriber.next(category);
        subscriber.complete();
      };

      update().catch(error => subscriber.error(error));
    });
  }

  // Edit minor category
  updateMinorCategory(
    id: string,
    name: string
  ): Observable<MinorCategory> {
    return new Observable<MinorCategory>(subscriber => {
      const update = async () => {
        const { data, error } = await this.supabase.client
          .from('minor_categories')
          .update({ name: name.trim() })
          .eq('id', id)
          .select('id, major_category_id, name')
          .single();

        if (error) {
          throw error;
        }

        const category = this.normalizeMinor({
          ...data,
          id: String(data.id),
          majorCategoryId: Number(data.major_category_id)
        } as MinorCategory);

        this.minor$.next(
          this.minor$.value.map(item =>
            item.id === id ? category : item
          )
        );

        subscriber.next(category);
        subscriber.complete();
      };

      update().catch(error => subscriber.error(error));
    });
  }

  // Delete major category only when it has no linked data
  deleteMajorCategory(id: number): Observable<void> {
    return new Observable<void>(subscriber => {
      const remove = async () => {
        const client = this.supabase.client;

        const { data: minors, error: minorError } = await client
          .from('minor_categories')
          .select('id')
          .eq('major_category_id', id);

        if (minorError) {
          throw minorError;
        }

        const { data: expenses, error: expenseError } = await client
          .from('expenses')
          .select('id')
          .eq('major_category_id', id);

        if (expenseError) {
          throw expenseError;
        }

        if ((minors?.length ?? 0) > 0) {
          throw new Error(
            'This category has minor categories. Delete them first.'
          );
        }

        if ((expenses?.length ?? 0) > 0) {
          throw new Error(
            'This category has expenses. Delete or move them first.'
          );
        }

        const { error } = await client
          .from('major_categories')
          .delete()
          .eq('id', id);

        if (error) {
          throw error;
        }

        this.major$.next(
          this.major$.value.filter(item => item.id !== id)
        );

        subscriber.next();
        subscriber.complete();
      };

      remove().catch(error => subscriber.error(error));
    });
  }

  // Delete minor category only when it has no linked expenses
  deleteMinorCategory(id: string): Observable<void> {
    return new Observable<void>(subscriber => {
      const remove = async () => {
        const client = this.supabase.client;

        const { data: expenses, error: expenseError } = await client
          .from('expenses')
          .select('id')
          .eq('minor_category_id', id);

        if (expenseError) {
          throw expenseError;
        }

        if ((expenses?.length ?? 0) > 0) {
          throw new Error(
            'This minor category has expenses. Delete or move them first.'
          );
        }

        const { error } = await client
          .from('minor_categories')
          .delete()
          .eq('id', id);

        if (error) {
          throw error;
        }

        this.minor$.next(
          this.minor$.value.filter(item => item.id !== id)
        );

        subscriber.next();
        subscriber.complete();
      };

      remove().catch(error => subscriber.error(error));
    });
  }

  // Delete expense
  deleteExpense(id: string): Observable<void> {
    return new Observable<void>(subscriber => {
      const remove = async () => {
        const { error } = await this.supabase.client
          .from('expenses')
          .delete()
          .eq('id', id);

        if (error) {
          throw error;
        }

        this.expenses$.next(
          this.expenses$.value.filter(
            expense => expense.id !== id
          )
        );

        subscriber.next();
        subscriber.complete();
      };

      remove().catch(error => subscriber.error(error));
    });
  }

  // Normalize database records for Angular models
  private normalizeMajor = (
    item: MajorCategory
  ): MajorCategory => ({
    ...item,
    id: Number(item.id)
  });

  private normalizeMinor = (
    item: MinorCategory
  ): MinorCategory => ({
    ...item,
    id: String(item.id),
    majorCategoryId: Number(item.majorCategoryId)
  });

  private normalizeExpense = (
    item: Expense
  ): Expense => ({
    ...item,
    id: String(item.id),
    majorCategoryId: Number(item.majorCategoryId),
    minorCategoryId: String(item.minorCategoryId),
    amount: Number(item.amount)
  });

  private currentMonthKey(): string {
    const now = new Date();

    return `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}`;
  }
}