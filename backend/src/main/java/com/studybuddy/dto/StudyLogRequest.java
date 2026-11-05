package com.studybuddy.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDate;

@Data
public class StudyLogRequest {

    @NotBlank(message = "Subject is required")
    @Size(max = 100, message = "Subject must be at most 100 characters")
    private String subject;

    @NotBlank(message = "Content is required")
    @Size(max = 2000, message = "Content must be at most 2000 characters")
    private String content;

    @Min(value = 1, message = "Duration must be at least 1 minute")
    @Max(value = 600, message = "Duration must be at most 600 minutes")
    private Integer durationMinutes;

    @NotNull(message = "Log date is required")
    @PastOrPresent(message = "Log date cannot be in the future")
    private LocalDate logDate;
}