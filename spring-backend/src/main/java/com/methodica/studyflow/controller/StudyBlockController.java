package com.methodica.studyflow.controller;
import java.net.URI; import java.util.List;
import com.methodica.studyflow.entity.*; import com.methodica.studyflow.repository.*;
import jakarta.validation.Valid; import jakarta.validation.constraints.*;
import org.springframework.http.*; import org.springframework.transaction.annotation.Transactional; import org.springframework.web.bind.annotation.*; import org.springframework.web.server.ResponseStatusException;
@RestController @RequestMapping("/api/blocks") @Transactional
public class StudyBlockController {
 private final StudyBlockRepository blocks; private final StudyFlowRepository flows; private final StudyTypeRepository types;
 public StudyBlockController(StudyBlockRepository b,StudyFlowRepository f,StudyTypeRepository t){blocks=b;flows=f;types=t;}
 public record Request(@NotNull @Positive Long flowId,@NotNull @Positive Long studyTypeId,@NotNull @Min(0) Integer sequenceOrder,@NotNull @Min(1) @Max(120) Integer durationMinutes,@Size(max=2000) String customInstruction) {}
 private StudyBlock get(Long id){return blocks.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Study block not found"));}
 private void apply(StudyBlock b,Request r,Long id){
  StudyFlow f=flows.findById(r.flowId()).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Study flow not found"));
  StudyType t=types.findById(r.studyTypeId()).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Study type not found"));
  if(blocks.existsByFlowFlowIdAndSequenceOrderAndBlockIdNot(r.flowId(),r.sequenceOrder(),id))throw new ResponseStatusException(HttpStatus.CONFLICT,"Position already used in this flow");
  b.update(f,t,r.sequenceOrder(),r.durationMinutes(),r.customInstruction());
 }
 @PostMapping public ResponseEntity<StudyBlock> create(@Valid @RequestBody Request r){StudyBlock b=new StudyBlock();apply(b,r,-1L);blocks.saveAndFlush(b);return ResponseEntity.created(URI.create("/api/blocks/"+b.getBlockId())).body(b);}
 @GetMapping public List<StudyBlock> all(){return blocks.findAll();}
 @GetMapping("/{id}") public StudyBlock one(@PathVariable Long id){return get(id);}
 @PutMapping("/{id}") public StudyBlock update(@PathVariable Long id,@Valid @RequestBody Request r){StudyBlock b=get(id);apply(b,r,id);return blocks.saveAndFlush(b);}
 @DeleteMapping("/{id}") public ResponseEntity<Void> delete(@PathVariable Long id){blocks.delete(get(id));return ResponseEntity.noContent().build();}
}
