package com.methodica.studyflow.controller;

import java.net.URI;
import java.util.List;
import com.methodica.studyflow.entity.StudyType;
import com.methodica.studyflow.service.StudyTypeService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/studytypes")
public class StudyTypeController {
    private final StudyTypeService service;

    public StudyTypeController(StudyTypeService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<StudyType> create(@Valid @RequestBody StudyTypeRequest request) {
        StudyType type = service.create(request);
        return ResponseEntity.created(URI.create("/api/studytypes/" + type.getStudyTypeId())).body(type);
    }

    @GetMapping
    public List<StudyType> findAll() { return service.findAll(); }

    @GetMapping("/{id}")
    public StudyType findById(@PathVariable Long id) { return service.findById(id); }

    @PutMapping("/{id}")
    public StudyType update(@PathVariable Long id, @Valid @RequestBody StudyTypeRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
