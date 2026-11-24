package com.studybuddy.controller;

import com.studybuddy.dto.AiSuggestRequest;
import com.studybuddy.dto.AiSuggestResponse;
import com.studybuddy.dto.TopicInfoRequest;
import com.studybuddy.dto.TopicInfoResponse;
import com.studybuddy.service.AiSuggestionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ai")
public class AiController {

    private final AiSuggestionService aiSuggestionService;

    public AiController(AiSuggestionService aiSuggestionService) {
        this.aiSuggestionService = aiSuggestionService;
    }

    @PostMapping("/suggest")
    public ResponseEntity<AiSuggestResponse> suggest(@RequestBody(required = false) AiSuggestRequest request) {
        String studied = request != null ? request.getStudied() : null;
        String subject = request != null ? request.getSubject() : null;
        AiSuggestionService.AiResult result = aiSuggestionService.suggest(studied, subject);

        return ResponseEntity.ok(AiSuggestResponse.builder()
                .success(result.success())
                .suggestions(result.suggestions())
                .model(result.model())
                .message(result.success() ? "Generated via Google Gemini" : "Generated via StudyBuddy Smart Assistant")
                .build());
    }

    @PostMapping("/topic-info")
    public ResponseEntity<TopicInfoResponse> getTopicInfo(@RequestBody(required = false) TopicInfoRequest request) {
        String topic = request != null ? request.getTopic() : "Key Concepts";
        String subject = request != null ? request.getSubject() : "General";
        AiSuggestionService.TopicInfoResult result = aiSuggestionService.getTopicInfo(topic, subject);

        return ResponseEntity.ok(TopicInfoResponse.builder()
                .success(result.success())
                .topic(result.topic())
                .content(result.content())
                .model(result.model())
                .build());
    }
}
