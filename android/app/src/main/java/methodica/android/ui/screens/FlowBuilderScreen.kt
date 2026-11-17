package methodica.android.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Save
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import methodica.android.theme.MethodicaTheme
import methodica.android.model.BlockType
import methodica.android.model.StudyBlock
import methodica.android.model.StudyFlow
import methodica.android.theme.ColorBreakBlock
import methodica.android.theme.ColorFocusBlock
import methodica.android.theme.ColorLongBreakBlock
import methodica.android.theme.ColorRecallBlock
import java.util.UUID

@Composable
fun FlowBuilderScreen(
    flows: List<StudyFlow>,
    activeFlow: StudyFlow?,
    onSelectFlow: (String) -> Unit,
    onSaveFlow: (StudyFlow) -> Boolean,
    onCreateNewFlow: (String, String, String, List<StudyBlock>) -> StudyFlow?,
    onDeleteFlow: (String) -> Unit,
    onStartTimerWithFlow: (StudyFlow) -> Unit
) {
    var title by remember(activeFlow) { mutableStateOf(activeFlow?.title ?: "") }
    var subject by remember(activeFlow) { mutableStateOf(activeFlow?.subject ?: "") }
    var description by remember(activeFlow) { mutableStateOf(activeFlow?.description ?: "") }
    var blocks by remember(activeFlow) { mutableStateOf(activeFlow?.blocks ?: emptyList()) }

    val totalMinutes = blocks.sumOf { it.durationMinutes }
    val focusMinutes = blocks.filter { it.type == BlockType.FOCUS || it.type == BlockType.RECALL }.sumOf { it.durationMinutes }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Top Header & Selector
        item {
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
                        Text(
                            text = "FLOW BUILDER",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Bold
                        )
                        OutlinedButton(
                            onClick = {
                                title = "New Custom Flow"
                                subject = "General"
                                description = ""
                                blocks = listOf(
                                    StudyBlock(title = "Focus Block 1", durationMinutes = 25, type = BlockType.FOCUS),
                                    StudyBlock(title = "Short Break", durationMinutes = 5, type = BlockType.SHORT_BREAK)
                                )
                            },
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("New Flow", style = MaterialTheme.typography.labelMedium)
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = title,
                        onValueChange = { title = it },
                        label = { Text("Flow Title") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = subject,
                            onValueChange = { subject = it },
                            label = { Text("Subject / Tag") },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Duration Summary Badge Row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.primaryContainer,
                            modifier = Modifier.weight(1f)
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Text("Total Duration", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text("${totalMinutes} min", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                            }
                        }
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = ColorFocusBlock.copy(alpha = 0.15f),
                            modifier = Modifier.weight(1f)
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Text("Focus Time", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text("${focusMinutes} min", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = ColorFocusBlock)
                            }
                        }
                    }
                }
            }
        }

        // Action Buttons Row (Save & Start)
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Button(
                    onClick = {
                        val currentId = activeFlow?.id ?: UUID.randomUUID().toString()
                        val updated = StudyFlow(
                            id = currentId,
                            title = title.ifBlank { "Custom Flow" },
                            subject = subject.ifBlank { "General" },
                            description = description,
                            blocks = blocks,
                            isTemplate = activeFlow?.isTemplate == true
                        )
                        if (flows.any { it.id == currentId }) {
                            onSaveFlow(updated)
                        } else {
                            onCreateNewFlow(title, subject, description, blocks)
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surface),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.primary),
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Default.Save, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Save Flow", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                }

                Button(
                    onClick = {
                        val updated = StudyFlow(
                            id = activeFlow?.id ?: UUID.randomUUID().toString(),
                            title = title.ifBlank { "Custom Flow" },
                            subject = subject.ifBlank { "General" },
                            description = description,
                            blocks = blocks,
                            isTemplate = activeFlow?.isTemplate == true
                        )
                        val saved = if (activeFlow == null) {
                            onCreateNewFlow(title, subject, description, blocks)
                        } else {
                            updated.takeIf(onSaveFlow)
                        }
                        if (saved != null) onStartTimerWithFlow(saved)
                    },
                    enabled = blocks.isNotEmpty(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Default.PlayArrow, contentDescription = null)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Start Timer", fontWeight = FontWeight.Bold)
                }
            }
        }

        // Section Title: Sequence Blocks
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Study Blocks (${blocks.size})",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )

                OutlinedButton(
                    onClick = {
                        val newBlock = StudyBlock(
                            title = "New Block",
                            durationMinutes = 20,
                            type = BlockType.FOCUS
                        )
                        blocks = blocks + newBlock
                    },
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Add Block", modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Add Block", style = MaterialTheme.typography.labelMedium)
                }
            }
        }

        // List of Blocks
        itemsIndexed(blocks) { index, block ->
            BlockEditorCard(
                block = block,
                isFirst = index == 0,
                isLast = index == blocks.size - 1,
                onUpdate = { updated ->
                    blocks = blocks.mapIndexed { idx, b -> if (idx == index) updated else b }
                },
                onMoveUp = {
                    if (index > 0) {
                        val mutable = blocks.toMutableList()
                        val temp = mutable[index]
                        mutable[index] = mutable[index - 1]
                        mutable[index - 1] = temp
                        blocks = mutable
                    }
                },
                onMoveDown = {
                    if (index < blocks.size - 1) {
                        val mutable = blocks.toMutableList()
                        val temp = mutable[index]
                        mutable[index] = mutable[index + 1]
                        mutable[index + 1] = temp
                        blocks = mutable
                    }
                },
                onDelete = {
                    if (blocks.size > 1) {
                        blocks = blocks.filterIndexed { idx, _ -> idx != index }
                    }
                }
            )
        }
    }
}

