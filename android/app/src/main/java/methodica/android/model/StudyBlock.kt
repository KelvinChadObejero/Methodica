package methodica.android.model

import java.util.UUID

enum class BlockType(val label: String) {
    FOCUS("Focus"),
    SHORT_BREAK("Short Break"),
    RECALL("Active Recall"),
    LONG_BREAK("Long Break")
}

data class StudyBlock(
    val id: String = UUID.randomUUID().toString(),
    val title: String,
    val durationMinutes: Int,
    val type: BlockType = BlockType.FOCUS
)
