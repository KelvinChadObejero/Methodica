package methodica.android.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import methodica.android.model.Reflection
import methodica.android.model.StudyBlock
import methodica.android.model.StudyFlow
import methodica.android.model.StudySession
import methodica.android.model.StudyType
import methodica.android.navigation.MethodicaBottomBar
import methodica.android.navigation.MethodicaTopBar
import methodica.android.navigation.Screen
import methodica.android.theme.MethodicaTheme
import methodica.android.ui.screens.CommunityScreen
import methodica.android.ui.screens.DashboardScreen
import methodica.android.ui.screens.FlowBuilderScreen
import methodica.android.ui.screens.HistoryScreen
import methodica.android.ui.screens.PhonePreview
import methodica.android.ui.screens.ReflectionScreen
import methodica.android.ui.screens.ScreenPreviewData
import methodica.android.ui.screens.SettingsScreen
import methodica.android.ui.screens.TechniquesScreen
import methodica.android.ui.screens.TimerScreen
import methodica.android.viewmodel.MethodicaViewModel

@Composable
fun MethodicaApp(
    viewModel: MethodicaViewModel
) {
    val flows by viewModel.flows.collectAsState()
    val selectedFlowId by viewModel.selectedFlowId.collectAsState()
    val activeFlow = flows.firstOrNull { it.id == selectedFlowId } ?: flows.firstOrNull()
    val timerFlow by viewModel.timerFlow.collectAsState()
    val isTimerRunning by viewModel.isTimerRunning.collectAsState()
    val currentBlockIndex by viewModel.currentBlockIndex.collectAsState()
    val remainingSeconds by viewModel.remainingSeconds.collectAsState()
    val elapsedStudySeconds by viewModel.elapsedStudySeconds.collectAsState()
    val elapsedBreakSeconds by viewModel.elapsedBreakSeconds.collectAsState()
    val timerCompleted by viewModel.timerCompleted.collectAsState()
    val timerStarted by viewModel.timerStarted.collectAsState()
    val canSaveSession by viewModel.canSaveSession.collectAsState()
    val storageError by viewModel.storageError.collectAsState()

    val sessions by viewModel.sessionHistory.collectAsState()
    val reflections by viewModel.reflections.collectAsState()
    val pendingSession by viewModel.pendingReflectionSession.collectAsState()

    MethodicaAppContent(
        flows = flows,
        activeFlow = activeFlow,
        timerFlow = timerFlow,
        isTimerRunning = isTimerRunning,
        currentBlockIndex = currentBlockIndex,
        remainingSeconds = remainingSeconds,
        elapsedStudySeconds = elapsedStudySeconds,
        elapsedBreakSeconds = elapsedBreakSeconds,
        timerCompleted = timerCompleted,
        timerStarted = timerStarted,
        canSaveSession = canSaveSession,
        storageError = storageError,
        sessions = sessions,
        reflections = reflections,
        pendingSession = pendingSession,
        techniques = viewModel.techniques,
        onSelectFlow = viewModel::selectFlow,
        onStartTimer = viewModel::startTimer,
        onPauseTimer = viewModel::pauseTimer,
        onSkipBlock = viewModel::skipBlock,
        onFinishSession = viewModel::finishSession,
        onUpdateFlow = viewModel::updateFlow,
        onCreateNewFlow = viewModel::saveNewFlow,
        onDeleteFlow = viewModel::deleteFlow,
        onLoadTechnique = viewModel::loadTechniqueAsFlow,
        onSaveReflection = viewModel::saveReflection,
        onSelectReflectionSession = viewModel::selectReflectionSession,
        onImportCommunityFlow = viewModel::importCommunityFlow
    )
}

