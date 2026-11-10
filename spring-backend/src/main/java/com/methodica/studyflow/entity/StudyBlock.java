package com.methodica.studyflow.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

@Entity
@Table(name = "study_block", uniqueConstraints = @UniqueConstraint(columnNames = {"flow_id", "sequence_order"}))
public class StudyBlock {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long blockId;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "flow_id", nullable = false) @JsonIgnore private StudyFlow flow;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "study_type_id", nullable = false) @JsonIgnore private StudyType studyType;
    @Column(name = "sequence_order", nullable = false) private int sequenceOrder;
    @Column(nullable = false) private int durationMinutes;
    @Column(length = 2000) private String customInstruction;

    public StudyBlock() {}
    public void update(StudyFlow flow, StudyType studyType, int sequenceOrder, int durationMinutes, String customInstruction) {
        this.flow = flow; this.studyType = studyType; this.sequenceOrder = sequenceOrder;
        this.durationMinutes = durationMinutes; this.customInstruction = customInstruction;
    }
    public Long getBlockId() { return blockId; }
    public Long getFlowId() { return flow.getFlowId(); }
    public Long getStudyTypeId() { return studyType.getStudyTypeId(); }
    public int getSequenceOrder() { return sequenceOrder; }
    public int getDurationMinutes() { return durationMinutes; }
    public String getCustomInstruction() { return customInstruction; }
}
