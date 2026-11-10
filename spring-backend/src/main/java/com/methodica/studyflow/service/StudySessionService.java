package com.methodica.studyflow.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import com.methodica.studyflow.controller.StudySessionRequest;
import com.methodica.studyflow.entity.SessionLog;
import com.methodica.studyflow.entity.StudySession;
import com.methodica.studyflow.entity.User;
import com.methodica.studyflow.repository.SessionLogRepository;
import com.methodica.studyflow.repository.StudySessionRepository;
import com.methodica.studyflow.repository.UserRepository;
import com.methodica.studyflow.repository.StudyFlowRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class StudySessionService {
    public record Creation(StudySession session, boolean created) {}

    private final StudySessionRepository sessions;
    private final SessionLogRepository logs;
    private final UserRepository users;
    private final StudyFlowRepository flows;

    public StudySessionService(StudySessionRepository sessions, SessionLogRepository logs, UserRepository users,
                               StudyFlowRepository flows) {
        this.sessions = sessions;
        this.logs = logs;
        this.users = users;
        this.flows = flows;
    }

    @Transactional
    public Creation create(StudySessionRequest request) {
        Instant startedAt = request.startedAt().truncatedTo(ChronoUnit.MILLIS);
        validateElapsedTime(startedAt, request.durationMinutes());
        if (request.focusMinutes() > request.durationMinutes())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Focus time cannot exceed session duration");
        var existing = sessions.findById(request.id());
        if (existing.isPresent()) {
            StudySession session = existing.get();
            if (!matches(session, request, startedAt))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Session ID already belongs to another session");
            return new Creation(session, false);
        }
        User user = users.findById(request.userId()).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "User " + request.userId() + " was not found"));
        requireOwnedFlow(request.flowId(), request.userId());
        StudySession session = sessions.save(new StudySession(request.id(), user, request.flowId(), request.flowTitle(),
            request.flowTag(), startedAt, request.durationMinutes(), request.focusMinutes(),
            request.subject(), request.status()));
        return new Creation(session, true);
    }

    @Transactional(readOnly = true)
    public List<StudySession> findAll(Long userId) {
        requireUser(userId);
        return sessions.findAllByUser_UserIdOrderByStartedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public StudySession findById(String id, Long userId) {
        return sessions.findByIdAndUser_UserId(id, userId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Study session " + id + " was not found"));
    }

    @Transactional
    public void delete(String id, Long userId) { sessions.delete(findById(id, userId)); }

    @Transactional
    public StudySession update(String id, Long userId, StudySessionRequest request) {
        StudySession session = findById(id, userId);
        if (!id.equals(request.id()) || !userId.equals(request.userId()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Session ID and owner cannot be changed");
        Instant startedAt = request.startedAt().truncatedTo(ChronoUnit.MILLIS);
        validateElapsedTime(startedAt, request.durationMinutes());
        if (request.focusMinutes() > request.durationMinutes())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Focus time cannot exceed session duration");
        requireOwnedFlow(request.flowId(), userId);
        session.update(request.flowId(), request.flowTitle(), request.flowTag(), startedAt,
            request.durationMinutes(), request.focusMinutes(), request.subject(), request.status());
        return session;
    }

    @Transactional
    public SessionLog createLog(String id, Long userId, int comprehension, int fatigue, String notes) {
        if (findById(id, userId).getLog() != null)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Session already has a reflection log");
        return saveLog(id, userId, comprehension, fatigue, notes);
    }

    @Transactional
    public SessionLog saveLog(String id, Long userId, int comprehension, int fatigue, String notes) {
        StudySession session = findById(id, userId);
        SessionLog log = session.getLog();
        if (log == null) log = new SessionLog(session, comprehension, fatigue, notes.trim());
        else log.update(comprehension, fatigue, notes.trim());
        session.setLog(log);
        return logs.save(log);
    }

    @Transactional(readOnly = true)
    public SessionLog findLog(String id, Long userId) {
        StudySession session = findById(id, userId);
        if (session.getLog() == null)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Session log was not found");
        return session.getLog();
    }

    @Transactional
    public void deleteLog(String id, Long userId) {
        StudySession session = findById(id, userId);
        if (session.getLog() == null)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Session log was not found");
        // Orphan removal deletes the row and clears the parent in the same transaction.
        session.setLog(null);
    }

    private void requireUser(Long userId) {
        if (!users.existsById(userId))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User " + userId + " was not found");
    }

    private void requireOwnedFlow(Long flowId, Long userId) {
        var flow = flows.findById(flowId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "Study flow " + flowId + " was not found"));
        if (!flow.getUserId().equals(userId))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Session and flow must belong to the same user");
    }

    private void validateElapsedTime(Instant startedAt, double durationMinutes) {
        Instant now = Instant.now();
        if (startedAt.isAfter(now.plusSeconds(5)))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start time must be a valid past date");
        if (durationMinutes * 60 > now.getEpochSecond() - startedAt.getEpochSecond() + 5)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Duration exceeds elapsed time");
    }

    private boolean matches(StudySession session, StudySessionRequest request, Instant startedAt) {
        return session.getUserId().equals(request.userId()) &&
            session.getFlowId().equals(request.flowId()) &&
            session.getFlowTitle().equals(request.flowTitle()) &&
            session.getFlowTag().equals(request.flowTag()) &&
            session.getStartedAt().equals(startedAt) &&
            session.getDurationMinutes() == request.durationMinutes() &&
            session.getFocusMinutes() == request.focusMinutes() &&
            session.getSubject().equals(request.subject()) &&
            session.getStatus() == request.status();
    }
}
