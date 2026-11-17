package methodica.android

import methodica.android.model.BlockType
import methodica.android.model.StudyBlock
import methodica.android.viewmodel.MethodicaViewModel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class MethodicaViewModelTest {

    private lateinit var viewModel: MethodicaViewModel

    @Before
    fun setup() {
        viewModel = MethodicaViewModel()
    }

    @Test
    fun defaultFlowsAreLoaded() {
        val flows = viewModel.flows.value
        assertTrue(flows.isNotEmpty())
        assertNotNull(viewModel.activeFlow)
    }

    @Test
    fun saveNewFlowAddsToStateAndSelectsIt() {
        val initialCount = viewModel.flows.value.size
        val blocks = listOf(
            StudyBlock(title = "Focus 1", durationMinutes = 20, type = BlockType.FOCUS),
            StudyBlock(title = "Break 1", durationMinutes = 5, type = BlockType.SHORT_BREAK)
        )
        val created = viewModel.saveNewFlow(
            title = "Organic Chemistry Sprint",
            subject = "Chemistry",
            description = "Reaction mechanisms focus",
            blocks = blocks
        )

        assertEquals(initialCount + 1, viewModel.flows.value.size)
        assertEquals(created.id, viewModel.selectedFlowId.value)
        assertEquals("Organic Chemistry Sprint", viewModel.activeFlow?.title)
    }

    @Test
    fun finishSessionAndSaveReflectionRecordsSession() {
        val initialSessionCount = viewModel.sessionHistory.value.size
        val session = viewModel.finishSession()

        assertEquals(initialSessionCount + 1, viewModel.sessionHistory.value.size)

        viewModel.saveReflection(
            sessionId = session.id,
            comprehensionScore = 5,
            fatigueScore = 2,
            notes = "Great session on algorithms"
        )

        val updatedSession = viewModel.sessionHistory.value.find { it.id == session.id }
        assertNotNull(updatedSession?.reflectionId)
        val reflection = viewModel.reflections.value.find { it.sessionId == session.id }
        assertNotNull(reflection)
        assertEquals(5, reflection?.comprehensionScore)
    }

    @Test
    fun loadTechniqueAsFlowCreatesValidFlow() {
        val technique = viewModel.techniques.first { it.id == "pomodoro" }
        val flow = viewModel.loadTechniqueAsFlow(technique)

        assertEquals("Pomodoro Technique", flow.title)
        assertTrue(flow.blocks.isNotEmpty())
        assertEquals(flow.id, viewModel.selectedFlowId.value)
    }
}
