# tests/test_reviews.py

def _headers_for(user):
    return {"X-User-Id": str(user.id)}


def test_reviews_flow(
    client,
    db_session,
    customer,
    executor,
    admin,
):
    # Создаём заказ сразу со статусом done, чтобы не повторять весь flow
    from app.models.order import Order

    order = Order(
        customer_id=customer.id,
        executor_id=executor.id,
        title="Покрасить стены",
        description="Покрасить 20м2",
        city="Москва",
        address="ул. Тестовая, 1",
        categories_raw="малярные работы",
        budget_type="fixed",
        budget_amount=15000,
        start_date=None,
        end_date=None,
        status="done",
        has_photos=False,
    )
    db_session.add(order)
    db_session.commit()
    db_session.refresh(order)

    # 1) Клиент оставляет отзыв исполнителю
    review_payload = {
        "order_id": order.id,
        "target_user_id": executor.id,
        "rating": 5,
        "text": "Сделано отлично!",
    }
    r = client.post(
        "/api/v1/reviews",
        json=review_payload,
        headers=_headers_for(customer),
    )
    assert r.status_code == 201
    review = r.json()
    review_id = review["id"]
    assert review["rating"] == 5
    assert review["status"] == "pending"

    # 2) Админ одобряет отзыв
    r = client.patch(
        f"/api/v1/admin/reviews/{review_id}",
        json={"status": "approved"},
        headers=_headers_for(admin),
    )
    assert r.status_code == 200
    review = r.json()
    assert review["status"] == "approved"

    # 3) В /reviews/for-user/{executor_id} должен появиться рейтинг
    r = client.get(
        f"/api/v1/reviews/for-user/{executor.id}",
        headers=_headers_for(customer),
    )
    assert r.status_code == 200
    summary = r.json()
    assert summary["user_id"] == executor.id
    assert summary["reviews_count"] == 1
    assert summary["rating"] == 5.0
    assert len(summary["reviews"]) == 1

    # 4) В профиле исполнителя тоже должен отображаться рейтинг
    r = client.get(
        f"/api/v1/users/{executor.id}",
        headers=_headers_for(customer),
    )
    assert r.status_code == 200
    user_profile = r.json()
    assert user_profile["rating"] == 5.0
    assert user_profile["has_reviews"] is True
    assert user_profile["reviews_count"] == 1
