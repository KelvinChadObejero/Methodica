package com.methodica.studyflow;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.methodica.studyflow.entity.*;
import com.methodica.studyflow.repository.*;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {"spring.datasource.url=jdbc:h2:mem:incrementone;DB_CLOSE_DELAY=-1", "spring.jpa.hibernate.ddl-auto=create-drop"})
class IncrementOneIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired UserRepository users;
    @Autowired StudyFlowRepository flows;
    @Autowired SessionLogRepository logs;

    @Test
    void databaseForeignKeysRejectOrphanFlowsAndSessions() {
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () ->
            flows.saveAndFlush(new StudyFlow(999999L, "Orphan", "Invalid owner", false)));
        User owner = users.save(new User("FK owner", "fk@example.com", "hash", Role.STUDENT));
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () ->
            sessions.saveAndFlush(new StudySession("orphan-session", owner, 999999L, "Orphan", "Test",
                Instant.now().minusSeconds(3600), 30, 20, "Test", StudySessionStatus.completed)));
    }

    @Autowired StudySessionRepository sessions;

    @Test
    void enforcesTheWholeErdAndAllowsSessionAndLogCorrections() throws Exception {
        User owner = users.save(new User("Owner", "owner@example.com", "hash", Role.STUDENT));
        User other = users.save(new User("Other", "other@example.com", "hash", Role.STUDENT));
        Long flowId = flows.save(new StudyFlow(owner.getUserId(), "Recall", "Review", false)).getFlowId();
        String ownerId = owner.getUserId().toString();
        String flowBody = "{\"userId\":999999,\"title\":\"Invalid\",\"isPublic\":false}";
        mvc.perform(post("/api/flows").contentType(MediaType.APPLICATION_JSON).content(flowBody))
            .andExpect(status().isNotFound());

        ObjectNode body = mapper.createObjectNode();
        body.put("id", "session-one").put("userId", owner.getUserId()).put("flowId", flowId)
            .put("flowTitle", "Recall").put("flowTag", "Biology").put("subject", "Biology")
            .put("startedAt", Instant.now().minusSeconds(7200).toString())
            .put("durationMinutes", 30).put("focusMinutes", 25).put("status", "completed");
        mvc.perform(post("/api/sessions").contentType(MediaType.APPLICATION_JSON)
            .content(body.deepCopy().put("flowId", 999999).toString())).andExpect(status().isNotFound());
        mvc.perform(post("/api/sessions").contentType(MediaType.APPLICATION_JSON)
            .content(body.deepCopy().put("userId", other.getUserId()).toString())).andExpect(status().isBadRequest());
        var session = mapper.readTree(mvc.perform(post("/api/sessions").contentType(MediaType.APPLICATION_JSON).content(body.toString()))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.endedAt").exists())
            .andReturn().getResponse().getContentAsString());
        assertEquals(1800, Instant.parse(session.get("endedAt").asText()).getEpochSecond()
            - Instant.parse(session.get("startedAt").asText()).getEpochSecond());

        mvc.perform(delete("/api/flows/{id}", flowId)).andExpect(status().isConflict());
        mvc.perform(delete("/api/users/{id}", owner.getUserId())).andExpect(status().isConflict());
        mvc.perform(put("/api/flows/{id}", flowId).contentType(MediaType.APPLICATION_JSON)
            .content("{\"userId\":" + other.getUserId() + ",\"title\":\"Moved\",\"isPublic\":false}"))
            .andExpect(status().isConflict());

        String sessionUrl = "/api/sessions/session-one";
        String logUrl = sessionUrl + "/log";
        String reflection = "{\"comprehension\":4,\"fatigue\":2,\"notes\":\"Keep notes\"}";
        var log = mapper.readTree(mvc.perform(post(logUrl).param("userId", ownerId)
            .contentType(MediaType.APPLICATION_JSON).content(reflection))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.logId").isNumber())
            .andExpect(jsonPath("$.loggedAt").exists()).andReturn().getResponse().getContentAsString());
        mvc.perform(post(logUrl).param("userId", ownerId).contentType(MediaType.APPLICATION_JSON).content(reflection))
            .andExpect(status().isConflict());

        body.put("flowTitle", "Corrected").put("subject", "Physics").put("durationMinutes", 40);
        mvc.perform(put(sessionUrl).param("userId", ownerId).contentType(MediaType.APPLICATION_JSON).content(body.toString()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.reflection.notes").value("Keep notes"))
            .andExpect(jsonPath("$.reflection.sessionTitle").value("Corrected"))
            .andExpect(jsonPath("$.reflection.sessionSubtitle").value("Physics · 40 min"));
        mvc.perform(get(logUrl).param("userId", ownerId)).andExpect(status().isOk())
            .andExpect(jsonPath("$.logId").value(log.get("logId").asLong()))
            .andExpect(jsonPath("$.loggedAt").value(log.get("loggedAt").asText()));
        mvc.perform(put(sessionUrl).param("userId", ownerId).contentType(MediaType.APPLICATION_JSON)
            .content(body.deepCopy().put("id", "changed").toString())).andExpect(status().isBadRequest());
        mvc.perform(put(sessionUrl).param("userId", ownerId).contentType(MediaType.APPLICATION_JSON)
            .content(body.deepCopy().put("focusMinutes", 45).toString())).andExpect(status().isBadRequest());
        mvc.perform(put(sessionUrl).param("userId", other.getUserId().toString())
            .contentType(MediaType.APPLICATION_JSON).content(body.toString())).andExpect(status().isNotFound());
        mvc.perform(delete(logUrl).param("userId", other.getUserId().toString())).andExpect(status().isNotFound());

        mvc.perform(delete(logUrl).param("userId", ownerId)).andExpect(status().isNoContent());
        mvc.perform(get(logUrl).param("userId", ownerId)).andExpect(status().isNotFound());
        mvc.perform(get(sessionUrl).param("userId", ownerId)).andExpect(status().isOk())
            .andExpect(jsonPath("$.hasReflection").value(false));
        assertEquals(0, logs.count());
        mvc.perform(post(logUrl).param("userId", ownerId).contentType(MediaType.APPLICATION_JSON).content(reflection))
            .andExpect(status().isCreated());
        mvc.perform(delete(sessionUrl).param("userId", ownerId)).andExpect(status().isNoContent());
        assertEquals(0, logs.count());
        mvc.perform(delete("/api/flows/{id}", flowId)).andExpect(status().isNoContent());
        mvc.perform(delete("/api/users/{id}", owner.getUserId())).andExpect(status().isNoContent());
    }
}
