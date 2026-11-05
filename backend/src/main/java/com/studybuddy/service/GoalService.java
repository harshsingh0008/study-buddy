package com.studybuddy.service;

import com.studybuddy.dto.GoalRequest;
import com.studybuddy.dto.GoalResponse;
import com.studybuddy.entity.Goal;
import com.studybuddy.entity.User;
import com.studybuddy.repository.GoalRepository;
import com.studybuddy.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class GoalService {

    private final GoalRepository goalRepository;
    private final UserRepository userRepository;

    @Transactional
    public GoalResponse create(Long userId, GoalRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Goal goal = Goal.builder()
                .user(user)
                .goalType(req.getGoalType())
                .description(req.getDescription())
                .targetDate(req.getTargetDate())
                .isCompleted(false)
                .build();

        return GoalResponse.from(goalRepository.save(goal));
    }

    public Page<GoalResponse> list(Long userId, Goal.GoalType type, Boolean completed, Pageable pageable) {
        return goalRepository.searchGoals(userId, type, completed, pageable).map(GoalResponse::from);
    }

    public GoalResponse get(Long userId, Long id) {
        Goal goal = goalRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Goal not found"));
        return GoalResponse.from(goal);
    }

    @Transactional
    public GoalResponse update(Long userId, Long id, GoalRequest req) {
        Goal goal = goalRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Goal not found"));

        goal.setGoalType(req.getGoalType());
        goal.setDescription(req.getDescription());
        goal.setTargetDate(req.getTargetDate());

        return GoalResponse.from(goalRepository.save(goal));
    }

    @Transactional
    public GoalResponse setCompletion(Long userId, Long id, boolean completed) {
        Goal goal = goalRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Goal not found"));

        goal.setIsCompleted(completed);
        goal.setCompletedAt(completed ? LocalDateTime.now() : null);

        return GoalResponse.from(goalRepository.save(goal));
    }

    @Transactional
    public void delete(Long userId, Long id) {
        Goal goal = goalRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Goal not found"));
        goalRepository.delete(goal);
    }
}