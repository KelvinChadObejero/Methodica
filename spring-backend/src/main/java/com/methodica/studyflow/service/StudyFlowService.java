package com.methodica.studyflow.service;

import java.util.List;
import com.methodica.studyflow.entity.StudyFlow;
import com.methodica.studyflow.repository.StudyFlowRepository;
import com.methodica.studyflow.repository.StudyBlockRepository;
import com.methodica.studyflow.repository.UserRepository;
import com.methodica.studyflow.repository.StudySessionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StudyFlowService {
    private final StudyFlowRepository repository;
    private final StudyBlockRepository blocks;
    private final UserRepository users;
    private final StudySessionRepository sessions;

    public StudyFlowService(StudyFlowRepository repository, StudyBlockRepository blocks,
                            UserRepository users, StudySessionRepository sessions) {
        this.repository = repository;
        this.blocks = blocks;
        this.users = users;
        this.sessions = sessions;
    }

    public StudyFlow create(Long userId, String title, String description, boolean isPublic) {
        requireUser(userId);
        return repository.save(new StudyFlow(userId, title, description, isPublic));
    }

    public List<StudyFlow> findAll() { return repository.findAll(); }

    public StudyFlow findById(Long id) {
        return repository.findById(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Study flow " + id + " was not found"));
    }

    public StudyFlow update(Long id, Long userId, String title, String description, boolean isPublic) {
        StudyFlow flow = findById(id);
        requireUser(userId);
        if (!flow.getUserId().equals(userId) && sessions.existsByFlowId(id))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A flow with sessions cannot change owner");
        flow.setUserId(userId);
        flow.setTitle(title);
        flow.setDescription(description);
        flow.setPublic(isPublic);
        return repository.save(flow);
    }

    public void delete(Long id) {
        StudyFlow flow = findById(id);
        if (blocks.existsByFlowFlowId(id))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Study flow contains blocks");
        if (sessions.existsByFlowId(id))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Study flow has study sessions");
        repository.delete(flow);
    }

    private void requireUser(Long id) {
        if (!users.existsById(id))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User " + id + " was not found");
    }
}
