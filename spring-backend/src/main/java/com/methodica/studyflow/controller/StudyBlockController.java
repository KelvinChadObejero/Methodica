package com.methodica.studyflow.controller;

import java.net.URI;
import java.util.List;
import com.methodica.studyflow.entity.StudyBlock;
import com.methodica.studyflow.service.StudyBlockService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/blocks")
public class StudyBlockController {
    private final StudyBlockService service;

    public StudyBlockController(StudyBlockService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<StudyBlock> create(@Valid @RequestBody StudyBlockRequest request) {
        StudyBlock block = service.create(request);
        return ResponseEntity.created(URI.create("/api/blocks/" + block.getBlockId())).body(block);
    }

    @GetMapping
    public List<StudyBlock> findAll(@RequestParam(required = false) Long flowId) { return service.findAll(flowId); }

    @GetMapping("/{id}")
    public StudyBlock findById(@PathVariable Long id) { return service.findById(id); }

    @PutMapping("/{id}")
    public StudyBlock update(@PathVariable Long id, @Valid @RequestBody StudyBlockRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
