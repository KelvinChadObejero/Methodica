package methodica.android

import methodica.android.data.Workspace
import methodica.android.data.WorkspaceStore
import methodica.android.model.BlockType
import methodica.android.model.StudyBlock
import methodica.android.model.StudySession
import methodica.android.viewmodel.MethodicaViewModel
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class MethodicaViewModelTest {
    private lateinit var viewModel: MethodicaViewModel
    private lateinit var store: TestWorkspaceStore

    @Before
    fun setup() {
        store = TestWorkspaceStore()
        viewModel = MethodicaViewModel(store, monotonicNow = { 0L }, wallNow = { 10L })
    }

    @Test
    fun starterFlowsAreAvailableWithAnEmptyHistory() {
        assertTrue(viewModel.flows.value.isNotEmpty())
        assertNotNull(viewModel.activeFlow)
        assertTrue(viewModel.sessionHistory.value.isEmpty())
        assertTrue(viewModel.reflections.value.isEmpty())
    }

    @Test
    fun saveNewFlowAddsToStateAndSelectsIt() {
        val initialCount = viewModel.flows.value.size
        val blocks = listOf(
            StudyBlock(title = "Focus 1", durationMinutes = 20, type = BlockType.FOCUS),
            StudyBlock(title = "Break 1", durationMinutes = 5, type = BlockType.SHORT_BREAK)
        )
        val created = checkNotNull(viewModel.saveNewFlow(
            title = "Organic Chemistry Sprint",
            subject = "Chemistry",
            description = "Reaction mechanisms focus",
            blocks = blocks
        ))
        assertEquals(initialCount + 1, viewModel.flows.value.size)
        assertEquals(created.id, viewModel.selectedFlowId.value)
        assertEquals(created, MethodicaViewModel(store).activeFlow)
    }

    @Test
    fun emptyRunCannotCreateSession() {
        assertNull(viewModel.finishSession())
        assertTrue(viewModel.sessionHistory.value.isEmpty())
    }

    @Test
    fun savedReflectionCanBeEditedAfterReopeningWorkspace() {
        val flow = checkNotNull(viewModel.activeFlow)
        val session = StudySession(
            flowId = flow.id, flowTitle = flow.title, subject = flow.subject,
            totalSeconds = 30, focusSeconds = 30, completedBlocks = 0, totalBlocks = flow.blocks.size
        )
        store.save(Workspace(flows = listOf(flow), sessions = listOf(session)))
        val first = MethodicaViewModel(store)
        assertFalse(first.saveReflection("unknown", 5, 2, "Unknown session"))
        assertTrue(first.saveReflection(session.id, 5, 2, "First draft"))
        val original = first.reflections.value.single()

        val second = MethodicaViewModel(store)
        assertEquals(original, second.reflections.value.single())
        assertTrue(second.saveReflection(session.id, 4, 3, "Revised reflection"))

        val restored = MethodicaViewModel(store)
        val edited = restored.reflections.value.single()
        assertEquals(original.id, edited.id)
        assertEquals("Revised reflection", edited.notes)
        assertEquals(edited.id, restored.sessionHistory.value.single().reflectionId)
    }

    @Test
    fun failedWriteDoesNotPublishAnUnstoredFlow() {
        val old = viewModel.flows.value
        store.failWrites = true
        assertNull(viewModel.saveNewFlow("Title", "Subject", "", emptyList()))
        assertEquals(old, viewModel.flows.value)
        assertNotNull(viewModel.storageError.value)
    }

    @Test
    fun loadTechniqueAsFlowCreatesValidFlow() {
        val technique = viewModel.techniques.first { it.id == "pomodoro" }
        val flow = checkNotNull(viewModel.loadTechniqueAsFlow(technique))
        assertEquals("Pomodoro Technique", flow.title)
        assertTrue(flow.blocks.isNotEmpty())
        assertEquals(flow.id, viewModel.selectedFlowId.value)
    }

    private class TestWorkspaceStore : WorkspaceStore {
        private var snapshot: Workspace? = null
        var failWrites = false

        override fun load(): Workspace? = snapshot

        override fun save(workspace: Workspace) {
            check(!failWrites)
            snapshot = workspace
        }
    }
}
