package com.methodica.user.entity;

import jakarta.persistence.*;
import org.springframework.data.domain.Persistable;

@Entity
@Table(name = "session_log")
public class SessionLog implements Persistable<String> {
    @Id
    @Column(name = "session_id", length = 80)
    private String sessionId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "session_id", nullable = false)
    private StudySession session;

    @Column(nullable = false, length = 120)
    private String sessionTitle;
    @Column(nullable = false, length = 100)
    private String sessionSubtitle;
    @Column(nullable = false)
    private int comprehension;
    @Column(nullable = false)
    private int fatigue;
    @Column(nullable = false, length = 5000)
    private String notes;
    @Transient
    private boolean newEntity = true;

    protected SessionLog() {}

    public SessionLog(StudySession session, int comprehension, int fatigue, String notes) {
        this.sessionId = session.getId();
        this.session = session;
        this.sessionTitle = session.getFlowTitle();
        this.sessionSubtitle = session.getSubject() + " · " + Math.round(session.getDurationMinutes()) + " min";
        this.comprehension = comprehension;
        this.fatigue = fatigue;
        this.notes = notes;
    }

    public String getSessionId() { return sessionId; }
    @Override
    public String getId() { return sessionId; }
    @Override
    public boolean isNew() { return newEntity; }
    public String getSessionTitle() { return sessionTitle; }
    public String getSessionSubtitle() { return sessionSubtitle; }
    public int getComprehension() { return comprehension; }
    public int getFatigue() { return fatigue; }
    public String getNotes() { return notes; }
    public void update(int comprehension, int fatigue, String notes) {
        this.comprehension = comprehension;
        this.fatigue = fatigue;
        this.notes = notes;
    }

    @PostPersist
    void markPersisted() { newEntity = false; }

    @PostLoad
    void markLoaded() { newEntity = false; }
}
