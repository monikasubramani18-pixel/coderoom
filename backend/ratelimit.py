"""Minimal in-memory sliding-window rate limiter.

State lives in process memory, so limits are per server instance.
Use Redis if the API is ever scaled across multiple instances.
"""

import threading
import time
from collections import defaultdict, deque


class RateLimiter:
    def __init__(self, max_calls: int, window_seconds: float):
        self.max_calls = max_calls
        self.window_seconds = window_seconds
        self._calls: dict[object, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: object) -> bool:
        """Record a call for `key` and return False if it exceeds the limit."""
        now = time.monotonic()
        with self._lock:
            calls = self._calls[key]
            while calls and now - calls[0] > self.window_seconds:
                calls.popleft()
            if len(calls) >= self.max_calls:
                return False
            calls.append(now)
            return True
