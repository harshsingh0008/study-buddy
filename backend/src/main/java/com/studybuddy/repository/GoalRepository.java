package com.studybuddy.repository;

import com.studybuddy.entity.Goal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GoalRepository extends JpaRepository<Goal, Long> {

    Optional<Goal> findByIdAndUserId(Long id, Long userId);

    @Query("""
        SELECT g FROM Goal g
        WHERE g.user.id = :userId
          AND (:type IS NULL OR g.goalType = :type)
          AND (:completed IS NULL OR g.isCompleted = :completed)
        ORDER BY g.targetDate ASC, g.createdAt DESC
    """)
    Page<Goal> searchGoals(
            @Param("userId") Long userId,
            @Param("type") Goal.GoalType type,
            @Param("completed") Boolean completed,
            Pageable pageable
    );

    @Query("SELECT COUNT(g) FROM Goal g WHERE g.user.id = :userId AND g.goalType = :type AND g.isCompleted = true")
    long countCompletedByType(@Param("userId") Long userId, @Param("type") Goal.GoalType type);

    @Query("SELECT COUNT(g) FROM Goal g WHERE g.user.id = :userId AND g.goalType = :type")
    long countByType(@Param("userId") Long userId, @Param("type") Goal.GoalType type);
}