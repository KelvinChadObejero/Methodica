package methodica.android.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import methodica.android.navigation.MethodicaBottomBar
import methodica.android.navigation.MethodicaTopBar
import methodica.android.navigation.Screen
import methodica.android.ui.screens.CommunityScreen
import methodica.android.ui.screens.DashboardScreen
import methodica.android.ui.screens.FlowBuilderScreen
import methodica.android.ui.screens.HistoryScreen
import methodica.android.ui.screens.ReflectionScreen
import methodica.android.ui.screens.SettingsScreen
import methodica.android.ui.screens.TechniquesScreen
import methodica.android.ui.screens.TimerScreen
import methodica.android.viewmodel.MethodicaViewModel

@Composable
fun MethodicaApp(
    viewModel: MethodicaViewModel = viewModel()
) {
    var currentScreen by remember { mutableStateOf<Screen>(Screen.Dashboard) }

    val flows by viewModel.flows.collectAsState()
    val activeFlow = viewModel.activeFlow
    val isTimerRunning by viewModel.isTimerRunning.collectAsState()
    val currentBlockIndex by viewModel.currentBlockIndex.collectAsState()
    val remainingSeconds by viewModel.remainingSeconds.collectAsState()
    val elapsedStudySeconds by viewModel.elapsedStudySeconds.collectAsState()
    val elapsedBreakSeconds by viewModel.elapsedBreakSeconds.collectAsState()
    val timerCompleted by viewModel.timerCompleted.collectAsState()

    val sessions by viewModel.sessionHistory.collectAsState()
    val reflections by viewModel.reflections.collectAsState()
    val pendingSession by viewModel.pendingReflectionSession.collectAsState()

    val showBottomBar = currentScreen.route in listOf(
        Screen.Dashboard.route,
        Screen.Flows.route,
        Screen.Techniques.route,
        Screen.Timer.route,
        Screen.History.route
    )

    Scaffold(
        topBar = {
            MethodicaTopBar(
                currentScreen = currentScreen,
                onNavigate = { currentScreen = it }
            )
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
                        onSelectFlow = { flowId -> viewModel.selectFlow(flowId) },
                        onStartTimer = {
                            viewModel.startTimer()
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
                        onSelectFlow = { flowId -> viewModel.selectFlow(flowId) },
                        onSaveFlow = { flow -> viewModel.updateFlow(flow) },
                        onCreateNewFlow = { t, s, d, b -> viewModel.saveNewFlow(t, s, d, b) },
                        onDeleteFlow = { flowId -> viewModel.deleteFlow(flowId) },
                        onStartTimerWithFlow = { flow ->
                            viewModel.selectFlow(flow.id)
                            viewModel.startTimer()
                            currentScreen = Screen.Timer
                        }
                    )
                }

                Screen.Techniques -> {
                    TechniquesScreen(
                        techniques = viewModel.techniques,
                        onLoadTechnique = { technique ->
                            viewModel.loadTechniqueAsFlow(technique)
                            currentScreen = Screen.Flows
                        },
                        onStartTechniqueTimer = { technique ->
                            val newFlow = viewModel.loadTechniqueAsFlow(technique)
                            viewModel.selectFlow(newFlow.id)
                            viewModel.startTimer()
                            currentScreen = Screen.Timer
                        }
                    )
                }

                Screen.Timer -> {
                    TimerScreen(
                        activeFlow = activeFlow,
                        isTimerRunning = isTimerRunning,
                        currentBlockIndex = currentBlockIndex,
                        remainingSeconds = remainingSeconds,
                        elapsedStudySeconds = elapsedStudySeconds,
                        elapsedBreakSeconds = elapsedBreakSeconds,
                        timerCompleted = timerCompleted,
                        onStartTimer = { viewModel.startTimer() },
                        onPauseTimer = { viewModel.pauseTimer() },
                        onSkipBlock = { viewModel.skipBlock() },
                        onFinishSession = {
                            viewModel.finishSession()
                            currentScreen = Screen.Reflection
                        }
                    )
                }

                Screen.Reflection -> {
                    ReflectionScreen(
                        session = pendingSession ?: sessions.firstOrNull(),
                        onSaveReflection = { sessionId, comp, fat, notes ->
                            viewModel.saveReflection(sessionId, comp, fat, notes)
                            currentScreen = Screen.History
                        }
                    )
                }

                Screen.History -> {
                    HistoryScreen(
                        sessions = sessions,
                        reflections = reflections
                    )
                }

                Screen.Settings -> {
                    SettingsScreen()
                }

                Screen.Community -> {
                    CommunityScreen(
                        onImportFlow = { title, subject, blocks ->
                            viewModel.importCommunityFlow(title, subject, blocks)
                            currentScreen = Screen.Flows
                        }
                    )
                }
            }
        }
    }
}