@Composable
fun MethodicaAppContent(
    flows: List<StudyFlow>,
    activeFlow: StudyFlow?,
    timerFlow: StudyFlow?,
    isTimerRunning: Boolean,
    currentBlockIndex: Int,
    remainingSeconds: Int,
    elapsedStudySeconds: Int,
    elapsedBreakSeconds: Int,
    timerCompleted: Boolean,
    timerStarted: Boolean,
    canSaveSession: Boolean,
    storageError: String?,
    sessions: List<StudySession>,
    reflections: List<Reflection>,
    pendingSession: StudySession?,
    techniques: List<StudyType>,
    onSelectFlow: (String) -> Unit = {},
    onStartTimer: () -> Unit = {},
    onPauseTimer: () -> Unit = {},
    onSkipBlock: () -> Unit = {},
    onFinishSession: () -> StudySession? = { null },
    onUpdateFlow: (StudyFlow) -> Boolean = { true },
    onCreateNewFlow: (String, String, String, List<StudyBlock>) -> StudyFlow? = { _, _, _, _ -> null },
    onDeleteFlow: (String) -> Unit = {},
    onLoadTechnique: (StudyType) -> StudyFlow? = { null },
    onSaveReflection: (String, Int, Int, String) -> Boolean = { _, _, _, _ -> false },
    onSelectReflectionSession: (String) -> Unit = {},
    onImportCommunityFlow: (String, String, List<StudyBlock>) -> StudyFlow? = { _, _, _ -> null }
) {
    var currentScreen by remember { mutableStateOf<Screen>(Screen.Dashboard) }

    BackHandler(enabled = currentScreen != Screen.Dashboard) {
        currentScreen = if (currentScreen == Screen.Reflection) Screen.History else Screen.Dashboard
    }

    val showBottomBar = currentScreen.route in listOf(
        Screen.Dashboard.route,
        Screen.Flows.route,
        Screen.Techniques.route,
        Screen.Timer.route,
        Screen.History.route
    )

    Scaffold(
        topBar = {
            Column {
                MethodicaTopBar(
                    currentScreen = currentScreen,
                    onNavigate = { currentScreen = it }
                )
                storageError?.let { message ->
                    Text(message, Modifier.padding(12.dp), color = MaterialTheme.colorScheme.error)
                }
            }
        },
        bottomBar = {
            if (showBottomBar) {
                MethodicaBottomBar(
                    currentScreen = currentScreen,
                    onScreenSelected = { currentScreen = it }
                )
            }
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            when (currentScreen) {
                Screen.Dashboard -> {
                    DashboardScreen(
                        flows = flows,
                        activeFlow = activeFlow,
                        sessions = sessions,
                        reflections = reflections,
                        onSelectFlow = { flowId -> onSelectFlow(flowId) },
                        onStartTimer = {
                            onStartTimer()
                            currentScreen = Screen.Timer
                        },
                        onNavigateToFlowBuilder = { currentScreen = Screen.Flows },
                        onNavigateToHistory = { currentScreen = Screen.History },
                        onNavigateToTechniques = { currentScreen = Screen.Techniques }
                    )
                }

                Screen.Flows -> {
                    FlowBuilderScreen(
                        flows = flows,
                        activeFlow = activeFlow,
                        onSelectFlow = { flowId -> onSelectFlow(flowId) },
                        onSaveFlow = onUpdateFlow,
                        onCreateNewFlow = onCreateNewFlow,
                        onDeleteFlow = { flowId -> onDeleteFlow(flowId) },
                        onStartTimerWithFlow = { flow ->
                            onSelectFlow(flow.id)
                            onStartTimer()
                            currentScreen = Screen.Timer
                        }
                    )
                }

                Screen.Techniques -> {
                    TechniquesScreen(
                        techniques = techniques,
                        onLoadTechnique = { technique ->
                            if (onLoadTechnique(technique) != null) currentScreen = Screen.Flows
                        },
                        onStartTechniqueTimer = { technique ->
                            if (onLoadTechnique(technique) != null) {
                                onStartTimer()
                                currentScreen = Screen.Timer
                            }
                        }
                    )
                }

                Screen.Timer -> {
                    TimerScreen(
                        activeFlow = timerFlow,
                        isTimerRunning = isTimerRunning,
                        currentBlockIndex = currentBlockIndex,
                        remainingSeconds = remainingSeconds,
                        elapsedStudySeconds = elapsedStudySeconds,
                        elapsedBreakSeconds = elapsedBreakSeconds,
                        timerCompleted = timerCompleted,
                        timerStarted = timerStarted,
                        canSaveSession = canSaveSession,
                        onStartTimer = { onStartTimer() },
                        onPauseTimer = { onPauseTimer() },
                        onSkipBlock = { onSkipBlock() },
                        onFinishSession = {
                            if (onFinishSession() != null) currentScreen = Screen.Reflection
                        }
                    )
                }

                Screen.Reflection -> {
                    ReflectionScreen(
                        session = pendingSession,
                        reflection = reflections.firstOrNull { it.sessionId == pendingSession?.id },
                        onCancel = { currentScreen = Screen.History },
                        onSaveReflection = { sessionId, comp, fat, notes ->
                            if (onSaveReflection(sessionId, comp, fat, notes)) currentScreen = Screen.History
                        }
                    )
                }

                Screen.History -> {
                    HistoryScreen(
                        sessions = sessions,
                        reflections = reflections,
                        onOpenReflection = { id ->
                            onSelectReflectionSession(id)
                            currentScreen = Screen.Reflection
                        }
                    )
                }

                Screen.Settings -> {
                    SettingsScreen()
                }

                Screen.Community -> {
                    CommunityScreen(
                        onImportFlow = { title, subject, blocks ->
                            if (onImportCommunityFlow(title, subject, blocks) != null) currentScreen = Screen.Flows
                        }
                    )
                }
            }
        }
    }
}

@PhonePreview
@Composable
private fun MethodicaAppPreview() {
    MethodicaTheme {
        MethodicaAppContent(
            flows = listOf(ScreenPreviewData.flow),
            activeFlow = ScreenPreviewData.flow,
            timerFlow = ScreenPreviewData.flow,
            isTimerRunning = false,
            currentBlockIndex = 0,
            remainingSeconds = 25 * 60,
            elapsedStudySeconds = 0,
            elapsedBreakSeconds = 0,
            timerCompleted = false,
            timerStarted = false,
            canSaveSession = false,
            storageError = null,
            sessions = listOf(ScreenPreviewData.session),
            reflections = listOf(ScreenPreviewData.reflection),
            pendingSession = ScreenPreviewData.session,
            techniques = emptyList()
        )
    }
}
