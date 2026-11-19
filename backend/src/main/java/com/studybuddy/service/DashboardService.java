package com.studybuddy.service;

import com.studybuddy.dto.DashboardStatsResponse;
import com.studybuddy.dto.StudyLogResponse;
import com.studybuddy.entity.Goal;
import com.studybuddy.repository.GoalRepository;
import com.studybuddy.repository.StudyLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class DashboardService {

    private final StudyLogRepository studyLogRepository;
    private final GoalRepository goalRepository;

    public DashboardService(StudyLogRepository studyLogRepository, GoalRepository goalRepository) {
        this.studyLogRepository = studyLogRepository;
        this.goalRepository = goalRepository;
    }

    @Transactional(readOnly = true)
    public DashboardStatsResponse getStats(Long userId) {
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.minusDays(6);

        int todayMinutes = studyLogRepository.sumMinutesByUserIdAndDate(userId, today);
        long todayLogsCount = studyLogRepository.countByUserIdAndDate(userId, today);

        int weekMinutes = studyLogRepository.sumMinutesBetweenDates(userId, weekStart, today);
        long weekLogsCount = studyLogRepository.countBetweenDates(userId, weekStart, today);

        DashboardStatsResponse.GoalProgress dailyGoals = DashboardStatsResponse.GoalProgress.builder()
                .total(goalRepository.countByType(userId, Goal.GoalType.DAILY))
                .completed(goalRepository.countCompletedByType(userId, Goal.GoalType.DAILY))
                .build();

        DashboardStatsResponse.GoalProgress weeklyGoals = DashboardStatsResponse.GoalProgress.builder()
                .total(goalRepository.countByType(userId, Goal.GoalType.WEEKLY))
                .completed(goalRepository.countCompletedByType(userId, Goal.GoalType.WEEKLY))
                .build();

        DashboardStatsResponse.GoalProgress monthlyGoals = DashboardStatsResponse.GoalProgress.builder()
                .total(goalRepository.countByType(userId, Goal.GoalType.MONTHLY))
                .completed(goalRepository.countCompletedByType(userId, Goal.GoalType.MONTHLY))
                .build();

        List<StudyLogResponse> recentLogs = studyLogRepository.findTop3ByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(StudyLogResponse::from)
                .toList();

        return DashboardStatsResponse.builder()
                .todayMinutes(todayMinutes)
                .todayLogsCount(todayLogsCount)
                .weekMinutes(weekMinutes)
                .weekLogsCount(weekLogsCount)
                .dailyGoals(dailyGoals)
                .weeklyGoals(weeklyGoals)
                .monthlyGoals(monthlyGoals)
                .recentLogs(recentLogs)
                .build();
    }
}
