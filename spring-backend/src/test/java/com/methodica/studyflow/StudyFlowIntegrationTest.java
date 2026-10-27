package com.methodica.studyflow;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {"spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1", "spring.jpa.hibernate.ddl-auto=create-drop"})
class StudyFlowIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;

    @Test
    void allowsOnlyConfiguredOriginForBrowserDemo() throws Exception {
        mvc.perform(options("/api/flows").header("Origin", "http://localhost:5173")
            .header("Access-Control-Request-Method", "POST")
            .header("Access-Control-Request-Private-Network", "true"))
            .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
            .andExpect(header().string("Access-Control-Allow-Private-Network", "true"));
        mvc.perform(options("/api/flows").header("Origin", "https://other.example")
            .header("Access-Control-Request-Method", "POST"))
            .andExpect(status().isForbidden());
    }

    @Test
    void crudAndValidation() throws Exception {
        String body = """
            {"userId":1,"title":"Recall","description":"Review","isPublic":false}
            """;
        String created = mvc.perform(post("/api/flows").contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.isPublic").value(false))
            .andExpect(jsonPath("$.createdAt").exists()).andReturn().getResponse().getContentAsString();
        JsonNode flow = mapper.readTree(created);
        long id = flow.get("flowId").asLong();
        mvc.perform(get("/api/flows")).andExpect(status().isOk()).andExpect(jsonPath("$[0].flowId").value(id));
        mvc.perform(get("/api/flows/{id}", id)).andExpect(status().isOk()).andExpect(jsonPath("$.title").value("Recall"));
        mvc.perform(put("/api/flows/{id}", id).contentType(MediaType.APPLICATION_JSON)
            .content("{\"userId\":1,\"title\":\"Updated\",\"isPublic\":true}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.title").value("Updated"))
            .andExpect(jsonPath("$.createdAt").value(flow.get("createdAt").asText()));
        mvc.perform(post("/api/flows").contentType(MediaType.APPLICATION_JSON)
            .content("{\"userId\":1,\"title\":\" \",\"isPublic\":false}"))
            .andExpect(status().isBadRequest());
        mvc.perform(delete("/api/flows/{id}", id)).andExpect(status().isNoContent());
        mvc.perform(get("/api/flows/{id}", id)).andExpect(status().isNotFound());
        mvc.perform(delete("/api/flows/{id}", id)).andExpect(status().isNotFound());
        mvc.perform(put("/api/flows/{id}", id).contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isNotFound());
    }
}
