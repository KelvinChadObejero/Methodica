package com.methodica.studyflow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import com.methodica.studyflow.entity.*;
import com.methodica.studyflow.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import com.methodica.studyflow.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
@SpringBootTest @AutoConfigureMockMvc
@TestPropertySource(properties={"spring.datasource.url=jdbc:h2:mem:entitytest;DB_CLOSE_DELAY=-1","spring.jpa.hibernate.ddl-auto=create-drop"})
class StudyEntitiesIntegrationTest {
 @Autowired MockMvc mvc; @Autowired ObjectMapper mapper;
 @Autowired StudyBlockRepository blocks;
 @Autowired StudyFlowRepository flows;
 @Autowired StudyTypeRepository types;
 @Autowired UserRepository users;
 private Long ownerId;
 @BeforeEach void clearDatabase() {
  blocks.deleteAll(); flows.deleteAll(); types.deleteAll(); users.deleteAll();
  ownerId = users.save(new User("Owner", "owner@example.com", "hash", Role.STUDENT)).getUserId();
 }
 private String owned(String json) { return json.replace("\"userId\":1", "\"userId\":" + ownerId); }
 @Test void blockOrderingAndFailedUpdatesPreserveExistingData() throws Exception {
  long fid=mapper.readTree(mvc.perform(post("/api/flows").contentType(MediaType.APPLICATION_JSON)
    .content(owned("{\"userId\":1,\"title\":\"Ordered\",\"isPublic\":false}")))
    .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("flowId").asLong();
  long tid=mapper.readTree(mvc.perform(post("/api/studytypes").contentType(MediaType.APPLICATION_JSON)
    .content(owned("{\"title\":\"Recall\",\"defaultDuration\":25}")))
    .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("studyTypeId").asLong();
  String body="{\"flowId\":"+fid+",\"studyTypeId\":"+tid+",\"sequenceOrder\":1,\"durationMinutes\":25}";
  long first=mapper.readTree(mvc.perform(post("/api/blocks").contentType(MediaType.APPLICATION_JSON).content(body))
    .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("blockId").asLong();
  mvc.perform(post("/api/blocks").contentType(MediaType.APPLICATION_JSON)
    .content(body.replace("\"sequenceOrder\":1", "\"sequenceOrder\":0"))).andExpect(status().isCreated());
  mvc.perform(get("/api/blocks").param("flowId",Long.toString(fid))).andExpect(status().isOk())
    .andExpect(jsonPath("$[0].sequenceOrder").value(0)).andExpect(jsonPath("$[1].blockId").value(first));
  mvc.perform(put("/api/blocks/{id}",first).contentType(MediaType.APPLICATION_JSON)
    .content(body.replace("\"sequenceOrder\":1", "\"sequenceOrder\":0"))).andExpect(status().isConflict());
  mvc.perform(put("/api/blocks/{id}",first).contentType(MediaType.APPLICATION_JSON)
    .content(body.replace("\"flowId\":"+fid, "\"flowId\":999999"))).andExpect(status().isNotFound());
  mvc.perform(get("/api/blocks/{id}",first)).andExpect(status().isOk())
    .andExpect(jsonPath("$.sequenceOrder").value(1)).andExpect(jsonPath("$.flowId").value(fid));
  mvc.perform(get("/api/blocks").param("flowId","999999")).andExpect(status().isNotFound());
  mvc.perform(put("/api/blocks/999999").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isNotFound());
  mvc.perform(delete("/api/blocks/999999")).andExpect(status().isNotFound());
  mvc.perform(put("/api/studytypes/999999").contentType(MediaType.APPLICATION_JSON)
    .content(owned("{\"title\":\"Recall\",\"defaultDuration\":25}"))).andExpect(status().isNotFound());
  mvc.perform(delete("/api/studytypes/999999")).andExpect(status().isNotFound());
 }
 @Test void crudAndRelationships() throws Exception {
  String flow=mvc.perform(post("/api/flows").contentType(MediaType.APPLICATION_JSON).content(owned("{\"userId\":1,\"title\":\"Flow\",\"isPublic\":false}"))).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
  long fid=mapper.readTree(flow).get("flowId").asLong();
  String type=mvc.perform(post("/api/studytypes").contentType(MediaType.APPLICATION_JSON).content(owned("{\"title\":\"Recall\",\"description\":\"Review\",\"scientificBasis\":\"Retrieval practice\",\"defaultDuration\":25}"))).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
  long tid=mapper.readTree(type).get("studyTypeId").asLong();
  mvc.perform(get("/api/studytypes")).andExpect(status().isOk()).andExpect(jsonPath("$[0].title").value("Recall"));
  mvc.perform(get("/api/studytypes/{id}",tid)).andExpect(status().isOk()).andExpect(jsonPath("$.scientificBasis").value("Retrieval practice"));
  mvc.perform(post("/api/studytypes").contentType(MediaType.APPLICATION_JSON).content(owned("{\"title\":\" \",\"defaultDuration\":0}"))).andExpect(status().isBadRequest());
  mvc.perform(put("/api/studytypes/{id}",tid).contentType(MediaType.APPLICATION_JSON).content(owned("{\"title\":\"Active recall\",\"defaultDuration\":20}"))).andExpect(status().isOk());
  String body="{\"flowId\":"+fid+",\"studyTypeId\":"+tid+",\"sequenceOrder\":0,\"durationMinutes\":25,\"customInstruction\":\"Practice\"}";
  mvc.perform(post("/api/blocks").contentType(MediaType.APPLICATION_JSON).content(body.replace("\"studyTypeId\":"+tid, "\"studyTypeId\":999999"))).andExpect(status().isNotFound());
  String block=mvc.perform(post("/api/blocks").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isCreated()).andExpect(jsonPath("$.flowId").value(fid)).andReturn().getResponse().getContentAsString();
  long bid=mapper.readTree(block).get("blockId").asLong();
  mvc.perform(get("/api/blocks")).andExpect(status().isOk()).andExpect(jsonPath("$[0].studyTypeId").value(tid));
  mvc.perform(get("/api/blocks/{id}",bid)).andExpect(status().isOk());
  mvc.perform(put("/api/blocks/{id}",bid).contentType(MediaType.APPLICATION_JSON).content(body.replace("Practice","Review"))).andExpect(status().isOk()).andExpect(jsonPath("$.customInstruction").value("Review"));
  mvc.perform(post("/api/blocks").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isConflict());
  mvc.perform(post("/api/blocks").contentType(MediaType.APPLICATION_JSON).content(body.replace("25,", "0,"))).andExpect(status().isBadRequest());
  mvc.perform(delete("/api/flows/{id}",fid)).andExpect(status().isConflict());
  mvc.perform(delete("/api/studytypes/{id}",tid)).andExpect(status().isConflict());
  mvc.perform(delete("/api/blocks/{id}",bid)).andExpect(status().isNoContent());
  mvc.perform(get("/api/blocks/{id}",bid)).andExpect(status().isNotFound());
  mvc.perform(delete("/api/studytypes/{id}",tid)).andExpect(status().isNoContent());
  mvc.perform(get("/api/studytypes/{id}",tid)).andExpect(status().isNotFound());
  mvc.perform(delete("/api/flows/{id}",fid)).andExpect(status().isNoContent());
 }
}
