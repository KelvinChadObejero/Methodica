package com.methodica.studyflow.controller;

import com.methodica.studyflow.entity.StudySession;

public record StudySessionResponse(
    String id,
    Long userId,
    Long flowId,
    String flowTitle,
    String flowTag,
    java.time.Instant startedAt,
    java.time.Instant endedAt,
    double durationMinutes,
    double focusMinutes,
    String subject,
    String status,
    boolean hasReflection,
    SessionLogResponse reflection
) {
    public static StudySessionResponse from(StudySession session) {
        SessionLogResponse reflection = session.getLog() == null ? null : SessionLogResponse.from(session.getLog());
        return new StudySessionResponse(session.getId(), session.getUserId(), session.getFlowId(),
            session.getFlowTitle(), session.getFlowTag(), session.getStartedAt(), session.getEndedAt(), session.getDurationMinutes(),
            session.getFocusMinutes(), session.getSubject(), session.getStatus().name(),
            reflection != null, reflection);
    }
}
