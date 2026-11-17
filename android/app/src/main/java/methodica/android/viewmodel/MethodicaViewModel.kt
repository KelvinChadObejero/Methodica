package methodica.android.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import methodica.android.model.BlockType
import methodica.android.model.Reflection
import methodica.android.model.SampleStudyTypes
import methodica.android.model.StudyBlock
import methodica.android.model.StudyFlow
import methodica.android.model.StudySession
import methodica.android.model.StudyType
import java.util.UUID

class MethodicaViewModel : ViewModel() {

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

    private val _flows = MutableStateFlow<List<StudyFlow>>(defaultFlows)
    val flows: StateFlow<List<StudyFlow>> = _flows.asStateFlow()

    private val _selectedFlowId = MutableStateFlow<String?>(defaultFlows.first().id)
    val selectedFlowId: StateFlow<String?> = _selectedFlowId.asStateFlow()

    val activeFlow: StudyFlow?
        get() = _flows.value.find { it.id == _selectedFlowId.value } ?: _flows.value.firstOrNull()

    // Timer State
    private val _isTimerRunning = MutableStateFlow(false)
    val isTimerRunning: StateFlow<Boolean> = _isTimerRunning.asStateFlow()

    private val _currentBlockIndex = MutableStateFlow(0)
    val currentBlockIndex: StateFlow<Int> = _currentBlockIndex.asStateFlow()

    private val _remainingSeconds = MutableStateFlow(25 * 60)
    val remainingSeconds: StateFlow<Int> = _remainingSeconds.asStateFlow()

    private val _elapsedStudySeconds = MutableStateFlow(0)
    val elapsedStudySeconds: StateFlow<Int> = _elapsedStudySeconds.asStateFlow()

    private val _elapsedBreakSeconds = MutableStateFlow(0)
    val elapsedBreakSeconds: StateFlow<Int> = _elapsedBreakSeconds.asStateFlow()

    private val _timerCompleted = MutableStateFlow(false)
    val timerCompleted: StateFlow<Boolean> = _timerCompleted.asStateFlow()

    // History and Reflections
    private val defaultSessions = listOf(
        StudySession(
            id = "sess-1",
            flowId = "flow-pomodoro-core",
            flowTitle = "Core Pomodoro Focus",
            subject = "Computer Science",
            startTimeMillis = System.currentTimeMillis() - 86400000L * 2,
            totalMinutes = 55,
            completedBlocks = 4,
            totalBlocks = 4,
            reflectionId = "refl-1"
        ),
        StudySession(
            id = "sess-2",
            flowId = "flow-active-recall-math",
            flowTitle = "Math Active Recall & Drill",
            subject = "Mathematics",
            startTimeMillis = System.currentTimeMillis() - 86400000L,
            totalMinutes = 50,
            completedBlocks = 3,
            totalBlocks = 3,
            reflectionId = "refl-2"
        )
    )

    private val defaultReflections = listOf(
        Reflection(
            id = "refl-1",
            sessionId = "sess-1",
            flowTitle = "Core Pomodoro Focus",
            subject = "Computer Science",
            timestampMillis = System.currentTimeMillis() - 86400000L * 2,
            comprehensionScore = 5,
            fatigueScore = 2,
            notes = "Completed binary tree recursion algorithms. Pomodoro breaks kept focus high."
        ),
        Reflection(
            id = "refl-2",
            sessionId = "sess-2",
            flowTitle = "Math Active Recall & Drill",
            subject = "Mathematics",
            timestampMillis = System.currentTimeMillis() - 86400000L,
            comprehensionScore = 4,
            fatigueScore = 3,
            notes = "Integration by parts self-testing went smoothly. Need a quick recap on trig sub."
        )
    )

    private val _sessionHistory = MutableStateFlow<List<StudySession>>(defaultSessions)
    val sessionHistory: StateFlow<List<StudySession>> = _sessionHistory.asStateFlow()

    private val _reflections = MutableStateFlow<List<Reflection>>(defaultReflections)
    val reflections: StateFlow<List<Reflection>> = _reflections.asStateFlow()

    private val _pendingReflectionSession = MutableStateFlow<StudySession?>(null)
    val pendingReflectionSession: StateFlow<StudySession?> = _pendingReflectionSession.asStateFlow()

    val techniques: List<StudyType> = SampleStudyTypes.list

    private var timerJob: Job? = null

    init {
        resetTimerForActiveFlow()
    }

    fun selectFlow(flowId: String) {
        _selectedFlowId.value = flowId
        resetTimerForActiveFlow()
    }

    fun resetTimerForActiveFlow() {
        timerJob?.cancel()
        _isTimerRunning.value = false
        _currentBlockIndex.value = 0
        _elapsedStudySeconds.value = 0
        _elapsedBreakSeconds.value = 0
        _timerCompleted.value = false

        val currentFlow = activeFlow
        if (currentFlow != null && currentFlow.blocks.isNotEmpty()) {
            _remainingSeconds.value = currentFlow.blocks[0].durationMinutes * 60
        } else {
            _remainingSeconds.value = 25 * 60
        }
    }

