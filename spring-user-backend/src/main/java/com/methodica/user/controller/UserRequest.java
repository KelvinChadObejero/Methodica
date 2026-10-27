package com.methodica.user.controller;

import com.methodica.user.entity.Role;
import jakarta.validation.constraints.*;

public record UserRequest(
    @NotBlank @Size(max = 100) String name,
    @NotBlank @Email @Size(max = 254) String email,
    @Size(min = 8, max = 72) String password,
    @NotNull Role role
) {}
