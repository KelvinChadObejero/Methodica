package com.methodica.studyflow.controller;

import jakarta.validation.constraints.*;

public record StudyBlockRequest(
    @NotNull @Positive Long flowId,
    @NotNull @Positive Long studyTypeId,
    @NotNull @Min(0) Integer sequenceOrder,
    @NotNull @Min(1) @Max(120) Integer durationMinutes,
    @Size(max = 2000) String customInstruction
) {}
