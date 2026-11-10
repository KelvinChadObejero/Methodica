package com.methodica.studyflow.entity;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import jakarta.persistence.*;

@Entity
@Table(name = "session_log")
public class SessionLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long logId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false, unique = true, updatable = false)
    private StudySession session;

    @Column(nullable = false, updatable = false)
    private Instant loggedAt;
    @Column(nullable = false, length = 120)
    private String sessionTitle;
    @Column(nullable = false, length = 100)
    private String sessionSubtitle;
    @Column(name = "comprehension_rating", nullable = false)
    private int comprehension;
    @Column(name = "fatigue_rating", nullable = false)
    private int fatigue;
    @Column(name = "reflection_notes", nullable = false, length = 5000)
    private String notes;

    protected SessionLog() {}

    public SessionLog(StudySession session, int comprehension, int fatigue, String notes) {
        this.session = session;
        refreshSessionSummary();
        update(comprehension, fatigue, notes);
    }

    @PrePersist
    void setLoggedAt() { loggedAt = Instant.now().truncatedTo(ChronoUnit.MICROS); }

    public Long getLogId() { return logId; }
    public Instant getLoggedAt() { return loggedAt; }
    public String getSessionId() { return session.getId(); }
    public String getSessionTitle() { return sessionTitle; }
    public String getSessionSubtitle() { return sessionSubtitle; }
    public int getComprehension() { return comprehension; }
    public int getFatigue() { return fatigue; }
    public String getNotes() { return notes; }

    public void refreshSessionSummary() {
        sessionTitle = session.getFlowTitle();
        sessionSubtitle = session.getSubject() + " · " + Math.round(session.getDurationMinutes()) + " min";
    }

    public void update(int comprehension, int fatigue, String notes) {
        this.comprehension = comprehension;
        this.fatigue = fatigue;
        this.notes = notes;
    }
}
