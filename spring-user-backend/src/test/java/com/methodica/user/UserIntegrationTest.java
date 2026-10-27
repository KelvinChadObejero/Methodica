package com.methodica.user;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.methodica.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
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
}
