package com.studybuddy.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class AiSuggestionService {

    private static final Logger log = LoggerFactory.getLogger(AiSuggestionService.class);

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Value("${gemini.api.model:gemini-1.5-flash}")
    private String geminiModel;

    public AiSuggestionService(WebClient webClient, ObjectMapper objectMapper) {
        this.webClient = webClient;
        this.objectMapper = objectMapper;
    }

    public AiResult suggest(String studied, String subject) {
        String safeTopic = (studied != null && !studied.isBlank()) ? studied.trim() : "General Studies";
        String safeSubject = (subject != null && !subject.isBlank()) ? subject.trim() : "General";

        if (geminiApiKey != null && !geminiApiKey.isBlank()) {
            try {
                AiResult result = callGeminiApi(safeTopic, safeSubject);
                if (result.success() && !result.suggestions().isEmpty()) {
                    return result;
                }
            } catch (Exception e) {
                log.warn("Gemini API call failed: {}. Falling back to rule-based suggestions.", e.getMessage());
            }
        } else {
            log.info("No GEMINI_API_KEY configured. Using intelligent rule-based suggestions.");
        }

        List<String> fallbackList = generateFallbackSuggestions(safeTopic, safeSubject);
        return AiResult.fallback(fallbackList);
    }

    public TopicInfoResult getTopicInfo(String topic, String subject) {
        String safeTopic = (topic != null && !topic.isBlank()) ? topic.trim() : "Key Concepts";
        String safeSubject = (subject != null && !subject.isBlank()) ? subject.trim() : "Science / General";

        if (geminiApiKey != null && !geminiApiKey.isBlank()) {
            try {
                TopicInfoResult result = callGeminiForTopicInfo(safeTopic, safeSubject);
                if (result.success() && result.content() != null && !result.content().isBlank()) {
                    return result;
                }
            } catch (Exception e) {
                log.warn("Gemini API call for topic info failed: {}. Using structured study notes.", e.getMessage());
            }
        }

        String fallbackNotes = generateFallbackTopicInfo(safeTopic, safeSubject);
        return TopicInfoResult.fallback(safeTopic, fallbackNotes);
    }

    private TopicInfoResult callGeminiForTopicInfo(String topic, String subject) {
        String prompt = String.format(
                "You are an expert tutor in StudyBuddy AI. Provide clear, comprehensive, and structured study notes on: \"%s\" (Subject: \"%s\").\n\n" +
                "Structure your response with these exact sections:\n" +
                "### 1. Overview & Definition\n" +
                "Concise and clear explanation of what this topic is.\n\n" +
                "### 2. Key Concepts & Types\n" +
                "Detailed list of core types, classifications, or components.\n\n" +
                "### 3. Important Laws, Formulas & Principles\n" +
                "List the essential rules, governing principles, or mathematical/scientific formulas.\n\n" +
                "### 4. Real-World Applications & Examples\n" +
                "2-3 practical, memorable real-life examples showing how it is used.\n\n" +
                "### 5. Exam Tips & Key Takeaways\n" +
                "Crucial points or common mistakes students should remember for exams.\n\n" +
                "Format with clean Markdown (bold headings, bullet points). Do not wrap the whole output in a code fence.",
                topic, subject
        );

        String modelName = (geminiModel != null && !geminiModel.isBlank()) ? geminiModel.trim() : "gemini-1.5-flash";
        String uri = String.format(
                "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
                modelName, geminiApiKey.trim()
        );

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of(
                                "parts", List.of(
                                        Map.of("text", prompt)
                                )
                        )
                ),
                "generationConfig", Map.of(
                        "temperature", 0.7,
                        "maxOutputTokens", 1200
                )
        );

        String responseBody = webClient.post()
                .uri(uri)
                .header("Content-Type", "application/json")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(15))
                .block();

        if (responseBody != null && !responseBody.isBlank()) {
            try {
                JsonNode root = objectMapper.readTree(responseBody);
                JsonNode candidates = root.path("candidates");
                if (candidates.isArray() && !candidates.isEmpty()) {
                    JsonNode parts = candidates.get(0).path("content").path("parts");
                    if (parts.isArray() && !parts.isEmpty()) {
                        String rawText = parts.get(0).path("text").asText();
                        if (rawText != null && !rawText.isBlank()) {
                            return TopicInfoResult.success(topic, rawText.trim(), modelName);
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to parse Gemini topic info response: {}", e.getMessage());
            }
        }
        return TopicInfoResult.fallback(topic, generateFallbackTopicInfo(topic, subject));
    }

    private AiResult callGeminiApi(String topic, String subject) {
        String prompt = String.format(
                "You are an expert tutor in StudyBuddy AI. The student recently studied: \"%s\" (Subject: \"%s\"). " +
                "Recommend exactly 3 specific, logical next topics or practice areas for them to study next to master this subject. " +
                "Return ONLY a valid JSON object in this format: " +
                "{\"suggestions\": [\"Topic 1\", \"Topic 2\", \"Topic 3\"]} " +
                "Do not add any markdown formatting, backticks, or other text outside the JSON.",
                topic, subject
        );

        String modelName = (geminiModel != null && !geminiModel.isBlank()) ? geminiModel.trim() : "gemini-1.5-flash";
        String uri = String.format(
                "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
                modelName, geminiApiKey.trim()
        );

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of(
                                "parts", List.of(
                                        Map.of("text", prompt)
                                )
                        )
                ),
                "generationConfig", Map.of(
                        "temperature", 0.7,
                        "maxOutputTokens", 500
                )
        );

        String responseBody = webClient.post()
                .uri(uri)
                .header("Content-Type", "application/json")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(12))
                .block();

        if (responseBody == null || responseBody.isBlank()) {
            return AiResult.failure();
        }

        List<String> suggestions = parseGeminiResponse(responseBody);
        if (!suggestions.isEmpty()) {
            log.info("✅ Generated {} suggestions from Google Gemini ({}) for topic: '{}'",
                    suggestions.size(), modelName, topic);
            return AiResult.success(suggestions, modelName);
        }

        return AiResult.failure();
    }

    private List<String> parseGeminiResponse(String responseJson) {
        try {
            JsonNode root = objectMapper.readTree(responseJson);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode parts = candidates.get(0).path("content").path("parts");
                if (parts.isArray() && !parts.isEmpty()) {
                    String rawText = parts.get(0).path("text").asText();
                    return extractSuggestionsFromText(rawText);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to parse Gemini response: {}", e.getMessage());
        }
        return List.of();
    }

    private List<String> extractSuggestionsFromText(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }

        String cleaned = text.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        cleaned = cleaned.trim();

        // 1. Try parsing as JSON { "suggestions": [...] }
        try {
            JsonNode node = objectMapper.readTree(cleaned);
            if (node.isObject() && node.has("suggestions")) {
                List<String> list = new ArrayList<>();
                for (JsonNode item : node.get("suggestions")) {
                    String val = item.asText().trim();
                    if (!val.isBlank()) list.add(val);
                }
                if (!list.isEmpty()) return list;
            } else if (node.isArray()) {
                List<String> list = new ArrayList<>();
                for (JsonNode item : node) {
                    String val = item.asText().trim();
                    if (!val.isBlank()) list.add(val);
                }
                if (!list.isEmpty()) return list;
            }
        } catch (Exception ignored) {
        }

        // 2. Line-by-line fallback if Gemini formatted as a bulleted/numbered list
        List<String> list = new ArrayList<>();
        String[] lines = cleaned.split("\\r?\\n");
        for (String line : lines) {
            String trimmed = line.trim();
            String item = trimmed.replaceFirst("^[0-9]+[.\\)]\\s*", "").replaceFirst("^[-*•]\\s*", "").trim();
            if (!item.isBlank() && item.length() > 3 && !item.startsWith("{") && !item.startsWith("}")) {
                list.add(item);
            }
        }
        return list;
    }

    private List<String> generateFallbackSuggestions(String studied, String subject) {
        String topic = (studied != null && !studied.isBlank()) ? studied : (subject != null ? subject : "General Studies");
        String tLower = topic.toLowerCase();
        if (tLower.contains("fraction") || tLower.contains("math") || tLower.contains("algebra") || tLower.contains("calc")) {
            return List.of(
                    "Advanced " + topic + ": Problem Solving & Practice",
                    "Geometry: Shapes, Angles and Proofs",
                    "Linear Equations and Word Problems"
            );
        } else if (tLower.contains("bio") || tLower.contains("chem") || tLower.contains("phys") || tLower.contains("sci")) {
            return List.of(
                    "Core Principles and Mechanisms of " + topic,
                    "Energy Transformations and Lab Applications",
                    "Scientific Inquiry: Formulating Hypotheses"
            );
        } else if (tLower.contains("hist") || tLower.contains("geo") || tLower.contains("social")) {
            return List.of(
                    "Key Historical Milestones of " + topic,
                    "Global Impact and Cause-and-Effect Analysis",
                    "Comparative Timeline Studies"
            );
        } else if (tLower.contains("prog") || tLower.contains("code") || tLower.contains("java") || tLower.contains("python")) {
            return List.of(
                    "Data Structures & Algorithms in " + topic,
                    "Building a Mini Project using " + topic,
                    "Debugging, Testing & Clean Code Practices"
            );
        } else {
            return List.of(
                    "Mastering the Fundamentals of " + topic,
                    "Practical Applications of " + topic + " in Real Life",
                    "Exam Revision & Key Concepts in " + topic
            );
        }
    }

    private String generateFallbackTopicInfo(String topic, String subject) {
        String tLower = topic.toLowerCase();
        if (tLower.contains("friction")) {
            return """
### 1. Overview & Definition
**Friction** is a contact force that resists the relative motion or tendency of motion between two surfaces touching each other. It arises primarily from microscopic surface roughness (interlocking asperities) and molecular adhesion at the contact points.

### 2. Key Concepts & Types of Friction
There are four primary types:
1. **Static Friction ($f_s$):** Acts when an object is at rest on a surface and prevents it from starting to move. It is self-adjusting up to a maximum threshold ($0 \\le f_s \\le f_L$).
2. **Limiting Friction ($f_L$):** The maximum value of static friction, occurring just before motion begins ($f_L = \\mu_s N$).
3. **Sliding (Kinetic) Friction ($f_k$):** The resistive force acting when one surface actively slides over another ($f_k = \\mu_k N$). It is generally constant and slightly less than limiting friction.
4. **Rolling Friction ($f_r$):** Occurs when a wheel, sphere, or cylinder rolls across a surface. It is significantly smaller than sliding friction due to reduced contact deformation.

### 3. Important Laws of Friction
- **Opposite Direction:** Friction always acts tangential to the surface and opposite to the direction of relative motion (or impending motion).
- **Surface Nature:** Friction depends strictly on the roughness and materials of the contacting surfaces.
- **Area Independence:** Friction is approximately independent of the apparent contact area for dry, rigid surfaces.
- **Normal Reaction Proportionality:** Maximum friction force is directly proportional to the normal reaction force: $f = \\mu N$.
- **Magnitude Hierarchy:** Limiting Friction > Sliding Friction >> Rolling Friction ($f_L > f_k \\gg f_r$).

### 4. Real-World Applications & Examples
- **Walking & Traction:** Footwear soles and vehicle tires rely on friction with the ground to push forward without slipping.
- **Vehicle Braking:** Braking systems press brake pads against rotating rotors, converting kinetic energy into heat via kinetic friction.
- **Fasteners & Knots:** Screws, nails in walls, and tied rope knots hold securely exclusively because of friction.

### 5. Exam Tip & Key Takeaway
> **Pro Tip:** Remember that static friction is **self-adjusting**! If an applied horizontal force is 5 N and the limiting friction is 20 N, the static friction acting on the object is exactly **5 N** (not 20 N), keeping the object at rest!
""";
        } else if (tLower.contains("fraction") || tLower.contains("math") || tLower.contains("algebra") || tLower.contains("calc")) {
            return String.format("""
### 1. Overview & Definition
**%s** is a core mathematical concept focused on relational thinking, operational rules, and systematic problem solving.

### 2. Key Concepts & Classifications
- **Foundational Definitions:** Clear terminology, representation forms, and boundary conditions.
- **Algebraic & Arithmetic Operations:** Standard manipulation rules, balancing equations, and variable isolation.
- **Visual & Graphic Representation:** Linking algebraic expressions with coordinates and geometric models.

### 3. Important Laws & Formulas
- **Order of Operations:** Strict adherence to PEMDAS/BODMAS.
- **Conservation of Equality:** Applying identical transformations to both sides preserves validity.
- **Simplification Rules:** Factoring, cancelling common terms, and reducing to simplest radical/fraction form.

### 4. Real-World Applications
- **Science & Physics:** Calculating trajectories, velocity curves, structural load limits, and rate of change.
- **Finance & Computing:** Algorithmic complexity, compound growth rates, and statistical modeling.

### 5. Exam Tip
> **Pro Tip:** Always double-check sign changes when distributing negative signs and test with zero or simple values to verify your answers!
""", topic);
        } else {
            return String.format("""
### 1. Overview & Definition
**%s** is an important topic in %s. Gaining a deep understanding of its mechanisms enables you to tackle both theoretical questions and practical problem sets effectively.

### 2. Key Concepts & Classifications
- **Core Principles:** Foundational vocabulary, definitions, and components.
- **System Structure:** How different elements of %s interact with each other.
- **Categories:** The primary types, states, or variants of this concept.

### 3. Important Laws & Core Rules
- **Governing Laws:** Fundamental principles governing behavior and reactions.
- **Cause & Effect:** How changing one variable impacts the entire system.
- **Standard Conventions:** Formal notations and rules used across academic syllabi.

### 4. Real-World Applications
- **Practical Use Cases:** Where engineers, scientists, and researchers apply this in industry.
- **Everyday Observation:** Real phenomena you encounter that are governed by this topic.

### 5. Exam Tip
> **Pro Tip:** Focus on explaining *why* the phenomenon occurs rather than just memorizing definitions—examiners award top marks for conceptual causality!
""", topic, subject);
        }
    }

    public record TopicInfoResult(boolean success, String topic, String content, String model) {
        public static TopicInfoResult success(String topic, String content, String model) {
            return new TopicInfoResult(true, topic, content, model);
        }
        public static TopicInfoResult fallback(String topic, String content) {
            return new TopicInfoResult(false, topic, content, "smart-assistant");
        }
    }

    public record AiResult(boolean success, List<String> suggestions, String model) {
        public static AiResult success(List<String> s, String model) {
            return new AiResult(true, s, model);
        }
        public static AiResult fallback(List<String> s) {
            return new AiResult(false, s, "rule-based-fallback");
        }
        public static AiResult failure() {
            return new AiResult(false, List.of(), "none");
        }
    }
}
