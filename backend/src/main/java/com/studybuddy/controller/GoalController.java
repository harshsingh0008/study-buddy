package com.studybuddy.controller;

import com.studybuddy.dto.GoalCompleteRequest;
import com.studybuddy.dto.GoalRequest;
import com.studybuddy.dto.GoalResponse;
import com.studybuddy.entity.Goal;
import com.studybuddy.service.GoalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/goals")
@RequiredArgsConstructor
public class GoalController {

    private final GoalService goalService;

    private Long userId(OAuth2User principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User is not authenticated");
        }
        Object id = principal.getAttribute("dbUserId");
        if (id instanceof Number number) {
            return number.longValue();
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User ID not found in session");
    }

    @PostMapping
    public ResponseEntity<GoalResponse> create(
            @AuthenticationPrincipal OAuth2User principal,
            @Valid @RequestBody GoalRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(goalService.create(userId(principal), request));
    }

    @GetMapping
    public ResponseEntity<Page<GoalResponse>> list(
            @AuthenticationPrincipal OAuth2User principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) Goal.GoalType type,
            @RequestParam(required = false) Boolean completed) {

        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(goalService.list(userId(principal), type, completed, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<GoalResponse> get(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable Long id) {
        return ResponseEntity.ok(goalService.get(userId(principal), id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GoalResponse> update(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable Long id,
            @Valid @RequestBody GoalRequest request) {
        return ResponseEntity.ok(goalService.update(userId(principal), id, request));
    }

    @PatchMapping("/{id}/complete")
    public ResponseEntity<GoalResponse> complete(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable Long id,
            @Valid @RequestBody GoalCompleteRequest request) {
        return ResponseEntity.ok(goalService.setCompletion(userId(principal), id, request.getIsCompleted()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal OAuth2User principal,
            @PathVariable Long id) {
        goalService.delete(userId(principal), id);
        return ResponseEntity.noContent().build();
    }
}