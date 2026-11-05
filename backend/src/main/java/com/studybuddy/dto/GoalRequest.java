package com.studybuddy.dto;

import com.studybuddy.entity.Goal;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDate;

@Data
public class GoalRequest {

    @NotNull(message = "Goal type is required")
    private Goal.GoalType goalType;

    @NotBlank(message = "Description is required")
    @Size(max = 500, message = "Description must be at most 500 characters")
    private String description;

    @NotNull(message = "Target date is required")
    @FutureOrPresent(message = "Target date cannot be in the past")
    private LocalDate targetDate;
}