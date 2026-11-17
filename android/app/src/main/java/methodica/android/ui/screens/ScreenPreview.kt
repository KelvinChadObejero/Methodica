package methodica.android.ui.screens

import android.content.res.Configuration
import androidx.compose.ui.tooling.preview.Preview
import methodica.android.model.BlockType
import methodica.android.model.Reflection
import methodica.android.model.StudyBlock
import methodica.android.model.StudyFlow
import methodica.android.model.StudySession

@Preview(
    name = "Light", group = "Phone", widthDp = 393, heightDp = 852,
    showBackground = true, uiMode = Configuration.UI_MODE_NIGHT_NO
)
@Preview(
    name = "Dark", group = "Phone", widthDp = 393, heightDp = 852,
    showBackground = true, uiMode = Configuration.UI_MODE_NIGHT_YES
)
@Target(AnnotationTarget.FUNCTION)
internal annotation class PhonePreview

internal object ScreenPreviewData {
    val flow = StudyFlow(
        id = "preview-flow",
        title = "History exam review",
        subject = "History",
        description = "Review the timeline, take a break, then recall the key dates.",
        blocks = listOf(
            StudyBlock(id = "preview-focus", title = "Review the timeline", durationMinutes = 25),
            StudyBlock(id = "preview-break", title = "Stretch break", durationMinutes = 5, type = BlockType.SHORT_BREAK),
            StudyBlock(id = "preview-recall", title = "Recall key dates", durationMinutes = 10, type = BlockType.RECALL)
        )
    )

    val session = StudySession(
        id = "preview-session",
        flowId = flow.id,
        flowTitle = flow.title,
        subject = flow.subject,
        startTimeMillis = 1_794_896_000_000L,
        totalSeconds = 40 * 60,
        focusSeconds = 35 * 60,
        completedBlocks = flow.blocks.size,
        totalBlocks = flow.blocks.size,
        reflectionId = "preview-reflection"
    )

    val reflection = Reflection(
        id = "preview-reflection",
        sessionId = session.id,
        flowTitle = session.flowTitle,
        subject = session.subject,
        timestampMillis = session.startTimeMillis + session.totalSeconds * 1_000L,
        comprehensionScore = 4,
        fatigueScore = 2,
        notes = "I recalled the main events. Review the dates once more tomorrow."
    )
}
