package com.studybuddy.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiSuggestionService {

    private static final Logger log = LoggerFactory.getLogger(AiSuggestionService.class);
    private final WebClient aiWebClient;

    public AiResult suggest(String studied, String subject) {
        try {
            AiResponse resp = aiWebClient.post()
                    .uri("/suggest")
                    .bodyValue(Map.of("studied", studied, "subject", subject == null ? "" : subject))
                    .retrieve()
                    .bodyToMono(AiResponse.class)
                    .timeout(Duration.ofSeconds(30))
                    .block();

            if (resp == null || resp.suggestions() == null || resp.suggestions().isEmpty()) {
                return AiResult.failure();
            }
            return AiResult.success(resp.suggestions());
        } catch (Exception e) {
            log.warn("AI service unavailable: {}", e.getMessage());
            return AiResult.failure();
        }
    }

    public record AiResponse(List<String> suggestions, String model, Integer inferenceTimeMs) {}
    public record AiResult(boolean success, List<String> suggestions) {
        public static AiResult success(List<String> s) { return new AiResult(true, s); }
        public static AiResult failure() { return new AiResult(false, List.of()); }
    }
}