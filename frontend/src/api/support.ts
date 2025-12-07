// src/api/support.ts

import { apiFetch } from "./http";

export type SupportStatus = "open" | "in_progress" | "closed";

export interface SupportTicket {
  id: number;
  user_id: number;
  topic: string;        // ⬅ было subject, бэк ждёт topic
  message: string;
  status: SupportStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Создать тикет в поддержку
 * POST /support
 */
export interface CreateSupportTicketPayload {
  topic: string;        // ⬅ тоже переименовали
  message: string;
}

export async function createSupportTicket(
  payload: CreateSupportTicketPayload
): Promise<SupportTicket> {
  return apiFetch("/support", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Мои тикеты
 * GET /support/my
 */
export async function getMySupportTickets(): Promise<SupportTicket[]> {
  return apiFetch("/support/my");
}