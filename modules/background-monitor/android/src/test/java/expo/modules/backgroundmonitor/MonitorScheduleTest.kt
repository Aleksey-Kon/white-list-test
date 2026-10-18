package expo.modules.backgroundmonitor

import org.junit.Assert.assertEquals
import org.junit.Test

class MonitorScheduleTest {
  @Test fun checkDurationDoesNotShiftTheNextDeadline() {
    assertEquals(1_800_000L, MonitorSchedule.nextDeadline(900_000L, 915_000L, 900_000L))
  }

  @Test fun missedIntervalsCoalesceIntoOneFutureDeadline() {
    assertEquals(4_500_000L, MonitorSchedule.nextDeadline(900_000L, 3_700_000L, 900_000L))
  }

  @Test fun anOnTimeCheckAdvancesExactlyOneInterval() {
    assertEquals(1_800_000L, MonitorSchedule.nextDeadline(900_000L, 900_000L, 900_000L))
  }
}
