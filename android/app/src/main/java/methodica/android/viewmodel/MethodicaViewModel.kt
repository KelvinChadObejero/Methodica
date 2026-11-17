package methodica.android.viewmodel

import android.os.SystemClock
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import methodica.android.data.Workspace
import methodica.android.data.WorkspaceStore
import methodica.android.model.BlockType
import methodica.android.model.Reflection
import methodica.android.model.SampleStudyTypes
import methodica.android.model.StudyBlock
import methodica.android.model.StudyFlow
import methodica.android.model.StudySession
import methodica.android.model.StudyTimer
import methodica.android.model.StudyType
import java.util.UUID

class MethodicaViewModel(
    private val store: WorkspaceStore,
    private val monotonicNow: () -> Long = SystemClock::elapsedRealtime,
    private val wallNow: () -> Long = System::currentTimeMillis
) : ViewModel() {

    // Default Sample Flows
    private val defaultFlows = listOf(
        StudyFlow(
            id = "flow-pomodoro-core",
            title = "Core Pomodoro Focus",
            description = "Standard 25min study sprint with 5min breaks.",
            subject = "General Study",
            blocks = listOf(
                StudyBlock(title = "Focus Sprint 1", durationMinutes = 25, type = BlockType.FOCUS),
                StudyBlock(title = "Rest & Stretch", durationMinutes = 5, type = BlockType.SHORT_BREAK),
                StudyBlock(title = "Focus Sprint 2", durationMinutes = 25, type = BlockType.FOCUS),
                StudyBlock(title = "Long Recovery Break", durationMinutes = 15, type = BlockType.LONG_BREAK)
            )
        ),
        StudyFlow(
            id = "flow-active-recall-math",
            title = "Math Active Recall & Drill",
            description = "30min theory review followed by 15min self-testing.",
            subject = "Mathematics",
            blocks = listOf(
                StudyBlock(title = "Formula Review & Practice", durationMinutes = 30, type = BlockType.FOCUS),
                StudyBlock(title = "Active Formula Self-Test", durationMinutes = 15, type = BlockType.RECALL),
                StudyBlock(title = "Hydration Break", durationMinutes = 5, type = BlockType.SHORT_BREAK)
            )
        ),
        StudyFlow(
            id = "flow-feynman-physics",
            title = "Physics Feynman Breakdown",
            description = "Isolate physics concepts and explain in plain language.",
            subject = "Physics",
            blocks = listOf(
                StudyBlock(title = "Concept Study", durationMinutes = 20, type = BlockType.FOCUS),
                StudyBlock(title = "Plain English Draft", durationMinutes = 15, type = BlockType.RECALL),
                StudyBlock(title = "Refine Gaps", durationMinutes = 15, type = BlockType.FOCUS)
            )
        )
    )

    private val _storageError = MutableStateFlow<String?>(null)
    val storageError = _storageError.asStateFlow()
    private var storageReadable = true
    private var workspace = try {
        store.load() ?: Workspace(flows = defaultFlows, selectedFlowId = defaultFlows.first().id)
    } catch (_: Exception) {
        storageReadable = false
        _storageError.value = "Could not open the saved workspace. Reopen Methodica to try again."
        Workspace(flows = emptyList())
    }

    private val _flows = MutableStateFlow(workspace.flows)
    val flows = _flows.asStateFlow()
    private val _selectedFlowId = MutableStateFlow(workspace.selectedFlowId)
    val selectedFlowId = _selectedFlowId.asStateFlow()
    val activeFlow: StudyFlow?
        get() = _flows.value.find { it.id == _selectedFlowId.value } ?: _flows.value.firstOrNull()

    private val _sessionHistory = MutableStateFlow(workspace.sessions)
    val sessionHistory = _sessionHistory.asStateFlow()
    private val _reflections = MutableStateFlow(workspace.reflections)
    val reflections = _reflections.asStateFlow()
    private val _pendingReflectionSession = MutableStateFlow<StudySession?>(null)
    val pendingReflectionSession = _pendingReflectionSession.asStateFlow()
    val techniques: List<StudyType> = SampleStudyTypes.list

    private var timer: StudyTimer? = activeFlow?.let(::StudyTimer)
    private var timerJob: Job? = null
    private val _timerFlow = MutableStateFlow(timer?.flow)
    val timerFlow = _timerFlow.asStateFlow()
    private val _isTimerRunning = MutableStateFlow(false)
    val isTimerRunning = _isTimerRunning.asStateFlow()
    private val _currentBlockIndex = MutableStateFlow(0)
    val currentBlockIndex = _currentBlockIndex.asStateFlow()
    private val _remainingSeconds = MutableStateFlow(timer?.remainingSeconds ?: 0)
    val remainingSeconds = _remainingSeconds.asStateFlow()
    private val _elapsedStudySeconds = MutableStateFlow(0)
    val elapsedStudySeconds = _elapsedStudySeconds.asStateFlow()
    private val _elapsedBreakSeconds = MutableStateFlow(0)
    val elapsedBreakSeconds = _elapsedBreakSeconds.asStateFlow()
    private val _timerCompleted = MutableStateFlow(false)
    val timerCompleted = _timerCompleted.asStateFlow()
    private val _timerStarted = MutableStateFlow(false)
    val timerStarted = _timerStarted.asStateFlow()
    private val _canSaveSession = MutableStateFlow(false)
    val canSaveSession = _canSaveSession.asStateFlow()

    fun selectFlow(flowId: String) {
        if (flowId == _selectedFlowId.value || workspace.flows.none { it.id == flowId }) return
        if (commit(workspace.copy(selectedFlowId = flowId))) refreshIdleTimer()
    }

    fun startTimer() {
        if (!storageReadable) return
        if (timer?.completed == true) {
            val finished = timer?.session()
            if (finished != null && saveSession(finished) == null) return
            timer = activeFlow?.let(::StudyTimer)
        }
        val run = timer ?: return
        if (run.running) return
        run.start(monotonicNow(), wallNow())
        publishTimer()
        if (!run.running) return
        timerJob = viewModelScope.launch {
            while (run.running) {
                delay(250)
                run.advance(monotonicNow())
                publishTimer()
                run.session()?.let(::saveSession)
            }
        }
    }

    fun pauseTimer() {
        val run = timer ?: return
        run.pause(monotonicNow())
        timerJob?.cancel()
        publishTimer()
        run.session()?.let(::saveSession)
    }

    fun skipBlock() {
        val run = timer ?: return
        run.skip(monotonicNow())
        if (!run.running) timerJob?.cancel()
        publishTimer()
        run.session()?.let(::saveSession)
    }

    fun finishSession(): StudySession? {
        val run = timer ?: return null
        val session = run.end(monotonicNow())
        if (!run.running) timerJob?.cancel()
        publishTimer()
        val saved = session?.let(::saveSession)
        if (saved != null) _pendingReflectionSession.value = saved
        return saved
    }

    private fun saveSession(session: StudySession): StudySession? =
        workspace.sessions.find { it.id == session.id } ?: session.takeIf {
            commit(workspace.copy(sessions = listOf(session) + workspace.sessions))
        }

    fun selectReflectionSession(sessionId: String) {
        _pendingReflectionSession.value = workspace.sessions.firstOrNull { it.id == sessionId }
    }

    fun saveReflection(sessionId: String, comprehensionScore: Int, fatigueScore: Int, notes: String): Boolean {
        val session = workspace.sessions.firstOrNull { it.id == sessionId } ?: return false
        if (comprehensionScore !in 1..5 || fatigueScore !in 1..5) return false
        val existing = workspace.reflections.firstOrNull { it.sessionId == sessionId }
        val reflection = Reflection(
            id = existing?.id ?: UUID.randomUUID().toString(),
            sessionId = sessionId,
            flowTitle = session.flowTitle,
            subject = session.subject,
            timestampMillis = wallNow(),
            comprehensionScore = comprehensionScore,
            fatigueScore = fatigueScore,
            notes = notes.trim()
        )
        val saved = commit(workspace.copy(
            sessions = workspace.sessions.map {
                if (it.id == sessionId) it.copy(reflectionId = reflection.id) else it
            },
            reflections = listOf(reflection) + workspace.reflections.filterNot { it.sessionId == sessionId }
        ))
        if (saved && _pendingReflectionSession.value?.id == sessionId) _pendingReflectionSession.value = null
        return saved
    }

    fun saveNewFlow(title: String, subject: String, description: String, blocks: List<StudyBlock>): StudyFlow? =
        addFlow(StudyFlow(
            title = title.ifBlank { "Custom Flow" },
            subject = subject.ifBlank { "General" },
            description = description,
            blocks = blocks
        ))

    fun updateFlow(flow: StudyFlow): Boolean {
        if (workspace.flows.none { it.id == flow.id }) return false
        if (!commit(workspace.copy(flows = workspace.flows.map { if (it.id == flow.id) flow else it }))) return false
        refreshIdleTimer()
        return true
    }

    fun deleteFlow(flowId: String) {
        if (workspace.flows.size <= 1 || workspace.flows.none { it.id == flowId }) return
        val remaining = workspace.flows.filterNot { it.id == flowId }
        val selected = if (workspace.selectedFlowId == flowId) remaining.first().id else workspace.selectedFlowId
        if (commit(workspace.copy(flows = remaining, selectedFlowId = selected))) refreshIdleTimer()
    }

    fun loadTechniqueAsFlow(technique: StudyType): StudyFlow? = addFlow(StudyFlow(
        title = technique.name,
        description = technique.shortSummary,
        subject = "Technique Template",
        blocks = technique.starterBlocks.map { it.copy(id = UUID.randomUUID().toString()) },
        isTemplate = true
    ))

    fun importCommunityFlow(title: String, subject: String, blocks: List<StudyBlock>): StudyFlow? = addFlow(StudyFlow(
        title = title,
        subject = subject,
        description = "Imported from Community Hub",
        blocks = blocks.map { it.copy(id = UUID.randomUUID().toString()) }
    ))

    private fun addFlow(flow: StudyFlow): StudyFlow? {
        if (!commit(workspace.copy(flows = workspace.flows + flow, selectedFlowId = flow.id))) return null
        refreshIdleTimer()
        return flow
    }

    private fun refreshIdleTimer() {
        if (timer?.started == true && timer?.completed != true) return
        val finished = timer?.session()
        if (finished != null && workspace.sessions.none { it.id == finished.id }) return
        timer = activeFlow?.let(::StudyTimer)
        publishTimer()
    }

    private fun publishTimer() {
        val run = timer
        _timerFlow.value = run?.flow
        _isTimerRunning.value = run?.running == true
        _currentBlockIndex.value = run?.blockIndex ?: 0
        _remainingSeconds.value = run?.remainingSeconds ?: 0
        _elapsedStudySeconds.value = run?.elapsedStudySeconds ?: 0
        _elapsedBreakSeconds.value = run?.elapsedBreakSeconds ?: 0
        _timerStarted.value = run?.started == true
        _timerCompleted.value = run?.completed == true
        _canSaveSession.value = run?.canSave == true
    }

    private fun commit(next: Workspace): Boolean {
        if (!storageReadable) return false
        try {
            store.save(next)
        } catch (_: Exception) {
            _storageError.value = "Could not save to this device. Try again."
            return false
        }
        workspace = next
        _flows.value = next.flows
        _selectedFlowId.value = next.selectedFlowId
        _sessionHistory.value = next.sessions
        _reflections.value = next.reflections
        _storageError.value = null
        return true
    }
}
