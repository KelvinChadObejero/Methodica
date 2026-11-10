package com.methodica.studyflow.service;

import java.util.List;
import java.util.Locale;
import com.methodica.studyflow.entity.Role;
import com.methodica.studyflow.entity.User;
import com.methodica.studyflow.repository.UserRepository;
import com.methodica.studyflow.repository.StudyFlowRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserService {
    private final UserRepository repository;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final StudyFlowRepository flows;
    public UserService(UserRepository repository, StudyFlowRepository flows) {
        this.repository = repository;
        this.flows = flows;
    }

    public User create(String name, String email, String password, Role role) {
        String normalized = normalize(email);
        ensureEmailAvailable(normalized, null);
        return repository.save(new User(name, normalized, encoder.encode(password), role));
    }
    public List<User> findAll() { return repository.findAll(); }
    public User findById(Long id) {
        return repository.findById(id).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.NOT_FOUND, "User " + id + " was not found"));
    }
    public User update(Long id, String name, String email, String password, Role role) {
        User user = findById(id);
        String normalized = normalize(email);
        ensureEmailAvailable(normalized, id);
        user.setName(name); user.setEmail(normalized); user.setRole(role);
        if (password != null) user.setPasswordHash(encoder.encode(password));
        return repository.save(user);
    }
    public void delete(Long id) {
        User user = findById(id);
        if (flows.existsByUserId(id))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Delete the user's flows before deleting the user");
        repository.delete(user);
    }
    private String normalize(String email) { return email.trim().toLowerCase(Locale.ROOT); }
    private void ensureEmailAvailable(String email, Long currentId) {
        repository.findByEmail(email).filter(user -> !user.getUserId().equals(currentId)).ifPresent(user -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already in use");
        });
    }
}
