package com.studybuddy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsResponse {

    private int todayMinutes;
    private long todayLogsCount;

    private int weekMinutes;
    private long weekLogsCount;

    private GoalProgress dailyGoals;
    private GoalProgress weeklyGoals;
    private GoalProgress monthlyGoals;

    private List<StudyLogResponse> recentLogs;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GoalProgress {
        private long total;
        private long completed;
    }
}
