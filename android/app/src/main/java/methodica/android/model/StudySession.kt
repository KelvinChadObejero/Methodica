package methodica.android.model

import java.util.UUID

data class StudySession(
    val id: String = UUID.randomUUID().toString(),
    val flowId: String,
    val flowTitle: String,
    val subject: String,
    val startTimeMillis: Long = System.currentTimeMillis(),
    val totalSeconds: Int,
    val focusSeconds: Int,
    val completedBlocks: Int,
    val totalBlocks: Int,
    val reflectionId: String? = null
) {
    val durationLabel: String
        get() = when {
            totalSeconds < 60 -> "$totalSeconds sec"
            totalSeconds % 60 == 0 -> "${totalSeconds / 60} min"
            else -> "${totalSeconds / 60} min ${totalSeconds % 60} sec"
        }
}
