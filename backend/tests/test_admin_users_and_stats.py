# tests/test_admin_users_and_stats.py

def _headers_for(user):
    return {"X-User-Id": str(user.id)}


def test_admin_can_block_and_unblock_user(
    client,
    db_session,
    executor,
    admin,
):
    # 1) Админ видит список юзеров
    r = client.get(
        "/api/v1/admin/users",
        headers=_headers_for(admin),
    )
    assert r.status_code == 200
    users = r.json()
    assert any(u["id"] == executor.id for u in users)

    # 2) Админ блокирует исполнителя
    r = client.patch(
        f"/api/v1/admin/users/{executor.id}/block",
        headers=_headers_for(admin),
    )
    assert r.status_code == 200
    blocked = r.json()
    assert blocked["is_blocked"] is True

    # 3) Заблокированный пользователь не может ходить в API
    r = client.get(
        "/api/v1/users/me",
        headers=_headers_for(executor),
    )
    assert r.status_code == 403

    # 4) Админ разблокирует пользователя
    r = client.patch(
        f"/api/v1/admin/users/{executor.id}/unblock",
        headers=_headers_for(admin),
    )
    assert r.status_code == 200
    unblocked = r.json()
    assert unblocked["is_blocked"] is False

    # 5) Теперь снова может получить /users/me
    r = client.get(
        "/api/v1/users/me",
        headers=_headers_for(executor),
    )
    assert r.status_code == 200
    me = r.json()
    assert me["id"] == executor.id


def test_admin_stats(
    client,
    admin,
):
    # Просто проверяем, что эндпоинт жив и отдаёт нужные поля
    r = client.get(
        "/api/v1/admin/stats",
        headers=_headers_for(admin),
    )
    assert r.status_code == 200
    data = r.json()

    assert "total_users" in data
    assert "total_customers" in data
    assert "total_executors" in data
    assert "total_admins" in data

    assert "total_orders" in data
    assert "orders_by_status" in data
    assert "total_responses" in data
    assert "total_reviews" in data
    assert "approved_reviews" in data
    assert "avg_time_to_first_response_hours" in data
