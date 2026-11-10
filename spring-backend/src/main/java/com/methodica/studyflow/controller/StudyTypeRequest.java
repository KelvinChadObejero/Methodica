package com.methodica.studyflow.controller;

import jakarta.validation.constraints.*;

public record StudyTypeRequest(
    @NotBlank @Size(max = 200) String title,
    @Size(max = 2000) String description,
    @Size(max = 2000) String scientificBasis,
    @NotNull @Min(1) @Max(120) Integer defaultDuration
) {}
