package methodica.android.model

import java.util.UUID

internal class StudyTimer(val flow: StudyFlow) {
    private val sessionId = UUID.randomUUID().toString()
    private var startedAtMillis: Long? = null
    private var lastTickMillis: Long? = null
    private var remainingMillis = durationMillis(0)
    private var studyMillis = 0L
    private var breakMillis = 0L
    private var blocksCompleted = 0

    var blockIndex = 0
        private set
    var completed = false
        private set

    val started: Boolean get() = startedAtMillis != null
    val running: Boolean get() = lastTickMillis != null
    val remainingSeconds: Int get() = ((remainingMillis + 999) / 1000).toInt()
    val elapsedStudySeconds: Int get() = (studyMillis / 1000).toInt()
    val elapsedBreakSeconds: Int get() = (breakMillis / 1000).toInt()
    val canSave: Boolean get() = studyMillis + breakMillis >= 1000

    fun start(now: Long, wallTimeMillis: Long) {
        if (running || completed || flow.blocks.isEmpty()) return
        if (!started) startedAtMillis = wallTimeMillis
        lastTickMillis = now
    }

    fun pause(now: Long) {
        advance(now)
        lastTickMillis = null
    }

    fun skip(now: Long) {
        advance(now)
        if (started && !completed) nextBlock()
    }

    fun advance(now: Long) {
        val lastTick = lastTickMillis ?: return
        if (now <= lastTick) return
        lastTickMillis = now
        var uncounted = now - lastTick
        while (uncounted > 0 && !completed) {
            val spent = minOf(uncounted, remainingMillis)
            if (flow.blocks[blockIndex].type in studyTypes) studyMillis += spent else breakMillis += spent
            remainingMillis -= spent
            uncounted -= spent
            if (remainingMillis == 0L) {
                blocksCompleted++
                nextBlock()
            }
        }
    }

    fun end(now: Long): StudySession? {
        advance(now)
        if (!canSave) return null
        complete()
        return session()
    }

    fun session(): StudySession? {
        val startedAt = startedAtMillis ?: return null
        if (!completed || !canSave) return null
        return StudySession(
            id = sessionId,
            flowId = flow.id,
            flowTitle = flow.title,
            subject = flow.subject,
            startTimeMillis = startedAt,
            totalSeconds = ((studyMillis + breakMillis) / 1000).toInt(),
            focusSeconds = elapsedStudySeconds,
            completedBlocks = blocksCompleted,
            totalBlocks = flow.blocks.size
        )
    }

    private fun nextBlock() {
        if (blockIndex == flow.blocks.lastIndex) {
            complete()
        } else {
            blockIndex++
            remainingMillis = durationMillis(blockIndex)
        }
    }

    private fun complete() {
        completed = true
        lastTickMillis = null
    }

    private fun durationMillis(index: Int): Long = (flow.blocks.getOrNull(index)?.durationMinutes ?: 0) * 60_000L

    private companion object {
        val studyTypes = setOf(BlockType.FOCUS, BlockType.RECALL)
    }
}
