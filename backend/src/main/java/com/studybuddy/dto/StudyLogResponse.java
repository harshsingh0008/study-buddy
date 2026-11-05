package com.studybuddy.dto;

import com.studybuddy.entity.StudyLog;
import lombok.Builder;
import lombok.Data;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Data
@Builder
public class StudyLogResponse {

    private static final ObjectMapper mapper = new ObjectMapper();

    private Long id;
    private String subject;
    private String content;
    private Integer durationMinutes;
    private LocalDate logDate;
    private List<String> aiSuggestions;
    private String aiStatus;
    private LocalDateTime createdAt;

    public static StudyLogResponse from(StudyLog log) {
        List<String> suggestions = Collections.emptyList();
        if (log.getAiSuggestions() != null && !log.getAiSuggestions().isBlank()) {
            try {
                suggestions = mapper.readValue(log.getAiSuggestions(), new TypeReference<List<String>>() {});
            } catch (Exception ignored) {}
        }

        return StudyLogResponse.builder()
                .id(log.getId())
                .subject(log.getSubject())
                .content(log.getContent())
                .durationMinutes(log.getDurationMinutes())
                .logDate(log.getLogDate())
                .aiSuggestions(suggestions)
                .aiStatus(log.getAiStatus())
                .createdAt(log.getCreatedAt())
                .build();
    }
}