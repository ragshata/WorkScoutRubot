// src/api/responses.ts

import { apiFetch } from "./http";

// Отправка отклика на заказ
export async function sendOrderResponse(
  orderId: number,
  payload: { price: number | null; discuss_price: boolean; comment: string }
): Promise<void> {
  await apiFetch(`/orders/${orderId}/responses`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ===== Отклики исполнителя =====

export type ExecutorResponseDto = {
  id: number;
  status: "waiting" | "chosen" | "declined" | "done";
  price: number | null;
  comment: string;
  created_at: string;

  order: {
    id: number;
    title: string;
    city: string;
    address: string;
    categories: string[];
    budget_label: string; // например "30 000 ₽" или "Договорная"
    dates_label: string; // например "До 20 марта"
  };
};

export async function getExecutorResponses(): Promise<ExecutorResponseDto[]> {
  return apiFetch("/executor/responses");
}
