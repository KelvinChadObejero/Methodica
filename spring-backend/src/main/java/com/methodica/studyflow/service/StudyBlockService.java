package com.methodica.studyflow.service;

import java.util.List;
import com.methodica.studyflow.controller.StudyBlockRequest;
import com.methodica.studyflow.entity.*;
import com.methodica.studyflow.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class StudyBlockService {
    private final StudyBlockRepository blocks;
    private final StudyFlowRepository flows;
    private final StudyTypeRepository types;

    public StudyBlockService(StudyBlockRepository blocks, StudyFlowRepository flows, StudyTypeRepository types) {
        this.blocks = blocks;
        this.flows = flows;
        this.types = types;
    }

    public StudyBlock create(StudyBlockRequest request) {
        StudyBlock block = new StudyBlock();
        apply(block, request, -1L);
        return blocks.saveAndFlush(block);
    }

    @Transactional(readOnly = true)
    public List<StudyBlock> findAll(Long flowId) {
        if (flowId == null) return blocks.findAllByOrderByFlowFlowIdAscSequenceOrderAsc();
        if (!flows.existsById(flowId))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Study flow " + flowId + " was not found");
        return blocks.findAllByFlowFlowIdOrderBySequenceOrderAsc(flowId);
    }

    @Transactional(readOnly = true)
    public StudyBlock findById(Long id) {
        return blocks.findById(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Study block " + id + " was not found"));
    }

    public StudyBlock update(Long id, StudyBlockRequest request) {
        StudyBlock block = findById(id);
        apply(block, request, id);
        return blocks.saveAndFlush(block);
    }

    public void delete(Long id) { blocks.delete(findById(id)); }

    private void apply(StudyBlock block, StudyBlockRequest request, Long id) {
        StudyFlow flow = flows.findById(request.flowId()).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Study flow was not found"));
        StudyType type = types.findById(request.studyTypeId()).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Study type was not found"));
        if (blocks.existsByFlowFlowIdAndSequenceOrderAndBlockIdNot(request.flowId(), request.sequenceOrder(), id))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Position already used in this flow");
        block.update(flow, type, request.sequenceOrder(), request.durationMinutes(), request.customInstruction());
    }
}
