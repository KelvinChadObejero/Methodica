package com.methodica.user.controller;

import java.time.Instant;
import com.methodica.user.entity.Role;
import com.methodica.user.entity.User;

public record UserResponse(Long userId, String name, String email, Role role, Instant createdAt) {
    public static UserResponse from(User user) {
        return new UserResponse(user.getUserId(), user.getName(), user.getEmail(), user.getRole(), user.getCreatedAt());
    }
}
