package com.methodica.user.controller;

import java.net.URI;
import java.util.List;
import com.methodica.user.entity.StudySession;
import com.methodica.user.service.StudySessionService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@Validated
@RequestMapping("/api/sessions")
public class StudySessionController {
    private final StudySessionService service;

    public StudySessionController(StudySessionService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<StudySessionResponse> create(@Valid @RequestBody StudySessionRequest request) {
        StudySessionService.Creation result = service.create(request);
        return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK)
            .location(URI.create("/api/sessions/" + result.session().getId()))
            .body(StudySessionResponse.from(result.session()));
    }

    @GetMapping
    public List<StudySessionResponse> findAll(@RequestParam @Positive Long userId) {
        return service.findAll(userId).stream().map(StudySessionResponse::from).toList();
    }

    @GetMapping("/{id}")
    public StudySessionResponse findById(@PathVariable String id, @RequestParam @Positive Long userId) {
        return StudySessionResponse.from(service.findById(id, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id, @RequestParam @Positive Long userId) {
        service.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/log")
    public StudySessionResponse saveLog(@PathVariable String id, @RequestParam @Positive Long userId,
                                        @Valid @RequestBody SessionLogRequest request) {
        service.saveLog(id, userId, request.comprehension(), request.fatigue(), request.notes());
        return StudySessionResponse.from(service.findById(id, userId));
    }

    @GetMapping("/{id}/log")
    public SessionLogResponse findLog(@PathVariable String id, @RequestParam @Positive Long userId) {
        return SessionLogResponse.from(service.findLog(id, userId));
    }

    @DeleteMapping("/{id}/log")
    public ResponseEntity<Void> deleteLog(@PathVariable String id, @RequestParam @Positive Long userId) {
        service.deleteLog(id, userId);
        return ResponseEntity.noContent().build();
    }
}
