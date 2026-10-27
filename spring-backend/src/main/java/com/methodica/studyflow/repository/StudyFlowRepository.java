package com.methodica.studyflow.repository;

import com.methodica.studyflow.entity.StudyFlow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StudyFlowRepository extends JpaRepository<StudyFlow, Long> {}
