package com.studybuddy.dto;

import com.studybuddy.entity.Goal;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class GoalResponse {

    private Long id;
    private Goal.GoalType goalType;
    private String description;
    private LocalDate targetDate;
    private Boolean isCompleted;
    private LocalDateTime completedAt;
    private LocalDateTime createdAt;

    public static GoalResponse from(Goal goal) {
        return GoalResponse.builder()
                .id(goal.getId())
                .goalType(goal.getGoalType())
                .description(goal.getDescription())
                .targetDate(goal.getTargetDate())
                .isCompleted(goal.getIsCompleted())
                .completedAt(goal.getCompletedAt())
                .createdAt(goal.getCreatedAt())
                .build();
    }
}