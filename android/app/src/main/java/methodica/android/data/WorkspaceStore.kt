package methodica.android.data

import methodica.android.model.Reflection
import methodica.android.model.StudyFlow
import methodica.android.model.StudySession

data class Workspace(
    val flows: List<StudyFlow>,
    val sessions: List<StudySession> = emptyList(),
    val reflections: List<Reflection> = emptyList(),
    val selectedFlowId: String? = null
)

interface WorkspaceStore {
    fun load(): Workspace?
    fun save(workspace: Workspace)
}
