package com.methodica.studyflow.service;

import java.util.List;
import com.methodica.studyflow.entity.StudyFlow;
import com.methodica.studyflow.repository.StudyFlowRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StudyFlowService {
    private final StudyFlowRepository repository;

    public StudyFlowService(StudyFlowRepository repository) { this.repository = repository; }

    public StudyFlow create(Long userId, String title, String description, boolean isPublic) {
        return repository.save(new StudyFlow(userId, title, description, isPublic));
    }

    public List<StudyFlow> findAll() { return repository.findAll(); }

    public StudyFlow findById(Long id) {
        return repository.findById(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Study flow " + id + " was not found"));
    }

    public StudyFlow update(Long id, Long userId, String title, String description, boolean isPublic) {
        StudyFlow flow = findById(id);
        flow.setUserId(userId);
        flow.setTitle(title);
        flow.setDescription(description);
        flow.setPublic(isPublic);
        return repository.save(flow);
    }

    public void delete(Long id) { repository.delete(findById(id)); }
}
