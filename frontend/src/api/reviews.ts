// src/api/reviews.ts

import { apiFetch } from "./http";

export type ReviewStatus = "pending" | "approved" | "hidden";

export interface Review {
  id: number;
  author_id: number;
  target_user_id: number;
  order_id: number;
  rating: number; // 1–5
  text: string;
  status: ReviewStatus;
  created_at: string;
}

export interface UserReviewsResponse {
  user_id: number;
  rating: number | null; // средний рейтинг
  reviews_count: number;
  reviews: Review[];
}

/**
 * Отзывы по пользователю (например, для профиля исполнителя/заказчика)
 * GET /reviews/for-user/{user_id}
 */
export async function getReviewsForUser(
  userId: number
): Promise<UserReviewsResponse> {
  return apiFetch(`/reviews/for-user/${userId}`);
}

/**
 * Создать отзыв
 * POST /reviews/
 * payload: { order_id, target_user_id, rating, text }
 */
export interface CreateReviewPayload {
  order_id: number;
  target_user_id: number;
  rating: number;
  text: string;
}

export async function createReview(
  payload: CreateReviewPayload
): Promise<Review> {
  return apiFetch("/reviews/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Админ: сменить статус отзыва
 * PATCH /admin/reviews/{id} → { status }
 */
export async function adminUpdateReviewStatus(
  reviewId: number,
  status: ReviewStatus
): Promise<Review> {
  return apiFetch(`/admin/reviews/${reviewId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
