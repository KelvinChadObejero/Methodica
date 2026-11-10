package com.methodica.studyflow.repository;

import java.util.List;
import java.util.Optional;
import com.methodica.studyflow.entity.StudySession;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudySessionRepository extends JpaRepository<StudySession, String> {
    boolean existsByFlowId(Long flowId);
    List<StudySession> findAllByUser_UserIdOrderByStartedAtDesc(Long userId);
    Optional<StudySession> findByIdAndUser_UserId(String id, Long userId);
}
