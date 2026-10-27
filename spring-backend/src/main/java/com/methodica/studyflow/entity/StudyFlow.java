package com.methodica.studyflow.entity;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

@Entity
@Table(name = "study_flow")
public class StudyFlow {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long flowId;

    // The User entity is outside this assignment. This is not yet a foreign key.
    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 2000)
    private String description;

    @Column(nullable = false)
    private boolean isPublic;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected StudyFlow() {}

    public StudyFlow(Long userId, String title, String description, boolean isPublic) {
        this.userId = userId;
        this.title = title;
        this.description = description;
        this.isPublic = isPublic;
    }

    @PrePersist
    void setCreatedAt() { createdAt = Instant.now().truncatedTo(ChronoUnit.MICROS); }

    public Long getFlowId() { return flowId; }
    public Long getUserId() { return userId; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    @JsonProperty("isPublic")
    public boolean isPublic() { return isPublic; }
    public Instant getCreatedAt() { return createdAt; }
    public void setUserId(Long userId) { this.userId = userId; }
    public void setTitle(String title) { this.title = title; }
    public void setDescription(String description) { this.description = description; }
    public void setPublic(boolean isPublic) { this.isPublic = isPublic; }
}
