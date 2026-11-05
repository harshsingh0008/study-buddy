package com.studybuddy.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GoalCompleteRequest {

    @NotNull(message = "isCompleted is required")
    private Boolean isCompleted;
}