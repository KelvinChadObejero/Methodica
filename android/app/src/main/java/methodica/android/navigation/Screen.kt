package methodica.android.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Timer
import androidx.compose.ui.graphics.vector.ImageVector

sealed class Screen(val route: String, val title: String, val icon: ImageVector? = null) {
    object Dashboard : Screen("dashboard", "Dashboard", Icons.Default.Dashboard)
    object Flows : Screen("flows", "Flow Builder", Icons.AutoMirrored.Filled.MenuBook)
    object Techniques : Screen("techniques", "Techniques", Icons.Default.AutoAwesome)
    object Timer : Screen("timer", "Timer", Icons.Default.Timer)
    object History : Screen("history", "History", Icons.Default.History)
    object Reflection : Screen("reflection", "Session Reflection")
    object Settings : Screen("settings", "Settings", Icons.Default.Settings)
    object Community : Screen("community", "Community Hub", Icons.Default.People)
}

val primaryBottomNavScreens = listOf(
    Screen.Dashboard,
    Screen.Flows,
    Screen.Techniques,
    Screen.Timer,
    Screen.History
)
