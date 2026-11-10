package com.methodica.user.controller;

import com.methodica.user.entity.SessionLog;

public record SessionLogResponse(
    String sessionId,
    String sessionTitle,
    String sessionSubtitle,
    int comprehension,
    int fatigue,
    String notes
) {
    public static SessionLogResponse from(SessionLog log) {
        return new SessionLogResponse(log.getSessionId(), log.getSessionTitle(), log.getSessionSubtitle(),
            log.getComprehension(), log.getFatigue(), log.getNotes());
    }
}
