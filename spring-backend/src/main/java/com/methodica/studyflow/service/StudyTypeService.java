package com.methodica.studyflow.service;

import java.util.List;
import com.methodica.studyflow.controller.StudyTypeRequest;
import com.methodica.studyflow.entity.StudyType;
import com.methodica.studyflow.repository.StudyTypeRepository;
import com.methodica.studyflow.repository.StudyBlockRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class StudyTypeService {
    private final StudyTypeRepository types;
    private final StudyBlockRepository blocks;

    public StudyTypeService(StudyTypeRepository types, StudyBlockRepository blocks) {
        this.types = types;
        this.blocks = blocks;
    }

    public StudyType create(StudyTypeRequest request) {
        return types.save(new StudyType(request.title(), request.description(),
            request.scientificBasis(), request.defaultDuration()));
    }

    @Transactional(readOnly = true)
    public List<StudyType> findAll() { return types.findAll(); }

    @Transactional(readOnly = true)
    public StudyType findById(Long id) {
        return types.findById(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Study type " + id + " was not found"));
    }

    public StudyType update(Long id, StudyTypeRequest request) {
        StudyType type = findById(id);
        type.update(request.title(), request.description(), request.scientificBasis(), request.defaultDuration());
        return types.save(type);
    }

    public void delete(Long id) {
        StudyType type = findById(id);
        if (blocks.existsByStudyTypeStudyTypeId(id))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Study type is used by a block");
        types.delete(type);
    }
}
