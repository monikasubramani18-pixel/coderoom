import time

from ratelimit import RateLimiter
from realtime import Peer, RoomHub, Timer


def test_timer_defaults_to_a_stopped_45_minute_countdown():
    assert Timer().snapshot() == {"running": False, "remaining": 2700, "duration": 2700}


def test_timer_start_pause_and_reset():
    timer = Timer(duration=600)
    timer.start()
    assert timer.snapshot()["running"] is True

    timer.pause()
    paused = timer.snapshot()
    assert paused["running"] is False
    assert 598 <= paused["remaining"] <= 600

    timer.reset(minutes=30)
    assert timer.snapshot() == {"running": False, "remaining": 1800, "duration": 1800}


def test_timer_stops_at_zero():
    timer = Timer(duration=60)
    timer.start()
    timer.ends_at = time.time() - 1  # simulate the deadline passing
    assert timer.snapshot() == {"running": False, "remaining": 0, "duration": 60}


def test_presence_counts_each_user_once():
    hub = RoomHub()
    for user_id, name in [(1, "alice"), (1, "alice"), (2, "bob")]:
        hub.add_peer("room", Peer(ws=object(), user_id=user_id, username=name))

    users = hub.online_users("room")
    assert [u["username"] for u in users] == ["alice", "bob"]
    assert hub.has_user("room", 2) and not hub.has_user("room", 3)


def test_rate_limiter_blocks_after_the_limit():
    limiter = RateLimiter(max_calls=2, window_seconds=60)
    assert limiter.allow("k") and limiter.allow("k")
    assert not limiter.allow("k")
    assert limiter.allow("other-key")
