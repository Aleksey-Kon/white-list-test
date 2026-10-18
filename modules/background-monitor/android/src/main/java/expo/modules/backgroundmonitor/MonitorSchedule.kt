package expo.modules.backgroundmonitor

internal object MonitorSchedule {
  // Advance from the previous deadline, not completion time. Missed checks are
  // coalesced; resuming after a long sleep must not cause a burst of requests.
  fun nextDeadline(previous: Long, now: Long, interval: Long): Long {
    require(interval > 0)
    return previous + ((now - previous).coerceAtLeast(0) / interval + 1) * interval
  }
}
