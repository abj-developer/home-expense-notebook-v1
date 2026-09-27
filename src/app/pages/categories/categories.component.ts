import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import { MockApiService } from '../../core/mock-api.service';
import {
  Expense,
  MajorCategory,
  MinorCategory
} from '../../models/expense.models';

@Component({
  selector: 'hen-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categories.component.html'
})
export class CategoriesComponent {

  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
private toastTimer?: ReturnType<typeof setTimeout>;
  private readonly api = inject(MockApiService);

  readonly categories = toSignal(
    this.api.getMajorCategories(),
    { initialValue: [] as MajorCategory[] }
  );

  readonly minors = toSignal(
    this.api.getMinorCategories(),
    { initialValue: [] as MinorCategory[] }
  );

  readonly expenses = toSignal(
    this.api.getExpenses(),
    { initialValue: [] as Expense[] }
  );

  readonly grouped = computed(() =>
    this.categories().map(category => ({
      category,
      minors: this.minors().filter(
        minor => minor.majorCategoryId === category.id
      )
    }))
  );

  showMajor = false;
  showMinor = false;
  showEdit = false;

  selectedMajorId = 1;

  majorName = '';
  minorName = '';
  editName = '';

  editingType: 'major' | 'minor' = 'major';
  editingMajorId: number | null = null;
  editingMinorId: string | null = null;

  errorMessage = '';
  successMessage = '';

  // Create major category
  createMajor(): void {
    const name = this.majorName.trim();

    if (!name) {
      this.showToast('Major category name cannot be empty.', 'error');
      return;
    }

    this.clearMessages();

    this.api.addMajorCategory(name).subscribe({
      next: () => {
        this.majorName = '';
        this.showMajor = false;
        this.showToast('Major category created successfully.', 'success');
      },
      error: error => this.handleError(error)
    });
  }

  // Create minor category
  openMinor(id: number): void {
    this.selectedMajorId = id;
    this.minorName = '';
    this.showMinor = true;
    this.clearMessages();
  }

  createMinor(): void {
    const name = this.minorName.trim();

    if (!name) {
      this.showToast('Minor category name cannot be empty.', 'error');
      return;
    }

    this.clearMessages();

    this.api
      .addMinorCategory(this.selectedMajorId, name)
      .subscribe({
        next: () => {
          this.minorName = '';
          this.showMinor = false;
          this.showToast('Minor category added successfully.', 'success');
        },
        error: error => this.handleError(error)
      });
  }

  // Open edit modal for major category
  editMajor(category: MajorCategory): void {
    this.editingType = 'major';
    this.editingMajorId = category.id;
    this.editingMinorId = null;
    this.editName = category.name;
    this.showEdit = true;
    this.clearMessages();
  }

  // Open edit modal for minor category
  editMinor(minor: MinorCategory): void {
    this.editingType = 'minor';
    this.editingMinorId = minor.id;
    this.editingMajorId = null;
    this.editName = minor.name;
    this.showEdit = true;
    this.clearMessages();
  }

  // Save edited category
  saveEdit(): void {
    const name = this.editName.trim();

    if (!name) {
      this.showToast('Category name cannot be empty.', 'error');
      return;
    }

    this.clearMessages();

    if (this.editingType === 'major') {
      if (this.editingMajorId === null) return;

      this.api
        .updateMajorCategory(this.editingMajorId, name)
        .subscribe({
          next: () => {
            this.showEdit = false;
            this.showToast('Major category updated successfully.', 'success');
          },
          error: error => this.handleError(error)
        });

      return;
    }

    if (this.editingMinorId === null) return;

    this.api
      .updateMinorCategory(this.editingMinorId, name)
      .subscribe({
        next: () => {
          this.showEdit = false;
          this.showToast('Minor category updated successfully.', 'success');
        },
        error: error => this.handleError(error)
      });
  }

  // Delete major category
  deleteMajor(category: MajorCategory): void {
    const hasMinorCategories = this.minors().some(
      minor => minor.majorCategoryId === category.id
    );

    const hasExpenses = this.expenses().some(
      expense => expense.majorCategoryId === category.id
    );

    if (hasMinorCategories || hasExpenses) {
      const message = hasMinorCategories
        ? `"${category.name}" has minor categories. Delete them first.`
        : `"${category.name}" has expenses. Delete or move them first.`;

      this.showToast(message, 'error');
      return;
    }

    const confirmed = window.confirm(
      `Delete "${category.name}"?\n\n` +
      'This is allowed only when it has no minor categories or expenses.'
    );

    if (!confirmed) return;

    this.clearMessages();

    this.api.deleteMajorCategory(category.id).subscribe({
      next: () => {
        this.showToast(`"${category.name}" deleted successfully.`, 'success');
      },
      error: error => this.handleError(error)
    });
  }

  // Delete minor category
  deleteMinor(minor: MinorCategory): void {
    const hasExpenses = this.expenses().some(
      expense => expense.minorCategoryId === minor.id
    );

    if (hasExpenses) {
      this.showToast(
        `"${minor.name}" has expenses. Delete or move them first.`,
        'error'
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete minor category "${minor.name}"?\n\n` +
      'This is allowed only when it has no expenses.'
    );

    if (!confirmed) return;

    this.clearMessages();

    this.api.deleteMinorCategory(minor.id).subscribe({
      next: () => {
        this.showToast(`"${minor.name}" deleted successfully.`, 'success');
      },
      error: error => this.handleError(error)
    });
  }

  majorNameById(): string {
    return this.categories().find(
      category => category.id === this.selectedMajorId
    )?.name ?? '';
  }

  private handleError(error: any): void {
    const message = error?.message ?? 'Something went wrong. Please try again.';

    console.error('Category operation failed:', error);

    this.errorMessage = '';
    this.successMessage = '';
    this.showToast(message, 'error');
  }

   clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.closeToast();
  }

  showToast(
  message: string,
  type: 'success' | 'error' = 'success'
): void {
  this.toastMessage = message;
  this.toastType = type;

  if (this.toastTimer) {
    clearTimeout(this.toastTimer);
  }

  this.toastTimer = setTimeout(() => {
    this.toastMessage = '';
  }, 3500);
}

closeToast(): void {
  this.toastMessage = '';

  if (this.toastTimer) {
    clearTimeout(this.toastTimer);
  }
}
}