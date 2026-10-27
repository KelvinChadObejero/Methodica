package com.methodica.studyflow.controller;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record StudyFlowRequest(
    @NotNull @Positive Long userId,
    @NotBlank @Size(max = 200) String title,
    @Size(max = 2000) String description,
    @NotNull Boolean isPublic
) {}
