package com.methodica.user.controller;

import com.methodica.user.entity.StudySession;

public record StudySessionResponse(
    String id,
    Long userId,
    String flowId,
    String flowTitle,
    String flowTag,
    java.time.Instant startedAt,
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
            session.getFlowTitle(), session.getFlowTag(), session.getStartedAt(), session.getDurationMinutes(),
            session.getFocusMinutes(), session.getSubject(), session.getStatus().name(),
            reflection != null, reflection);
    }
}
