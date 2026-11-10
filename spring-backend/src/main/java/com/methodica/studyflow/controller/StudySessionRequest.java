package com.methodica.studyflow.controller;

import java.time.Instant;
import com.methodica.studyflow.entity.StudySessionStatus;
import jakarta.validation.constraints.*;

public record StudySessionRequest(
    @NotBlank @Pattern(regexp = "[A-Za-z0-9._:-]+") @Size(max = 80) String id,
    @NotNull @Positive Long userId,
    @NotNull @Positive Long flowId,
    @NotBlank @Size(max = 120) String flowTitle,
    @NotBlank @Size(max = 60) String flowTag,
    @NotNull Instant startedAt,
    @NotNull @DecimalMin("0.016666666666666666") @DecimalMax("480") Double durationMinutes,
    @NotNull @DecimalMin("0") @DecimalMax("480") Double focusMinutes,
    @NotBlank @Size(max = 60) String subject,
    @NotNull StudySessionStatus status
) {}
