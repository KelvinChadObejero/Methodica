package methodica.android.model

import java.util.UUID

data class StudyFlow(
    val id: String = UUID.randomUUID().toString(),
    val title: String,
    val description: String = "",
    val subject: String = "General",
    val blocks: List<StudyBlock> = emptyList(),
    val isTemplate: Boolean = false
) {
    val totalMinutes: Int
        get() = blocks.sumOf { it.durationMinutes }

    val focusMinutes: Int
        get() = blocks.filter { it.type == BlockType.FOCUS || it.type == BlockType.RECALL }.sumOf { it.durationMinutes }
}
