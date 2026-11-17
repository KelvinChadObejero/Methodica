package methodica.android

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import methodica.android.data.DeviceWorkspaceStore
import methodica.android.model.BlockType
import methodica.android.model.StudyBlock
import methodica.android.viewmodel.MethodicaViewModel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.util.UUID

@RunWith(AndroidJUnit4::class)
class DeviceWorkspaceStoreTest {
    @Test
    fun flowSessionAndReflectionSurviveCreatingANewViewModelFromDisk() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val directory = File(instrumentation.targetContext.cacheDir, "workspace-test-${UUID.randomUUID()}")
        try {
            instrumentation.runOnMainSync {
                var elapsed = 0L
                val original = MethodicaViewModel(DeviceWorkspaceStore(directory), monotonicNow = { elapsed })
                val flow = checkNotNull(original.saveNewFlow("Exam prep", "History", "Two blocks", listOf(
                    StudyBlock(title = "Review", durationMinutes = 1),
                    StudyBlock(title = "Rest", durationMinutes = 1, type = BlockType.SHORT_BREAK)
                )))
                original.startTimer()
                elapsed = 125_000L
                val session = checkNotNull(original.finishSession())
                assertEquals(session.id, original.finishSession()?.id)
                assertTrue(original.saveReflection(session.id, 4, 3, "Review dates again."))

                val restored = MethodicaViewModel(DeviceWorkspaceStore(directory))
                assertEquals(flow, restored.activeFlow)
                assertEquals(session.id, restored.sessionHistory.value.single().id)
                assertEquals(120, restored.sessionHistory.value.single().totalSeconds)
                assertEquals(60, restored.sessionHistory.value.single().focusSeconds)
                assertEquals("Review dates again.", restored.reflections.value.single().notes)
            }
        } finally {
            directory.deleteRecursively()
        }
    }
}
