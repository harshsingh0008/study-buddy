package com.studybuddy.controller;

import com.studybuddy.dto.StudyLogRequest;
import com.studybuddy.dto.StudyLogResponse;
import com.studybuddy.service.StudyLogService;
import com.studybuddy.service.UserService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/study-logs")
public class StudyLogController {

    private final StudyLogService studyLogService;
    private final UserService userService;

    public StudyLogController(StudyLogService studyLogService, UserService userService) {
        this.studyLogService = studyLogService;
        this.userService = userService;
    }

    private Long userId(OAuth2User principal) {
        return userService.getUserId(principal);
    }

    @PostMapping
    public ResponseEntity<StudyLogResponse> create(
            @AuthenticationPrincipal OAuth2User principal,
            @Valid @RequestBody StudyLogRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(studyLogService.create(userId(principal), request));
    }

    @GetMapping
    public ResponseEntity<Page<StudyLogResponse>> list(
            @AuthenticationPrincipal OAuth2User principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String subject) {

        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(studyLogService.list(userId(principal), from, to, subject, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<StudyLogResponse> get(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable Long id) {
        return ResponseEntity.ok(studyLogService.get(userId(principal), id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<StudyLogResponse> update(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable Long id,
            @Valid @RequestBody StudyLogRequest request) {
        return ResponseEntity.ok(studyLogService.update(userId(principal), id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable Long id) {
        studyLogService.delete(userId(principal), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/suggestions")
    public ResponseEntity<StudyLogResponse> regenerate(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable Long id) {
        return ResponseEntity.ok(studyLogService.regenerateSuggestions(userId(principal), id));
    }
}
