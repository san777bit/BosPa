"""Проверка подписи Telegram WebApp initData.

https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
"""

import hashlib
import hmac
import json
from urllib.parse import parse_qsl

MAX_AGE_S = 24 * 3600


def verify_init_data(init_data: str, bot_token: str, now: float) -> dict | None:
    """Данные пользователя, если подпись верна и не устарела, иначе None."""
    try:
        pairs = dict(parse_qsl(init_data, keep_blank_values=True, strict_parsing=True))
    except ValueError:
        return None
    received_hash = pairs.pop("hash", None)
    if not received_hash:
        return None
    check_string = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    expected = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, received_hash):
        return None
    try:
        if now - int(pairs.get("auth_date", "0")) > MAX_AGE_S:
            return None
        return json.loads(pairs.get("user", "{}"))
    except ValueError:
        return None