    fun startTimer() {
        if (_isTimerRunning.value) return
        _isTimerRunning.value = true
        _timerCompleted.value = false

        timerJob = viewModelScope.launch {
            while (_isTimerRunning.value && _remainingSeconds.value > 0) {
                delay(1000L)
                _remainingSeconds.value -= 1

                val currentBlock = activeFlow?.blocks?.getOrNull(_currentBlockIndex.value)
                if (currentBlock != null) {
                    if (currentBlock.type == BlockType.FOCUS || currentBlock.type == BlockType.RECALL) {
                        _elapsedStudySeconds.value += 1
                    } else {
                        _elapsedBreakSeconds.value += 1
                    }
                }

                if (_remainingSeconds.value <= 0) {
                    advanceToNextBlockOrFinish()
                }
            }
        }
    }

    fun pauseTimer() {
        _isTimerRunning.value = false
        timerJob?.cancel()
    }

    fun skipBlock() {
        advanceToNextBlockOrFinish()
    }

    private fun advanceToNextBlockOrFinish() {
        timerJob?.cancel()
        _isTimerRunning.value = false
        val currentFlow = activeFlow ?: return
        val nextIdx = _currentBlockIndex.value + 1

        if (nextIdx < currentFlow.blocks.size) {
            _currentBlockIndex.value = nextIdx
            _remainingSeconds.value = currentFlow.blocks[nextIdx].durationMinutes * 60
            startTimer()
        } else {
            // Session finished!
            _timerCompleted.value = true
            finishSession()
        }
    }

    fun finishSession(): StudySession {
        pauseTimer()
        val currentFlow = activeFlow ?: defaultFlows.first()
        val totalSec = _elapsedStudySeconds.value + _elapsedBreakSeconds.value
        val totalMins = maxOf(1, totalSec / 60)

        val newSession = StudySession(
            id = UUID.randomUUID().toString(),
            flowId = currentFlow.id,
            flowTitle = currentFlow.title,
            subject = currentFlow.subject,
            startTimeMillis = System.currentTimeMillis(),
            totalMinutes = totalMins,
            completedBlocks = _currentBlockIndex.value + 1,
            totalBlocks = currentFlow.blocks.size
        )

        _sessionHistory.value = listOf(newSession) + _sessionHistory.value
        _pendingReflectionSession.value = newSession
        return newSession
    }

    fun saveReflection(
        sessionId: String,
        comprehensionScore: Int,
        fatigueScore: Int,
        notes: String
    ) {
        val session = _sessionHistory.value.find { it.id == sessionId }
        val flowTitle = session?.flowTitle ?: "Study Session"
        val subject = session?.subject ?: "General"

        val reflection = Reflection(
            id = UUID.randomUUID().toString(),
            sessionId = sessionId,
            flowTitle = flowTitle,
            subject = subject,
            timestampMillis = System.currentTimeMillis(),
            comprehensionScore = comprehensionScore,
            fatigueScore = fatigueScore,
            notes = notes
        )

        _reflections.value = listOf(reflection) + _reflections.value

        // Update session with reflectionId
        _sessionHistory.value = _sessionHistory.value.map {
            if (it.id == sessionId) it.copy(reflectionId = reflection.id) else it
        }

        if (_pendingReflectionSession.value?.id == sessionId) {
            _pendingReflectionSession.value = null
        }
    }

    fun saveNewFlow(title: String, subject: String, description: String, blocks: List<StudyBlock>): StudyFlow {
        val newFlow = StudyFlow(
            id = UUID.randomUUID().toString(),
            title = title.ifBlank { "Custom Flow" },
            subject = subject.ifBlank { "General" },
            description = description,
            blocks = blocks
        )
        _flows.value = _flows.value + newFlow
        selectFlow(newFlow.id)
        return newFlow
    }

    fun updateFlow(flow: StudyFlow) {
        _flows.value = _flows.value.map { if (it.id == flow.id) flow else it }
        if (_selectedFlowId.value == flow.id) {
            resetTimerForActiveFlow()
        }
    }

    fun deleteFlow(flowId: String) {
        if (_flows.value.size <= 1) return // Keep at least one flow
        _flows.value = _flows.value.filter { it.id != flowId }
        if (_selectedFlowId.value == flowId) {
            _selectedFlowId.value = _flows.value.first().id
            resetTimerForActiveFlow()
        }
    }

    fun loadTechniqueAsFlow(technique: StudyType): StudyFlow {
        val newFlow = StudyFlow(
            id = UUID.randomUUID().toString(),
            title = technique.name,
            description = technique.shortSummary,
            subject = "Technique Template",
            blocks = technique.starterBlocks.map { it.copy(id = UUID.randomUUID().toString()) },
            isTemplate = true
        )
        _flows.value = _flows.value + newFlow
        selectFlow(newFlow.id)
        return newFlow
    }

    fun importCommunityFlow(title: String, subject: String, blocks: List<StudyBlock>): StudyFlow {
        val imported = StudyFlow(
            id = UUID.randomUUID().toString(),
            title = title,
            subject = subject,
            description = "Imported from Community Hub",
            blocks = blocks
        )
        _flows.value = _flows.value + imported
        selectFlow(imported.id)
        return imported
    }
}