@Composable
fun BlockEditorCard(
    block: StudyBlock,
    isFirst: Boolean,
    isLast: Boolean,
    onUpdate: (StudyBlock) -> Unit,
    onMoveUp: () -> Unit,
    onMoveDown: () -> Unit,
    onDelete: () -> Unit
) {
    var expandedTypeMenu by remember { mutableStateOf(false) }

    val chipColor = when (block.type) {
        BlockType.FOCUS -> ColorFocusBlock
        BlockType.SHORT_BREAK -> ColorBreakBlock
        BlockType.RECALL -> ColorRecallBlock
        BlockType.LONG_BREAK -> ColorLongBreakBlock
    }

    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Type Selector Chip
                Box {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = chipColor.copy(alpha = 0.15f),
                        modifier = Modifier.clickable { expandedTypeMenu = true }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
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
                                text = block.type.label,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }

                    DropdownMenu(
                        expanded = expandedTypeMenu,
                        onDismissRequest = { expandedTypeMenu = false }
                    ) {
                        BlockType.values().forEach { bType ->
                            DropdownMenuItem(
                                text = { Text(bType.label) },
                                onClick = {
                                    onUpdate(block.copy(type = bType))
                                    expandedTypeMenu = false
                                }
                            )
                        }
                    }
                }

                // Reorder & Delete Actions
                Row {
                    IconButton(onClick = onMoveUp, enabled = !isFirst) {
                        Icon(Icons.Default.ArrowUpward, contentDescription = "Move Up", modifier = Modifier.size(18.dp))
                    }
                    IconButton(onClick = onMoveDown, enabled = !isLast) {
                        Icon(Icons.Default.ArrowDownward, contentDescription = "Move Down", modifier = Modifier.size(18.dp))
                    }
                    IconButton(onClick = onDelete) {
                        Icon(Icons.Default.Delete, contentDescription = "Delete Block", tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(18.dp))
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            OutlinedTextField(
                value = block.title,
                onValueChange = { onUpdate(block.copy(title = it)) },
                label = { Text("Block Name") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Duration Controller
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Duration",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedButton(
                        onClick = { if (block.durationMinutes > 5) onUpdate(block.copy(durationMinutes = block.durationMinutes - 5)) },
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("- 5m", style = MaterialTheme.typography.labelSmall)
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "${block.durationMinutes} min",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    OutlinedButton(
                        onClick = { onUpdate(block.copy(durationMinutes = block.durationMinutes + 5)) },
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("+ 5m", style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
        }
    }
}

@PhonePreview
@Composable
private fun FlowBuilderScreenPreview() {
    MethodicaTheme {
        FlowBuilderScreen(
            flows = listOf(ScreenPreviewData.flow),
            activeFlow = ScreenPreviewData.flow,
            onSelectFlow = {},
            onSaveFlow = { true },
            onCreateNewFlow = { _, _, _, _ -> null },
            onDeleteFlow = {},
            onStartTimerWithFlow = {}
        )
    }
}

@PhonePreview
@Composable
private fun FlowBuilderScreenEmptyPreview() {
    MethodicaTheme {
        FlowBuilderScreen(
            flows = emptyList(),
            activeFlow = null,
            onSelectFlow = {},
            onSaveFlow = { true },
            onCreateNewFlow = { _, _, _, _ -> null },
            onDeleteFlow = {},
            onStartTimerWithFlow = {}
        )
    }
}

