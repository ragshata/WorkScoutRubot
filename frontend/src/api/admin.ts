// src/api/admin.ts

import { apiFetch } from "./http";
import type { UserRole } from "./users";
import type { SupportStatus, SupportTicket } from "./support";
import type { Review, ReviewStatus } from "./reviews";

// ==== Админ: пользователи ==== //

export interface AdminUser {
  id: number;
  role: UserRole;
  first_name: string;
  last_name?: string | null;
  phone?: string | null;
  city?: string | null;
  is_blocked: boolean;
  created_at: string;
}

/**
 * Список пользователей (минимальная админка)
 * GET /admin/users
 */
export async function adminGetUsers(): Promise<AdminUser[]> {
  return apiFetch("/admin/users");
}

/**
 * Блок / разбан пользователя
 * PATCH /admin/users/{id} { is_blocked }
 */
export async function adminSetUserBlocked(
  userId: number,
  is_blocked: boolean
): Promise<AdminUser> {
  // если is_blocked === true -> вызываем /block
  // если is_blocked === false -> вызываем /unblock
  const action = is_blocked ? "block" : "unblock";

  return apiFetch(`/admin/users/${userId}/${action}`, {
    method: "PATCH",
  });
}


// ==== Админ: заказы ==== //

export type AdminOrderStatus = "active" | "in_progress" | "done" | "cancelled";

export interface AdminOrder {
  id: number;
  title: string;
  city: string;
  address?: string | null;
  status: AdminOrderStatus;
  customer_id: number;
  executor_id?: number | null;
  created_at: string;
}

/**
 * Список заказов
 * GET /admin/orders
 */
export async function adminGetOrders(): Promise<AdminOrder[]> {
  return apiFetch("/admin/orders");
}

/**
 * Смена статуса заказа (минималка)
 * PATCH /admin/orders/{id} { status }
 */
export async function adminUpdateOrderStatus(
  orderId: number,
  status: AdminOrderStatus
): Promise<AdminOrder> {
  return apiFetch(`/admin/orders/${orderId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// ==== Админ: поддержка ==== //

// Админский тикет = обычный SupportTicket + инфа о пользователе
export interface AdminSupportTicket extends SupportTicket {
  user_name: string;
  user_phone?: string | null;
}

/**
 * Список всех тикетов
 * GET /admin/support
 */
export async function adminGetSupportTickets(): Promise<AdminSupportTicket[]> {
  return apiFetch("/admin/support");
}

/**
 * Сменить статус тикета
 * PATCH /admin/support/{id} { status }
 */
export async function adminUpdateSupportTicketStatus(
  ticketId: number,
  status: SupportStatus
): Promise<AdminSupportTicket> {
  return apiFetch(`/admin/support/${ticketId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// ==== Админ: отзывы ==== //

export async function adminGetReviews(): Promise<Review[]> {
  return apiFetch("/admin/reviews");
}

/**
 * Смена статуса отзыва.
 */
export async function adminSetReviewStatus(
  reviewId: number,
  status: ReviewStatus
): Promise<Review> {
  return apiFetch(`/admin/reviews/${reviewId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// ==== Админ: статистика ==== //

// Можно расширить по мере развития бэка, сейчас — базовый набор
export interface OrdersByStatus {
  active: number;
  in_progress: number;
  done: number;
  cancelled: number;
}

export interface AdminStats {
  total_users: number;
  total_customers: number;
  total_executors: number;
  total_admins: number; // если бэк это не шлёт — будет undefined, это ок
  total_orders: number;
  orders_by_status: OrdersByStatus;
  total_responses: number;
  total_reviews: number;
  approved_reviews: number;
  avg_time_to_first_response_hours: number | null;
}

/**
 * Общая статистика
 * GET /admin/stats
 */
export async function adminGetStats(): Promise<AdminStats> {
  return apiFetch("/admin/stats");
}
