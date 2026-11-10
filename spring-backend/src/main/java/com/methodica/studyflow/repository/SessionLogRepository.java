package com.methodica.studyflow.repository;

import com.methodica.studyflow.entity.SessionLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionLogRepository extends JpaRepository<SessionLog, Long> {}
