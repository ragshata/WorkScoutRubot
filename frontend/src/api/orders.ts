// src/api/orders.ts

import { apiFetch } from "./http";

export type BudgetType = "fixed" | "negotiable";

export interface Order {
  id: number;
  title: string;
  description: string;
  city: string;
  address?: string | null;
  categories: string[];
  budget_type: BudgetType;
  budget_amount?: number | null;
  // даты в одном формате с AvailableOrderDto и бэком
  date_from?: string | null;
  date_to?: string | null;
  status: string; // можно сузить до "active" | "in_progress" | "done" | "cancelled", если захочешь
  has_photos?: boolean; // опционально, на будущее
}

export interface CreateOrderPayload {
  customer_id: number; // фронту удобно, но бэку не нужен
  title: string;
  description: string;
  city: string;
  address?: string | null;
  categories: string[];
  budget_type: BudgetType;
  budget_amount?: number | null;
  // тоже date_from/date_to, чтобы совпадало с бэком
  date_from?: string | null;
  date_to?: string | null;
}

// createOrder идёт через apiFetch и НЕ шлёт customer_id бэку
export async function createOrder(
  payload: CreateOrderPayload
): Promise<Order> {
  const { customer_id, ...rest } = payload;
  return apiFetch("/orders/", {
    method: "POST",
    body: JSON.stringify(rest),
  });
}

// "Мои заказы" заказчика
export async function getCustomerOrders(): Promise<Order[]> {
  return apiFetch("/orders/my");
}

// удаление заказа тоже требует X-User-Id → apiFetch
export async function deleteOrder(orderId: number): Promise<void> {
  await apiFetch(`/orders/${orderId}`, {
    method: "DELETE",
  });
}

// ======================================
// Доступные заказы для исполнителя
// ======================================

/** Как бэк присылает заказ (примерная структура) */
export type AvailableOrderDto = {
  id: number;
  title: string;
  city: string;
  address: string;
  categories?: string[];
  description: string;
  budget_type: "fixed" | "negotiable";
  budget_amount: number | null;
  date_from: string | null;
  date_to: string | null;
  has_photos?: boolean;
  created_at: string;
};

/** Доступные заказы для исполнителя */
export async function getAvailableOrders(): Promise<AvailableOrderDto[]> {
  return apiFetch("/orders/available");
}