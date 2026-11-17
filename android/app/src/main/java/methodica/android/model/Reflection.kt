package methodica.android.model

import java.util.UUID

data class Reflection(
    val id: String = UUID.randomUUID().toString(),
    val sessionId: String,
    val flowTitle: String,
    val subject: String,
    val timestampMillis: Long = System.currentTimeMillis(),
    val comprehensionScore: Int = 3, // 1..5
    val fatigueScore: Int = 3,      // 1..5
    val notes: String = ""
)
