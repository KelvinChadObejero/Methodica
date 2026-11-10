package com.methodica.studyflow;

import static org.junit.jupiter.api.Assertions.*;

import com.methodica.studyflow.entity.StudyBlock;
import com.methodica.studyflow.entity.StudyFlow;
import com.methodica.studyflow.entity.StudyType;
import com.methodica.studyflow.repository.StudyBlockRepository;
import com.methodica.studyflow.repository.StudyFlowRepository;
import com.methodica.studyflow.repository.StudyTypeRepository;
import java.nio.file.Path;
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
            .run("--spring.datasource.url=jdbc:h2:file:" + db,
                "--spring.jpa.hibernate.ddl-auto=update");
    }

    @Test void recordsSurviveAFullApplicationRestart() {
        long flowId, typeId, blockId;
        try (ConfigurableApplicationContext app = start()) {
            String actualUrl = app.getEnvironment().getRequiredProperty("spring.datasource.url");
            assertEquals("jdbc:h2:file:" + directory.resolve("classroom").toAbsolutePath().toString().replace('\\', '/'), actualUrl);
            StudyFlow flow = app.getBean(StudyFlowRepository.class).save(new StudyFlow(1L, "Flow", "Description", false));
            StudyType type = app.getBean(StudyTypeRepository.class).save(new StudyType("Recall", "Description", "Retrieval", 25));
            StudyBlock block = new StudyBlock();
            block.update(flow, type, 0, 20, "Questions");
            block = app.getBean(StudyBlockRepository.class).save(block);
            flowId = flow.getFlowId(); typeId = type.getStudyTypeId(); blockId = block.getBlockId();
        }
        try (ConfigurableApplicationContext app = start()) {
            var flows = app.getBean(StudyFlowRepository.class);
            var types = app.getBean(StudyTypeRepository.class);
            var blocks = app.getBean(StudyBlockRepository.class);
            assertEquals("Flow", flows.findById(flowId).orElseThrow().getTitle());
            assertEquals("Retrieval", types.findById(typeId).orElseThrow().getScientificBasis());
            new TransactionTemplate(app.getBean(org.springframework.transaction.PlatformTransactionManager.class)).executeWithoutResult(status -> {
                StudyBlock saved = blocks.findById(blockId).orElseThrow();
                assertEquals(flowId, saved.getFlowId());
                assertEquals(typeId, saved.getStudyTypeId());
                assertEquals("Questions", saved.getCustomInstruction());
            });
            blocks.deleteById(blockId);
            types.deleteById(typeId);
            flows.deleteById(flowId);
        }
        try (ConfigurableApplicationContext app = start()) {
            assertFalse(app.getBean(StudyBlockRepository.class).existsById(blockId));
            assertFalse(app.getBean(StudyTypeRepository.class).existsById(typeId));
            assertFalse(app.getBean(StudyFlowRepository.class).existsById(flowId));
        }
    }
}
