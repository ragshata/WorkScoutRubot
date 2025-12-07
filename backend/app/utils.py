# app/utils.py

from typing import List, Optional


def str_to_list(value: Optional[str]) -> List[str]:
    if not value:
        return []
    return [item for item in value.split(",") if item]


def list_to_str(values: Optional[List[str]]) -> Optional[str]:
    if not values:
        return None
    cleaned = [v.strip() for v in values if v and v.strip()]
    return ",".join(cleaned) if cleaned else None
