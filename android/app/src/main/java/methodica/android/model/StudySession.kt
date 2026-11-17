package methodica.android.model

import java.util.UUID

data class StudySession(
    val id: String = UUID.randomUUID().toString(),
    val flowId: String,
    val flowTitle: String,
    val subject: String,
    val startTimeMillis: Long = System.currentTimeMillis(),
    val totalMinutes: Int,
    val completedBlocks: Int,
    val totalBlocks: Int,
    val reflectionId: String? = null
)
