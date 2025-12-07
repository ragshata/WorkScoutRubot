# tests/test_support.py

def _headers_for(user):
    return {"X-User-Id": str(user.id)}


def test_support_user_and_admin_flow(
    client,
    customer,
    admin,
):
    # 1) Пользователь создаёт тикет
    payload = {
        "topic": "Проблема с исполнителем",
        "message": "Исполнитель не приехал на объект.",
    }
    r = client.post(
        "/api/v1/support",
        json=payload,
        headers=_headers_for(customer),
    )
    assert r.status_code == 201
    ticket = r.json()
    ticket_id = ticket["id"]
    assert ticket["status"] == "open"

    # 2) Пользователь видит свой тикет в /support/my
    r = client.get(
        "/api/v1/support/my",
        headers=_headers_for(customer),
    )
    assert r.status_code == 200
    my_tickets = r.json()
    assert any(t["id"] == ticket_id for t in my_tickets)

    # 3) Админ видит тикет в /admin/support
    r = client.get(
        "/api/v1/admin/support",
        headers=_headers_for(admin),
    )
    assert r.status_code == 200
    admin_list = r.json()
    assert any(t["id"] == ticket_id for t in admin_list)

    # 4) Админ меняет статус на in_progress
    r = client.patch(
        f"/api/v1/admin/support/{ticket_id}",
        json={"status": "in_progress"},
        headers=_headers_for(admin),
    )
    assert r.status_code == 200
    updated = r.json()
    assert updated["status"] == "in_progress"
