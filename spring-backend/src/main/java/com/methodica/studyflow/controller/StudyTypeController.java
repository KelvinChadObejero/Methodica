package com.methodica.studyflow.controller;
import java.net.URI; import java.util.List;
import com.methodica.studyflow.entity.StudyType; import com.methodica.studyflow.repository.*;
import jakarta.validation.Valid; import jakarta.validation.constraints.*;
import org.springframework.http.*; import org.springframework.web.bind.annotation.*; import org.springframework.web.server.ResponseStatusException;
@RestController @RequestMapping("/api/studytypes")
public class StudyTypeController {
 private final StudyTypeRepository types; private final StudyBlockRepository blocks;
 public StudyTypeController(StudyTypeRepository t,StudyBlockRepository b){types=t;blocks=b;}
 public record Request(@NotBlank @Size(max=200) String title,@Size(max=2000) String description,@Size(max=2000) String scientificBasis,@NotNull @Min(1) @Max(120) Integer defaultDuration) {}
 private StudyType get(Long id){return types.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Study type not found"));}
 @PostMapping public ResponseEntity<StudyType> create(@Valid @RequestBody Request r){StudyType t=types.save(new StudyType(r.title(),r.description(),r.scientificBasis(),r.defaultDuration()));return ResponseEntity.created(URI.create("/api/studytypes/"+t.getStudyTypeId())).body(t);}
 @GetMapping public List<StudyType> all(){return types.findAll();}
 @GetMapping("/{id}") public StudyType one(@PathVariable Long id){return get(id);}
 @PutMapping("/{id}") public StudyType update(@PathVariable Long id,@Valid @RequestBody Request r){StudyType t=get(id);t.update(r.title(),r.description(),r.scientificBasis(),r.defaultDuration());return types.save(t);}
 @DeleteMapping("/{id}") public ResponseEntity<Void> delete(@PathVariable Long id){StudyType t=get(id);if(blocks.existsByStudyTypeStudyTypeId(id))throw new ResponseStatusException(HttpStatus.CONFLICT,"Study type is used by a block");types.delete(t);return ResponseEntity.noContent().build();}
}
