import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export interface Category {
  id: string;
  label: string;
  icon: IconName;
  color: string;
}

export const CATEGORIES: Category[] = [
  { id: 'food', label: 'Food', icon: 'fast-food', color: '#F97316' },
  { id: 'groceries', label: 'Groceries', icon: 'cart', color: '#4BA876' },
  { id: 'transport', label: 'Transport', icon: 'bus', color: '#3B82F6' },
  { id: 'bills', label: 'Bills', icon: 'receipt', color: '#EAB308' },
  { id: 'shopping', label: 'Shopping', icon: 'bag-handle', color: '#EC4899' },
  { id: 'health', label: 'Health', icon: 'medkit', color: '#EF4444' },
  { id: 'entertainment', label: 'Fun', icon: 'game-controller', color: '#8B5CF6' },
  { id: 'rent', label: 'Rent', icon: 'home', color: '#14B8A6' },
  { id: 'savings', label: 'Savings', icon: 'wallet', color: '#6366F1' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-circle', color: '#6B7280' },
];

export const categoryById = (id: string): Category =>
  CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];

export const PAYMENT_MODES = ['UPI', 'Cash', 'Card', 'Other'] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];
