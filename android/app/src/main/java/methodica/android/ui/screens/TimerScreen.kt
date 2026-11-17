package methodica.android.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import methodica.android.model.BlockType
import methodica.android.model.StudyFlow
import methodica.android.theme.ColorBreakBlock
import methodica.android.theme.ColorFocusBlock
import methodica.android.theme.ColorLongBreakBlock
import methodica.android.theme.ColorRecallBlock

@Composable
fun TimerScreen(
    activeFlow: StudyFlow?,
    isTimerRunning: Boolean,
    currentBlockIndex: Int,
    remainingSeconds: Int,
    elapsedStudySeconds: Int,
    elapsedBreakSeconds: Int,
    timerCompleted: Boolean,
    onStartTimer: () -> Unit,
    onPauseTimer: () -> Unit,
    onSkipBlock: () -> Unit,
    onFinishSession: () -> Unit
) {
    val scrollState = rememberScrollState()

    val flow = activeFlow
    val currentBlock = flow?.blocks?.getOrNull(currentBlockIndex)
    val totalBlockSec = (currentBlock?.durationMinutes ?: 25) * 60
    val progress = if (totalBlockSec > 0) 1f - (remainingSeconds.toFloat() / totalBlockSec.toFloat()) else 0f

    val minutes = remainingSeconds / 60
    val seconds = remainingSeconds % 60
    val timeFormatted = String.format("%02d:%02d", minutes, seconds)

    val chipColor = when (currentBlock?.type) {
        BlockType.FOCUS -> ColorFocusBlock
        BlockType.SHORT_BREAK -> ColorBreakBlock
        BlockType.RECALL -> ColorRecallBlock
        BlockType.LONG_BREAK -> ColorLongBreakBlock
        null -> ColorFocusBlock
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(scrollState)
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Flow Title Header Card
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = MaterialTheme.colorScheme.primaryContainer
                ) {
                    Text(
                        text = (flow?.subject ?: "General").uppercase(),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                }

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = flow?.title ?: "Study Session",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )

                Spacer(modifier = Modifier.height(10.dp))

                // Block Timeline Progress Pills
                if (flow != null && flow.blocks.isNotEmpty()) {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        itemsIndexed(flow.blocks) { idx, b ->
                            val isCurrent = idx == currentBlockIndex
                            val isDone = idx < currentBlockIndex
                            val bColor = when (b.type) {
                                BlockType.FOCUS -> ColorFocusBlock
                                BlockType.SHORT_BREAK -> ColorBreakBlock
                                BlockType.RECALL -> ColorRecallBlock
                                BlockType.LONG_BREAK -> ColorLongBreakBlock
                            }

                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = when {
                                    isCurrent -> bColor
                                    isDone -> bColor.copy(alpha = 0.4f)
                                    else -> MaterialTheme.colorScheme.surfaceVariant
                                }
                            ) {
                                Text(
                                    text = "${idx + 1}. ${b.title}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (isCurrent || isDone) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal,
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        // Active Timer Dial Card
        Card(
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Active Block Chip
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = chipColor.copy(alpha = 0.15f)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(10.dp)
                                .clip(CircleShape)
                                .background(chipColor)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "${currentBlock?.title ?: "Focus"} · ${currentBlock?.type?.label ?: "Focus"}",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Circular Timer Gauge
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier.size(200.dp)
                ) {
                    CircularProgressIndicator(
                        progress = { progress },
                        modifier = Modifier.fillMaxSize(),
                        color = chipColor,
                        strokeWidth = 10.dp,
                        trackColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = timeFormatted,
                            fontSize = 44.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface,
                            letterSpacing = 2.sp
                        )
                        Text(
                            text = if (isTimerRunning) "FOCUSING" else if (timerCompleted) "FINISHED" else "PAUSED",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = if (isTimerRunning) chipColor else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Timer Controls
                Row(
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Skip Button
                    OutlinedButton(
                        onClick = onSkipBlock,
                        shape = CircleShape,
                        modifier = Modifier.size(54.dp)
                    ) {
                        Icon(Icons.Default.SkipNext, contentDescription = "Skip Block", tint = MaterialTheme.colorScheme.onSurface)
                    }

                    // Play/Pause Main Button
                    Button(
                        onClick = { if (isTimerRunning) onPauseTimer() else onStartTimer() },
                        shape = CircleShape,
                        colors = ButtonDefaults.buttonColors(containerColor = chipColor),
                        modifier = Modifier.size(72.dp)
                    ) {
                        Icon(
                            imageVector = if (isTimerRunning) Icons.Default.Pause else Icons.Default.PlayArrow,
                            contentDescription = if (isTimerRunning) "Pause" else "Start",
                            tint = Color.White,
                            modifier = Modifier.size(36.dp)
                        )
                    }

                    // Stop & Reflect Button
                    OutlinedButton(
                        onClick = onFinishSession,
                        shape = CircleShape,
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.error),
                        modifier = Modifier.size(54.dp)
                    ) {
                        Icon(Icons.Default.Stop, contentDescription = "End Session", tint = MaterialTheme.colorScheme.error)
                    }
                }
            }
        }

        // Completion Banner / Next Step
        if (timerCompleted) {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = "Completed",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(32.dp)
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Session Completed!",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Text(
                        text = "Log your reflection to track comprehension and fatigue.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(
                        onClick = onFinishSession,
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                    ) {
                        Text("Reflect & Log Session", fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.width(6.dp))
                        Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null)
                    }
                }
            }
        }

        // Realtime Elapsed Stats Footer Card
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceAround
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Study Elapsed", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("${elapsedStudySeconds / 60}m ${elapsedStudySeconds % 60}s", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = ColorFocusBlock)
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Break Elapsed", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("${elapsedBreakSeconds / 60}m ${elapsedBreakSeconds % 60}s", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = ColorBreakBlock)
                }
            }
        }
    }
}
