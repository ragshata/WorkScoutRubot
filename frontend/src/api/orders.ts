// src/api/orders.ts

import { apiFetch } from "./http";

export type BudgetType = "fixed" | "negotiable";
export type OrderStatus = "active" | "in_progress" | "done" | "cancelled";

/** Полный заказ из OrderOut (бэк) */
export interface Order {
  id: number;
  title: string;
  description: string;
  city: string;
  address: string | null;
  categories: string[];
  budget_type: BudgetType;
  budget_amount: number | null;

  // В БД и схеме: start_date / end_date
  start_date: string | null;
  end_date: string | null;

  status: OrderStatus;
  has_photos: boolean;
  created_at: string;
  executor_id: number | null;
}

/** Создание заказа = OrderCreate на бэке */
export interface CreateOrderPayload {
  // только для фронта, БЭКУ НЕ ОТПРАВЛЯЕМ
  customer_id: number;

  title: string;
  description: string;
  city: string;
  address?: string | null;
  categories: string[];
  budget_type: BudgetType;
  budget_amount?: number | null;

  // важно: имена полей как в OrderCreate: start_date / end_date
  start_date?: string | null;
  end_date?: string | null;
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

// "Мои заказы" заказчика (GET /orders/my)
export async function getCustomerOrders(): Promise<Order[]> {
  return apiFetch("/orders/my");
}

// Получить один свой заказ (GET /orders/{id})
export async function getOrderById(orderId: number): Promise<Order> {
  return apiFetch(`/orders/${orderId}`);
}

// Тип для PATCH /orders/{id} (OrderUpdate на бэке)
export interface UpdateOrderPayload {
  title?: string;
  description?: string;
  city?: string;
  address?: string | null;
  categories?: string[];
  budget_type?: BudgetType;
  budget_amount?: number | null;
  start_date?: string | null;
  end_date?: string | null;
}

// Редактирование заказа (PATCH /orders/{id})
export async function updateOrder(
  orderId: number,
  payload: UpdateOrderPayload
): Promise<Order> {
  return apiFetch(`/orders/${orderId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// "Удаление" = перевод в cancelled (DELETE /orders/{id})
export async function deleteOrder(orderId: number): Promise<void> {
  await apiFetch(`/orders/${orderId}`, {
    method: "DELETE",
  });
}

// Завершить заказ (status = "done") — POST /orders/{id}/complete
export async function completeOrder(orderId: number): Promise<Order> {
  return apiFetch(`/orders/${orderId}/complete`, {
    method: "POST",
  });
}

/* ======================================
 * Чат и контакты
 * ====================================*/

// соответствует ChatLinkOut
export interface ChatLinkResponse {
  order_id: number;
  other_user_id: number;
  other_telegram_id: number | null;
  chat_link: string; // tg://user?id=...
}

// соответствует ParticipantContact из ChatContactsOut
export interface ParticipantContact {
  user_id: number;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  telegram_id: number | null;
}

// соответствует ChatContactsOut
export interface ChatContactsResponse {
  order_id: number;
  customer_accepted: boolean;
  executor_accepted: boolean;
  both_accepted: boolean;
  customer: ParticipantContact | null;
  executor: ParticipantContact | null;
}

/** Ссылка на чат Telegram по заказу (GET /orders/{id}/chat-link) */
export async function getChatLink(orderId: number): Promise<ChatLinkResponse> {
  return apiFetch(`/orders/${orderId}/chat-link`);
}

/** Показать контакты по заказу (POST /orders/{id}/show-contacts) */
export async function showContacts(
  orderId: number
): Promise<ChatContactsResponse> {
  return apiFetch(`/orders/${orderId}/show-contacts`, {
    method: "POST",
  });
}

// ======================================
// Доступные заказы для исполнителя
// ======================================

/** Как бэк присылает доступный заказ (AvailableOrderDto) */
export interface AvailableOrderDto {
  id: number;
  title: string;
  city: string;
  address: string;
  categories: string[];
  description: string;
  budget_type: BudgetType;
  budget_amount: number | null;
  date_from: string | null;
  date_to: string | null;
  has_photos: boolean;
  created_at: string;
}

/** Доступные заказы для исполнителя (GET /orders/available) */
export async function getAvailableOrders(): Promise<AvailableOrderDto[]> {
  return apiFetch("/orders/available");
}
