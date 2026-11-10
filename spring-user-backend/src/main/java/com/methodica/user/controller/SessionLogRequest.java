package com.methodica.user.controller;

import jakarta.validation.constraints.*;

public record SessionLogRequest(
    @NotNull @Min(1) @Max(5) Integer comprehension,
    @NotNull @Min(1) @Max(5) Integer fatigue,
    @NotNull @Size(max = 5000) String notes
) {}
