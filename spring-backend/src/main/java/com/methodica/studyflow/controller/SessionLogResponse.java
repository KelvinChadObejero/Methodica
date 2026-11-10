package com.methodica.studyflow.controller;

import com.methodica.studyflow.entity.SessionLog;

public record SessionLogResponse(
    Long logId,
    java.time.Instant loggedAt,
    String sessionId,
    String sessionTitle,
    String sessionSubtitle,
    int comprehension,
    int fatigue,
    String notes
) {
    public static SessionLogResponse from(SessionLog log) {
        return new SessionLogResponse(log.getLogId(), log.getLoggedAt(), log.getSessionId(), log.getSessionTitle(), log.getSessionSubtitle(),
            log.getComprehension(), log.getFatigue(), log.getNotes());
    }
}
