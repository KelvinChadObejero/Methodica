package methodica.android.data

import android.util.AtomicFile
import methodica.android.model.BlockType
import methodica.android.model.Reflection
import methodica.android.model.StudyBlock
import methodica.android.model.StudyFlow
import methodica.android.model.StudySession
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileNotFoundException
import java.io.IOException

class DeviceWorkspaceStore(directory: File) : WorkspaceStore {
    private val file = AtomicFile(File(directory, "methodica-workspace.json"))

    override fun load(): Workspace? {
        val input = try {
            file.openRead()
        } catch (exception: FileNotFoundException) {
            if (file.baseFile.exists()) throw exception
            return null
        }
        val data = JSONObject(input.bufferedReader(Charsets.UTF_8).use { it.readText() })
        if (data.getInt("version") != 1) throw IOException("Unsupported workspace format")
        return Workspace(
            flows = data.objects("flows") { flow ->
                StudyFlow(
                    id = flow.getString("id"),
                    title = flow.getString("title"),
                    description = flow.getString("description"),
                    subject = flow.getString("subject"),
                    blocks = flow.objects("blocks") { block ->
                        StudyBlock(
                            id = block.getString("id"),
                            title = block.getString("title"),
                            durationMinutes = block.getInt("durationMinutes").also { require(it > 0) },
                            type = BlockType.valueOf(block.getString("type"))
                        )
                    },
                    isTemplate = flow.getBoolean("isTemplate")
                )
            },
            sessions = data.objects("sessions") { session ->
                StudySession(
                    id = session.getString("id"),
                    flowId = session.getString("flowId"),
                    flowTitle = session.getString("flowTitle"),
                    subject = session.getString("subject"),
                    startTimeMillis = session.getLong("startTimeMillis"),
                    totalSeconds = session.getInt("totalSeconds"),
                    focusSeconds = session.getInt("focusSeconds"),
                    completedBlocks = session.getInt("completedBlocks"),
                    totalBlocks = session.getInt("totalBlocks"),
                    reflectionId = session.optionalString("reflectionId")
                )
            },
            reflections = data.objects("reflections") { entry ->
                Reflection(
                    id = entry.getString("id"),
                    sessionId = entry.getString("sessionId"),
                    flowTitle = entry.getString("flowTitle"),
                    subject = entry.getString("subject"),
                    timestampMillis = entry.getLong("timestampMillis"),
                    comprehensionScore = entry.getInt("comprehensionScore"),
                    fatigueScore = entry.getInt("fatigueScore"),
                    notes = entry.getString("notes")
                )
            },
            selectedFlowId = data.optionalString("selectedFlowId")
        )
    }

    override fun save(workspace: Workspace) {
        val data = JSONObject().apply {
            put("version", 1)
            put("selectedFlowId", workspace.selectedFlowId)
            put("flows", JSONArray(workspace.flows.map { flow ->
                JSONObject().apply {
                    put("id", flow.id)
                    put("title", flow.title)
                    put("description", flow.description)
                    put("subject", flow.subject)
                    put("isTemplate", flow.isTemplate)
                    put("blocks", JSONArray(flow.blocks.map { block ->
                        JSONObject().apply {
                            put("id", block.id)
                            put("title", block.title)
                            put("durationMinutes", block.durationMinutes)
                            put("type", block.type.name)
                        }
                    }))
                }
            }))
            put("sessions", JSONArray(workspace.sessions.map { session ->
                JSONObject().apply {
                    put("id", session.id)
                    put("flowId", session.flowId)
                    put("flowTitle", session.flowTitle)
                    put("subject", session.subject)
                    put("startTimeMillis", session.startTimeMillis)
                    put("totalSeconds", session.totalSeconds)
                    put("focusSeconds", session.focusSeconds)
                    put("completedBlocks", session.completedBlocks)
                    put("totalBlocks", session.totalBlocks)
                    put("reflectionId", session.reflectionId)
                }
            }))
            put("reflections", JSONArray(workspace.reflections.map { entry ->
                JSONObject().apply {
                    put("id", entry.id)
                    put("sessionId", entry.sessionId)
                    put("flowTitle", entry.flowTitle)
                    put("subject", entry.subject)
                    put("timestampMillis", entry.timestampMillis)
                    put("comprehensionScore", entry.comprehensionScore)
                    put("fatigueScore", entry.fatigueScore)
                    put("notes", entry.notes)
                }
            }))
        }

        val output = file.startWrite()
        try {
            output.write(data.toString().toByteArray(Charsets.UTF_8))
            file.finishWrite(output)
        } catch (exception: IOException) {
            file.failWrite(output)
            throw exception
        }
    }

    private fun JSONObject.optionalString(key: String): String? = if (isNull(key)) null else getString(key)

    private inline fun <T> JSONObject.objects(key: String, transform: (JSONObject) -> T): List<T> {
        val values = getJSONArray(key)
        return List(values.length()) { index -> transform(values.getJSONObject(index)) }
    }
}
