import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MockApiService } from '../../core/mock-api.service';
import { Expense, MajorCategory, MinorCategory } from '../../models/expense.models';
import { CloudinaryUploadService } from '../../core/cloudinary-upload.service';
import { finalize, of, switchMap } from 'rxjs';

@Component({ selector: 'hen-dashboard', standalone: true, imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink], templateUrl: './dashboard.component.html' })
export class DashboardComponent {
  private readonly api = inject(MockApiService);
  private readonly fb = inject(FormBuilder);
  readonly categories = toSignal(this.api.getMajorCategories(), { initialValue: [] as MajorCategory[] });
  readonly minorCategories = toSignal(this.api.getMinorCategories(), { initialValue: [] as MinorCategory[] });
  readonly expenses = toSignal(this.api.getExpenses(), { initialValue: [] as Expense[] });
  readonly expenseForm = this.fb.nonNullable.group({
    majorCategoryId: [2, Validators.required], minorCategoryId: ['201', Validators.required], amount: [0, [Validators.required, Validators.min(1)]],
    date: [this.today(), Validators.required], description: ['']
  });
  readonly selectedMajorId = signal(2);
  readonly selectedMonth = this.api.selectedMonth;
  readonly monthLabel = computed(() => this.formatMonth(this.selectedMonth()));
  readonly minDate = computed(() => `${this.selectedMonth()}-01`);
  readonly maxDate = computed(() => {
    const [year, month] = this.selectedMonth().split('-').map(Number);
    return `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
  });
  readonly monthExpenses = computed(() => this.expenses().filter(e => e.date.startsWith(this.selectedMonth())));
  readonly recentExpenses = computed(() =>
    [...this.monthExpenses()]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10)
  );
  readonly selectedMinors = computed(() => this.minorCategories().filter(m => m.majorCategoryId === this.selectedMajorId()));
  readonly total = computed(() => this.monthExpenses().reduce((sum, e) => sum + e.amount, 0));
  readonly categoryTotals = computed(() => this.categories().map(category => {
    const matching = this.monthExpenses().filter(e => e.majorCategoryId === category.id);
    const amount = matching.reduce((sum, e) => sum + e.amount, 0);
    return { category, amount, count: matching.length, percentage: this.total() ? amount / this.total() * 100 : 0 };
  }));
    private readonly cloudinary = inject(CloudinaryUploadService);

    selectedImage: File | null = null;
    imagePreviewUrl = '';
    imageError = '';

    readonly maxImageSize = 5 * 1024 * 1024;

    private imageInput?: HTMLInputElement;

  showMajorModal = false; showMinorModal = false; newMajorName = ''; newMinorName = ''; saving = false; message = '';

  constructor() {

    effect(() => {
      const month = this.selectedMonth();
      const currentDate = this.expenseForm.controls.date.value;
      if (!currentDate.startsWith(month)) {
        this.expenseForm.controls.date.setValue(`${month}-01`);
      }
    });

    this.expenseForm.controls.majorCategoryId.valueChanges.subscribe(majorId => {
      this.selectedMajorId.set(Number(majorId));
      const firstMinor = this.minorCategories().find(m => m.majorCategoryId === Number(majorId));
      this.expenseForm.controls.minorCategoryId.setValue(firstMinor?.id ?? '');
    });
  }


addExpense(): void {
  if (this.expenseForm.invalid) {
    this.expenseForm.markAllAsTouched();
    return;
  }

  this.saving = true;
  this.message = '';
  this.imageError = '';

  const formValue = this.expenseForm.getRawValue();

  const request = {
    ...formValue,
    majorCategoryId: Number(formValue.majorCategoryId),
    minorCategoryId: String(formValue.minorCategoryId),
    amount: Number(formValue.amount)
  };

  const upload$ = this.selectedImage
    ? this.cloudinary.uploadImage(this.selectedImage)
    : of('');

  upload$.pipe(
    switchMap(imageUrl =>
      this.api.addExpense({
        ...request,
        ...(imageUrl ? { imageUrl } : {})
      })
    ),
    finalize(() => this.saving = false)
  ).subscribe({
    next: () => {
      this.message = 'Expense added successfully.';

      this.expenseForm.controls.amount.setValue(0);
      this.expenseForm.controls.description.setValue('');

      this.removeSelectedImage();

      setTimeout(() => this.message = '', 2500);
    },
    error: (error) => {
      console.error(
        'Unable to save expense or upload image',
        error
      );

      this.imageError = this.selectedImage
        ? 'Image upload failed. Check your Cloudinary upload preset and try again.'
        : 'Could not save expense. Please try again.';
    }
  });
}

  deleteExpense(expense: Expense): void {
  if (!confirm('Are you sure you want to delete this expense?')) {
    return;
  }

  this.api.deleteExpense(expense.id).subscribe(() => {
    this.message = 'Expense deleted successfully.';
    setTimeout(() => this.message = '', 2500);
  });
}



  addMajorCategory(): void {
    const name = this.newMajorName.trim(); if (!name) return;
    this.api.addMajorCategory(name).subscribe(category => { this.newMajorName = ''; this.showMajorModal = false; this.expenseForm.controls.majorCategoryId.setValue(category.id); });
  }

  addMinorCategory(): void {
    const name = this.newMinorName.trim(); const majorId = Number(this.expenseForm.controls.majorCategoryId.value); if (!name || !majorId) return;
    this.api.addMinorCategory(majorId, name).subscribe(category => { this.newMinorName = ''; this.showMinorModal = false; this.expenseForm.controls.minorCategoryId.setValue(category.id); });
  }

  selectedMajorName(): string { return this.categories().find(c => c.id === this.selectedMajorId())?.name ?? ''; }
  private formatMonth(month: string): string {
    const [year, monthNumber] = month.split('-').map(Number);
    return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(new Date(year, monthNumber - 1, 1));
  }

  private today(): string { return new Date().toISOString().slice(0, 10); }

  
onImageSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  this.imageInput = input;

  const file = input.files?.[0];
  this.imageError = '';

  if (!file) return;

  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  if (!allowedTypes.includes(file.type)) {
    this.imageError = 'Please select a JPG, PNG, or WebP image.';
    input.value = '';
    return;
  }

  if (file.size > this.maxImageSize) {
    this.imageError = 'Image size must be 5 MB or less.';
    input.value = '';
    return;
  }

  if (this.imagePreviewUrl) {
    URL.revokeObjectURL(this.imagePreviewUrl);
  }

  this.selectedImage = file;
  this.imagePreviewUrl = URL.createObjectURL(file);
}

removeSelectedImage(): void {
  if (this.imagePreviewUrl) {
    URL.revokeObjectURL(this.imagePreviewUrl);
  }

  this.selectedImage = null;
  this.imagePreviewUrl = '';

  if (this.imageInput) {
    this.imageInput.value = '';
  }

  this.imageError = '';
}
}
