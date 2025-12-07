# tests/test_orders_flow.py

from datetime import date


def _headers_for(user):
    return {"X-User-Id": str(user.id)}


def test_order_lifecycle(
    client,
    db_session,
    customer,
    executor,
):
    # 1) Клиент создаёт заказ
    create_payload = {
        "title": "Положить плитку в ванной",
        "description": "Нужно положить плитку 10 м2",
        "city": "Москва",
        "address": "ул. Пушкина, дом Колотушкина",
        "categories": ["отделка", "плитка"],
        "budget_type": "fixed",
        "budget_amount": 30000,
        "start_date": str(date.today()),
        "end_date": None,
    }

    r = client.post(
        "/api/v1/orders/",
        json=create_payload,
        headers=_headers_for(customer),
    )
    assert r.status_code == 200
    order = r.json()
    order_id = order["id"]
    assert order["status"] == "active"

    # 2) Исполнитель видит заказ в available
    r = client.get(
        "/api/v1/orders/available",
        headers=_headers_for(executor),
    )
    print("DEBUG /orders/available:", r.status_code, r.text)  # 👈 добавить
    assert r.status_code == 200
    orders = r.json()
    assert any(o["id"] == order_id for o in orders)

    # 3) Исполнитель отправляет отклик
    resp_payload = {
        "price": 28000,
        "discuss_price": False,
        "comment": "Сделаю за 2 дня",
    }
    r = client.post(
        f"/api/v1/orders/{order_id}/responses",
        json=resp_payload,
        headers=_headers_for(executor),
    )
    assert r.status_code == 204

    # 4) Клиент смотрит отклики по заказу
    r = client.get(
        f"/api/v1/orders/{order_id}/responses",
        headers=_headers_for(customer),
    )
    assert r.status_code == 200
    responses = r.json()
    assert len(responses) == 1
    resp_data = responses[0]
    assert resp_data["price"] == 28000
    assert resp_data["executor"]["id"] == executor.id
    response_id = resp_data["id"]

    # 5) Клиент выбирает исполнителя
    choose_payload = {"response_id": response_id}
    r = client.post(
        f"/api/v1/orders/{order_id}/choose_executor",
        json=choose_payload,
        headers=_headers_for(customer),
    )
    assert r.status_code == 200
    updated_order = r.json()
    assert updated_order["status"] == "in_progress"
    assert updated_order["executor_id"] == executor.id

    # 6) Клиент жмёт "показать контакты"
    r = client.post(
        f"/api/v1/orders/{order_id}/show-contacts",
        headers=_headers_for(customer),
    )
    assert r.status_code == 200
    contacts_state = r.json()
    assert contacts_state["customer_accepted"] is True
    assert contacts_state["executor_accepted"] is False
    assert contacts_state["both_accepted"] is False

    # 7) Исполнитель жмёт "показать контакты"
    r = client.post(
        f"/api/v1/orders/{order_id}/show-contacts",
        headers=_headers_for(executor),
    )
    assert r.status_code == 200
    contacts_state = r.json()
    assert contacts_state["customer_accepted"] is True
    assert contacts_state["executor_accepted"] is True
    assert contacts_state["both_accepted"] is True
    assert contacts_state["customer"] is not None
    assert contacts_state["executor"] is not None

    # 8) Заказ завершается
    r = client.post(
        f"/api/v1/orders/{order_id}/complete",
        headers=_headers_for(customer),
    )
    assert r.status_code == 200
    done_order = r.json()
    assert done_order["status"] == "done"
