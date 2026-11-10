package com.methodica.user.repository;

import java.util.List;
import java.util.Optional;
import com.methodica.user.entity.StudySession;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudySessionRepository extends JpaRepository<StudySession, String> {
    List<StudySession> findAllByUser_UserIdOrderByStartedAtDesc(Long userId);
    Optional<StudySession> findByIdAndUser_UserId(String id, Long userId);
}
