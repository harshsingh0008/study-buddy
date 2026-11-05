package com.studybuddy.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studybuddy.dto.StudyLogRequest;
import com.studybuddy.dto.StudyLogResponse;
import com.studybuddy.entity.StudyLog;
import com.studybuddy.entity.User;
import com.studybuddy.repository.StudyLogRepository;
import com.studybuddy.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StudyLogService {

    private final StudyLogRepository studyLogRepository;
    private final UserRepository userRepository;
    private final AiSuggestionService aiSuggestionService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public StudyLogResponse create(Long userId, StudyLogRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        StudyLog log = StudyLog.builder()
                .user(user)
                .subject(req.getSubject())
                .content(req.getContent())
                .durationMinutes(req.getDurationMinutes())
                .logDate(req.getLogDate())
                .aiStatus("PENDING")
                .build();

        log = studyLogRepository.save(log);

        AiSuggestionService.AiResult result = aiSuggestionService.suggest(req.getContent(), req.getSubject());

        if (result.success()) {
            try {
                log.setAiSuggestions(objectMapper.writeValueAsString(result.suggestions()));
            } catch (Exception e) {
                log.setAiSuggestions("[]");
            }
            log.setAiStatus("SUCCESS");
        } else {
            log.setAiStatus("UNAVAILABLE");
        }

        return StudyLogResponse.from(studyLogRepository.save(log));
    }

    public Page<StudyLogResponse> list(Long userId, LocalDate from, LocalDate to, String subject, Pageable pageable) {
        return studyLogRepository.searchLogs(userId, from, to, subject, pageable).map(StudyLogResponse::from);
    }

    public StudyLogResponse get(Long userId, Long id) {
        StudyLog log = studyLogRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Study log not found"));
        return StudyLogResponse.from(log);
    }

    @Transactional
    public StudyLogResponse update(Long userId, Long id, StudyLogRequest req) {
        StudyLog log = studyLogRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Study log not found"));

        log.setSubject(req.getSubject());
        log.setContent(req.getContent());
        log.setDurationMinutes(req.getDurationMinutes());
        log.setLogDate(req.getLogDate());

        return StudyLogResponse.from(studyLogRepository.save(log));
    }

    @Transactional
    public void delete(Long userId, Long id) {
        StudyLog log = studyLogRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Study log not found"));
        studyLogRepository.delete(log);
    }

    @Transactional
    public StudyLogResponse regenerateSuggestions(Long userId, Long id) {
        StudyLog log = studyLogRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Study log not found"));

        AiSuggestionService.AiResult result = aiSuggestionService.suggest(log.getContent(), log.getSubject());

        if (result.success()) {
            try {
                log.setAiSuggestions(objectMapper.writeValueAsString(result.suggestions()));
            } catch (Exception e) {
                log.setAiSuggestions("[]");
            }
            log.setAiStatus("SUCCESS");
        } else {
            log.setAiStatus("UNAVAILABLE");
        }

        return StudyLogResponse.from(studyLogRepository.save(log));
    }
}