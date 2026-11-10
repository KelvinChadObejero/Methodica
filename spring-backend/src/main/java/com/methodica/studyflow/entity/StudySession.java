package com.methodica.studyflow.entity;

import java.time.Instant;
import jakarta.persistence.*;

@Entity
@Table(name = "study_session", indexes = {
    @Index(columnList = "user_id, started_at"),
    @Index(columnList = "user_id, subject")
})
public class StudySession {
    @Id
    @Column(length = 80, updatable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, updatable = false)
    private User user;

    @Column(name = "flow_id", nullable = false)
    private Long flowId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "flow_id", nullable = false, insertable = false, updatable = false)
    private StudyFlow flow;
    @Column(nullable = false, length = 120)
    private String flowTitle;
    @Column(nullable = false, length = 60)
    private String flowTag;
    @Column(nullable = false)
    private Instant startedAt;
    @Column(nullable = false)
    private Instant endedAt;
    @Column(nullable = false)
    private double durationMinutes;
    @Column(nullable = false)
    private double focusMinutes;
    @Column(nullable = false, length = 60)
    private String subject;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StudySessionStatus status;

    @OneToOne(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private SessionLog log;

    protected StudySession() {}

    public StudySession(String id, User user, Long flowId, String flowTitle, String flowTag,
                        Instant startedAt, double durationMinutes, double focusMinutes,
                        String subject, StudySessionStatus status) {
        this.id = id;
        this.user = user;
        this.flowId = flowId;
        this.flowTitle = flowTitle;
        this.flowTag = flowTag;
        this.startedAt = startedAt;
        this.endedAt = startedAt.plusMillis(Math.round(durationMinutes * 60_000));
        this.durationMinutes = durationMinutes;
        this.focusMinutes = focusMinutes;
        this.subject = subject;
        this.status = status;
    }

    public String getId() { return id; }
    public Long getUserId() { return user.getUserId(); }
    public Long getFlowId() { return flowId; }
    public String getFlowTitle() { return flowTitle; }
    public String getFlowTag() { return flowTag; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getEndedAt() { return endedAt; }
    public double getDurationMinutes() { return durationMinutes; }
    public double getFocusMinutes() { return focusMinutes; }
    public String getSubject() { return subject; }
    public StudySessionStatus getStatus() { return status; }
    public SessionLog getLog() { return log; }
    public void setLog(SessionLog log) { this.log = log; }

    public void update(Long flowId, String flowTitle, String flowTag, Instant startedAt,
                       double durationMinutes, double focusMinutes, String subject, StudySessionStatus status) {
        this.flowId = flowId;
        this.flowTitle = flowTitle;
        this.flowTag = flowTag;
        this.startedAt = startedAt;
        this.endedAt = startedAt.plusMillis(Math.round(durationMinutes * 60_000));
        this.durationMinutes = durationMinutes;
        this.focusMinutes = focusMinutes;
        this.subject = subject;
        this.status = status;
        if (log != null) log.refreshSessionSummary();
    }
}
