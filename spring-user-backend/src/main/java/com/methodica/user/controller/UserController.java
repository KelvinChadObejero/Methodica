package com.methodica.user.controller;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import com.methodica.user.entity.User;
import com.methodica.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService service;
    public UserController(UserService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<UserResponse> create(@Valid @RequestBody UserRequest request) {
        validatePassword(request.password(), true);
        User user = service.create(request.name(), request.email(), request.password(), request.role());
        return ResponseEntity.created(URI.create("/api/users/" + user.getUserId())).body(UserResponse.from(user));
    }
    @GetMapping
    public List<UserResponse> findAll() { return service.findAll().stream().map(UserResponse::from).toList(); }
    @GetMapping("/{id}")
    public UserResponse findById(@PathVariable Long id) { return UserResponse.from(service.findById(id)); }
    @PutMapping("/{id}")
    public UserResponse update(@PathVariable Long id, @Valid @RequestBody UserRequest request) {
        validatePassword(request.password(), false);
        return UserResponse.from(service.update(id, request.name(), request.email(), request.password(), request.role()));
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id); return ResponseEntity.noContent().build();
    }
    private void validatePassword(String password, boolean required) {
        if ((required && password == null) || (password != null && (password.isBlank() || password.getBytes(StandardCharsets.UTF_8).length > 72))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required on creation and must be at most 72 UTF-8 bytes");
        }
    }
}
