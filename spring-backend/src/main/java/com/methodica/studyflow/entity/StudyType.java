package com.methodica.studyflow.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "study_type")
public class StudyType {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long studyTypeId;
    @Column(nullable = false, length = 200) private String title;
    @Column(length = 2000) private String description;
    @Column(length = 2000) private String scientificBasis;
    @Column(nullable = false) private int defaultDuration;

    protected StudyType() {}
    public StudyType(String title, String description, String scientificBasis, int defaultDuration) {
        update(title, description, scientificBasis, defaultDuration);
    }
    public void update(String title, String description, String scientificBasis, int defaultDuration) {
        this.title = title; this.description = description; this.scientificBasis = scientificBasis; this.defaultDuration = defaultDuration;
    }
    public Long getStudyTypeId() { return studyTypeId; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getScientificBasis() { return scientificBasis; }
    public int getDefaultDuration() { return defaultDuration; }
}
