package com.methodica.user.repository;

import com.methodica.user.entity.SessionLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionLogRepository extends JpaRepository<SessionLog, String> {}
