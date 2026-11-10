package com.methodica.studyflow;

import static org.junit.jupiter.api.Assertions.*;

import com.methodica.studyflow.controller.StudySessionRequest;
import com.methodica.studyflow.entity.*;
import com.methodica.studyflow.repository.*;
import com.methodica.studyflow.service.StudySessionService;
import java.nio.file.Path;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.transaction.support.TransactionTemplate;

class PersistenceRestartTest {
    @TempDir Path directory;

    private ConfigurableApplicationContext start() {
        String db = directory.resolve("classroom").toAbsolutePath().toString().replace('\\', '/');
        return new SpringApplicationBuilder(StudyFlowApplication.class)
            .web(WebApplicationType.NONE)
            .run("--spring.datasource.url=jdbc:h2:file:" + db, "--spring.jpa.hibernate.ddl-auto=update");
    }

    @Test
    void allSixEntitiesAndCorrectionsSurviveApplicationRestarts() {
        long userId, flowId, typeId, blockId, logId;
        Instant loggedAt;
        try (var app = start()) {
            assertEquals("jdbc:h2:file:" + directory.resolve("classroom").toAbsolutePath().toString().replace('\\', '/'),
                app.getEnvironment().getRequiredProperty("spring.datasource.url"));
            userId = app.getBean(UserRepository.class).save(new User("Owner", "restart@example.com", "hash", Role.STUDENT)).getUserId();
            StudyFlow flow = app.getBean(StudyFlowRepository.class).save(new StudyFlow(userId, "Flow", "Description", false));
            StudyType type = app.getBean(StudyTypeRepository.class).save(new StudyType("Recall", "Description", "Retrieval", 25));
            StudyBlock block = new StudyBlock();
            block.update(flow, type, 0, 20, "Questions");
            block = app.getBean(StudyBlockRepository.class).save(block);
            flowId = flow.getFlowId(); typeId = type.getStudyTypeId(); blockId = block.getBlockId();
            var sessions = app.getBean(StudySessionService.class);
            sessions.create(new StudySessionRequest("restart", userId, flowId, "Flow", "Biology",
                Instant.now().minusSeconds(7200), 30.0, 25.0, "Biology", StudySessionStatus.completed));
            SessionLog log = sessions.saveLog("restart", userId, 4, 2, "Persisted notes");
            logId = log.getLogId(); loggedAt = log.getLoggedAt();
        }
        try (var app = start()) {
            assertEquals("Owner", app.getBean(UserRepository.class).findById(userId).orElseThrow().getName());
            assertEquals("Flow", app.getBean(StudyFlowRepository.class).findById(flowId).orElseThrow().getTitle());
            assertEquals("Retrieval", app.getBean(StudyTypeRepository.class).findById(typeId).orElseThrow().getScientificBasis());
            new TransactionTemplate(app.getBean(org.springframework.transaction.PlatformTransactionManager.class)).executeWithoutResult(status -> {
                StudyBlock block = app.getBean(StudyBlockRepository.class).findById(blockId).orElseThrow();
                assertEquals(flowId, block.getFlowId());
                assertEquals(typeId, block.getStudyTypeId());
            });
            var sessions = app.getBean(StudySessionService.class);
            assertEquals(flowId, sessions.findById("restart", userId).getFlowId());
            assertEquals(logId, sessions.findLog("restart", userId).getLogId());
            assertEquals(loggedAt, sessions.findLog("restart", userId).getLoggedAt());
            sessions.update("restart", userId, new StudySessionRequest("restart", userId, flowId, "Corrected", "Physics",
                Instant.now().minusSeconds(7200), 40.0, 30.0, "Physics", StudySessionStatus.completed));
        }
        try (var app = start()) {
            var sessions = app.getBean(StudySessionService.class);
            var session = sessions.findById("restart", userId);
            assertEquals(40.0, session.getDurationMinutes());
            assertEquals(session.getStartedAt().plusSeconds(2400), session.getEndedAt());
            assertEquals("Corrected", sessions.findLog("restart", userId).getSessionTitle());
            assertEquals("Persisted notes", sessions.findLog("restart", userId).getNotes());
            sessions.delete("restart", userId);
            app.getBean(StudyBlockRepository.class).deleteById(blockId);
            app.getBean(StudyTypeRepository.class).deleteById(typeId);
            app.getBean(StudyFlowRepository.class).deleteById(flowId);
            app.getBean(UserRepository.class).deleteById(userId);
        }
        try (var app = start()) {
            assertEquals(0, app.getBean(UserRepository.class).count());
            assertEquals(0, app.getBean(StudyFlowRepository.class).count());
            assertEquals(0, app.getBean(StudyTypeRepository.class).count());
            assertEquals(0, app.getBean(StudyBlockRepository.class).count());
            assertEquals(0, app.getBean(StudySessionRepository.class).count());
            assertEquals(0, app.getBean(SessionLogRepository.class).count());
        }
    }
}
