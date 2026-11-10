package com.methodica.studyflow.repository;
import com.methodica.studyflow.entity.StudyBlock;
import org.springframework.data.jpa.repository.JpaRepository;
public interface StudyBlockRepository extends JpaRepository<StudyBlock,Long> {
 boolean existsByFlowFlowId(Long id); boolean existsByStudyTypeStudyTypeId(Long id);
 boolean existsByFlowFlowIdAndSequenceOrderAndBlockIdNot(Long flowId,int position,Long id);
}
