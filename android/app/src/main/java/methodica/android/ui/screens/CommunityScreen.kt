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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.People
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import methodica.android.model.BlockType
import methodica.android.model.StudyBlock
import methodica.android.theme.ColorBreakBlock
import methodica.android.theme.ColorFocusBlock
import methodica.android.theme.ColorLongBreakBlock
import methodica.android.theme.ColorRecallBlock

data class CommunityFlowTemplate(
    val title: String,
    val author: String,
    val subject: String,
    val description: String,
    val blocks: List<StudyBlock>
)

val sampleCommunityFlows = listOf(
    CommunityFlowTemplate(
        title = "Calculus Deep Practice Routine",
        author = "Andrei Canoy",
        subject = "Mathematics",
        description = "High intensity problem solving with interleaved testing.",
        blocks = listOf(
            StudyBlock(title = "Derivatives Deep Work", durationMinutes = 30, type = BlockType.FOCUS),
            StudyBlock(title = "Formula Active Recall", durationMinutes = 10, type = BlockType.RECALL),
            StudyBlock(title = "Short Break", durationMinutes = 5, type = BlockType.SHORT_BREAK),
            StudyBlock(title = "Integrals Application", durationMinutes = 30, type = BlockType.FOCUS)
        )
    ),
    CommunityFlowTemplate(
        title = "CS Algorithms & Data Structures",
        author = "Kelvin Obejero",
        subject = "Computer Science",
        description = "Feynman concept mapping for graph algorithms.",
        blocks = listOf(
            StudyBlock(title = "Graph Traversal Concept", durationMinutes = 20, type = BlockType.FOCUS),
            StudyBlock(title = "Plain English Draft", durationMinutes = 15, type = BlockType.RECALL),
            StudyBlock(title = "Code Implementation", durationMinutes = 25, type = BlockType.FOCUS),
            StudyBlock(title = "Long Break", durationMinutes = 15, type = BlockType.LONG_BREAK)
        )
    )
)

@Composable
fun CommunityScreen(
    onImportFlow: (title: String, subject: String, blocks: List<StudyBlock>) -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Hero Header Card
        item {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.People,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "COMMUNITY HUB",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "Shared Study Templates",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = "Browse study flows shared by mentors and classmates, and import them directly into your workspace.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        // Community Items
        items(sampleCommunityFlows) { item ->
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.primaryContainer
                        ) {
                            Text(
                                text = item.subject.uppercase(),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                        Text(
                            text = "by ${item.author}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = item.title,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = item.description,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Block Chips Preview
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(item.blocks) { block ->
                            val chipColor = when (block.type) {
                                BlockType.FOCUS -> ColorFocusBlock
                                BlockType.SHORT_BREAK -> ColorBreakBlock
                                BlockType.RECALL -> ColorRecallBlock
                                BlockType.LONG_BREAK -> ColorLongBreakBlock
                            }
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = chipColor.copy(alpha = 0.15f)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(8.dp)
                                            .clip(CircleShape)
                                            .background(chipColor)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "${block.title} (${block.durationMinutes}m)",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurface
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Button(
                        onClick = { onImportFlow(item.title, item.subject, item.blocks) },
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Import Flow to My Workspace", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
