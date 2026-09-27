export interface MajorCategory {
  id: number;
  name: string;
  icon: string;
  accent: string;
  description?: string;
}

export interface MinorCategory {
  id: string;
  majorCategoryId: number;
  name: string;
}

export interface Expense {
  id: string;
  majorCategoryId: number;
  minorCategoryId: string;
  amount: number;
  date: string;
  description: string;
  imageUrl?: string;
}

export interface ExpenseRequest {
  majorCategoryId: number;
  minorCategoryId: string;
  amount: number;
  date: string;
  description: string;
  imageUrl?: string;
}