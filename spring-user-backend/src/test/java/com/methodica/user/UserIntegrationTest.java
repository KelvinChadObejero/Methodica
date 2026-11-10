package com.methodica.user;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.methodica.user.entity.Role;
import com.methodica.user.entity.User;
import com.methodica.user.repository.SessionLogRepository;
import com.methodica.user.repository.StudySessionRepository;
import com.methodica.user.repository.UserRepository;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {"spring.datasource.url=jdbc:h2:mem:users;DB_CLOSE_DELAY=-1", "spring.jpa.hibernate.ddl-auto=create-drop"})
class UserIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired UserRepository repository;
    @Autowired StudySessionRepository sessionRepository;
    @Autowired SessionLogRepository logRepository;

    @BeforeEach
    void clearDatabase() {
        logRepository.deleteAll();
        sessionRepository.deleteAll();
        repository.deleteAll();
    }

    @Test
    void allowsOnlyConfiguredOriginForBrowserDemo() throws Exception {
        mvc.perform(options("/api/users").header("Origin", "http://localhost:5173")
            .header("Access-Control-Request-Method", "POST")
            .header("Access-Control-Request-Private-Network", "true"))
            .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
            .andExpect(header().string("Access-Control-Allow-Private-Network", "true"));
        mvc.perform(options("/api/users").header("Origin", "https://other.example")
            .header("Access-Control-Request-Method", "POST"))
            .andExpect(status().isForbidden());
    }

    @Test
    void crudValidationAndPasswordHandling() throws Exception {
        String body = """
            {"name":"Alex","email":"Alex@example.com","password":"classroom123","role":"STUDENT"}
            """;
        String result = mvc.perform(post("/api/users").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.password").doesNotExist())
            .andExpect(jsonPath("$.passwordHash").doesNotExist()).andExpect(jsonPath("$.email").value("alex@example.com"))
            .andReturn().getResponse().getContentAsString();
        JsonNode created = mapper.readTree(result);
        long id = created.get("userId").asLong();
        String originalHash = repository.findById(id).orElseThrow().getPasswordHash();
        assertTrue(new BCryptPasswordEncoder().matches("classroom123", originalHash));
        mvc.perform(get("/api/users")).andExpect(status().isOk()).andExpect(jsonPath("$[0].userId").value(id))
            .andExpect(jsonPath("$[0].passwordHash").doesNotExist());
        mvc.perform(get("/api/users/{id}", id)).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Alex"));
        mvc.perform(post("/api/users").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isConflict());
        mvc.perform(put("/api/users/{id}", id).contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Alex Updated\",\"email\":\"alex@example.com\",\"role\":\"MENTOR\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Alex Updated"))
            .andExpect(jsonPath("$.createdAt").value(created.get("createdAt").asText()));
        assertEquals(originalHash, repository.findById(id).orElseThrow().getPasswordHash());
        mvc.perform(post("/api/users").contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"\",\"email\":\"bad\",\"password\":\"short\",\"role\":\"STUDENT\"}"))
            .andExpect(status().isBadRequest());
        mvc.perform(delete("/api/users/{id}", id)).andExpect(status().isNoContent());
        mvc.perform(get("/api/users/{id}", id)).andExpect(status().isNotFound());
        mvc.perform(delete("/api/users/{id}", id)).andExpect(status().isNotFound());
    }

    @Test
    void studySessionsAndOneToOneReflectionAreScopedAndRetrySafe() throws Exception {
        User user = repository.save(new User("Alex", "session@example.com", "hash", Role.STUDENT));
        Instant startedAt = Instant.now().minusSeconds(3600);
        String body = """
            {"id":"session-1","userId":%d,"flowId":"flow-1","flowTitle":"Recall",
             "flowTag":"Biology","startedAt":"%s","durationMinutes":30,"focusMinutes":25,
             "subject":"Biology","status":"completed"}
            """.formatted(user.getUserId(), startedAt);

        mvc.perform(post("/api/sessions").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value("session-1"))
            .andExpect(jsonPath("$.hasReflection").value(false));
        mvc.perform(post("/api/sessions").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isOk());
        mvc.perform(post("/api/sessions").contentType(MediaType.APPLICATION_JSON)
            .content(body.replace("\"focusMinutes\":25", "\"focusMinutes\":24")))
            .andExpect(status().isConflict());
        mvc.perform(get("/api/sessions").param("userId", user.getUserId().toString()))
            .andExpect(status().isOk()).andExpect(jsonPath("$[0].flowTitle").value("Recall"));

        mvc.perform(put("/api/sessions/session-1/log").param("userId", user.getUserId().toString())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"comprehension\":4,\"fatigue\":2,\"notes\":\"Useful\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.hasReflection").value(true))
            .andExpect(jsonPath("$.reflection.sessionTitle").value("Recall"))
            .andExpect(jsonPath("$.reflection.sessionSubtitle").value("Biology · 30 min"));
        mvc.perform(put("/api/sessions/session-1/log").param("userId", user.getUserId().toString())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"comprehension\":5,\"fatigue\":1,\"notes\":\"Updated\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.reflection.notes").value("Updated"));
        mvc.perform(get("/api/sessions/session-1/log").param("userId", user.getUserId().toString()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.comprehension").value(5));
        assertEquals(1, logRepository.count());

        User other = repository.save(new User("Other", "other@example.com", "hash", Role.STUDENT));
        mvc.perform(get("/api/sessions/session-1").param("userId", other.getUserId().toString()))
            .andExpect(status().isNotFound());
        mvc.perform(put("/api/sessions/session-1/log").param("userId", other.getUserId().toString())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"comprehension\":4,\"fatigue\":2,\"notes\":\"No access\"}"))
            .andExpect(status().isNotFound());
        mvc.perform(put("/api/sessions/session-1/log").param("userId", user.getUserId().toString())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"comprehension\":6,\"fatigue\":2,\"notes\":\"Invalid\"}"))
            .andExpect(status().isBadRequest());

        mvc.perform(delete("/api/sessions/session-1").param("userId", user.getUserId().toString()))
            .andExpect(status().isNoContent());
        assertEquals(0, logRepository.count());
        assertEquals(0, sessionRepository.count());
    }

    @Test
    void rejectsSessionsThatExceedElapsedTimeOrHaveFutureStartTimes() throws Exception {
        User user = repository.save(new User("Alex", "timing@example.com", "hash", Role.STUDENT));
        String future = """
            {"id":"future","userId":%d,"flowId":"flow-1","flowTitle":"Recall","flowTag":"Biology",
             "startedAt":"%s","durationMinutes":30,"focusMinutes":25,"subject":"Biology","status":"completed"}
            """.formatted(user.getUserId(), Instant.now().plusSeconds(3600));
        mvc.perform(post("/api/sessions").contentType(MediaType.APPLICATION_JSON).content(future))
            .andExpect(status().isBadRequest());
    }
}
