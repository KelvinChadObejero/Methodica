package methodica.android

import methodica.android.model.BlockType
import methodica.android.model.StudyBlock
import methodica.android.model.StudyFlow
import methodica.android.model.StudyTimer
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class StudyTimerTest {
    private val flow = StudyFlow(title = "Two blocks", blocks = listOf(
        StudyBlock(title = "Focus", durationMinutes = 1),
        StudyBlock(title = "Break", durationMinutes = 1, type = BlockType.SHORT_BREAK)
    ))

    @Test
    fun delayedTickCompletesBothBlocksAndKeepsBreakOutOfFocusTime() {
        val timer = StudyTimer(flow)
        timer.start(now = 0, wallTimeMillis = 500)
        timer.advance(150_000)
        val session = checkNotNull(timer.session())

        assertTrue(timer.completed)
        assertFalse(timer.running)
        assertEquals(120, session.totalSeconds)
        assertEquals(60, session.focusSeconds)
        assertEquals(2, session.completedBlocks)
        assertEquals(500L, session.startTimeMillis)
        assertEquals(session, timer.end(180_000))
    }

    @Test
    fun pauseAndSkipKeepMeasuredTimeWithoutCompletingSkippedBlock() {
        val timer = StudyTimer(flow)
        timer.start(now = 0, wallTimeMillis = 500)
        timer.pause(12_000)
        timer.skip(31_000)
        assertFalse(timer.running)
        assertEquals(60, timer.remainingSeconds)

        timer.start(now = 60_000, wallTimeMillis = 600)
        val session = checkNotNull(timer.end(65_000))
        assertEquals(17, session.totalSeconds)
        assertEquals(12, session.focusSeconds)
        assertEquals(0, session.completedBlocks)
        assertEquals(500L, session.startTimeMillis)
    }

    @Test
    fun cannotSaveBeforeMeasuringOneSecond() {
        val timer = StudyTimer(flow)
        assertNull(timer.end(500))
        timer.start(now = 500, wallTimeMillis = 1000)
        assertNull(timer.end(1499))
        assertTrue(timer.running)
        assertEquals(1, timer.end(1500)?.totalSeconds)
    }
}
