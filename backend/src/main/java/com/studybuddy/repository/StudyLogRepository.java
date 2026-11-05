package com.studybuddy.repository;

import com.studybuddy.entity.StudyLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface StudyLogRepository extends JpaRepository<StudyLog, Long> {

    Page<StudyLog> findByUserIdOrderByLogDateDesc(Long userId, Pageable pageable);

    Optional<StudyLog> findByIdAndUserId(Long id, Long userId);

    @Query("""
        SELECT s FROM StudyLog s
        WHERE s.user.id = :userId
          AND (:fromDate IS NULL OR s.logDate >= :fromDate)
          AND (:toDate IS NULL OR s.logDate <= :toDate)
          AND (:subject IS NULL OR LOWER(s.subject) LIKE LOWER(CONCAT('%', :subject, '%')))
        ORDER BY s.logDate DESC, s.createdAt DESC
    """)
    Page<StudyLog> searchLogs(
            @Param("userId") Long userId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("subject") String subject,
            Pageable pageable
    );

    @Query("SELECT COUNT(s) FROM StudyLog s WHERE s.user.id = :userId AND s.logDate = :date")
    long countByUserIdAndDate(@Param("userId") Long userId, @Param("date") LocalDate date);

    @Query("SELECT COALESCE(SUM(s.durationMinutes), 0) FROM StudyLog s WHERE s.user.id = :userId AND s.logDate = :date")
    int sumMinutesByUserIdAndDate(@Param("userId") Long userId, @Param("date") LocalDate date);

    @Query("SELECT COUNT(s) FROM StudyLog s WHERE s.user.id = :userId AND s.logDate BETWEEN :fromDate AND :toDate")
    long countBetweenDates(@Param("userId") Long userId, @Param("fromDate") LocalDate fromDate, @Param("toDate") LocalDate toDate);

    @Query("SELECT COALESCE(SUM(s.durationMinutes), 0) FROM StudyLog s WHERE s.user.id = :userId AND s.logDate BETWEEN :fromDate AND :toDate")
    int sumMinutesBetweenDates(@Param("userId") Long userId, @Param("fromDate") LocalDate fromDate, @Param("toDate") LocalDate toDate);

    List<StudyLog> findTop3ByUserIdOrderByCreatedAtDesc(Long userId);
}