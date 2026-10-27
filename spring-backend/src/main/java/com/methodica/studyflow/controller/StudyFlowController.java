package com.methodica.studyflow.controller;

import java.net.URI;
import java.util.List;
import com.methodica.studyflow.entity.StudyFlow;
import com.methodica.studyflow.service.StudyFlowService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/flows")
public class StudyFlowController {
    private final StudyFlowService service;

    public StudyFlowController(StudyFlowService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<StudyFlow> create(@Valid @RequestBody StudyFlowRequest request) {
        StudyFlow flow = service.create(request.userId(), request.title(), request.description(), request.isPublic());
        return ResponseEntity.created(URI.create("/api/flows/" + flow.getFlowId())).body(flow);
    }

    @GetMapping
    public List<StudyFlow> findAll() { return service.findAll(); }

    @GetMapping("/{id}")
    public StudyFlow findById(@PathVariable Long id) { return service.findById(id); }

    @PutMapping("/{id}")
    public StudyFlow update(@PathVariable Long id, @Valid @RequestBody StudyFlowRequest request) {
        return service.update(id, request.userId(), request.title(), request.description(), request.isPublic());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
