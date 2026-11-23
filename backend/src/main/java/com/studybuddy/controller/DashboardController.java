package com.studybuddy.controller;

import com.studybuddy.dto.DashboardStatsResponse;
import com.studybuddy.service.DashboardService;
import com.studybuddy.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;
    private final UserService userService;

    public DashboardController(DashboardService dashboardService, UserService userService) {
        this.dashboardService = dashboardService;
        this.userService = userService;
    }

    private Long userId(OAuth2User principal) {
        return userService.getUserId(principal);
    }

    @GetMapping("/stats")
    public ResponseEntity<DashboardStatsResponse> getStats(@AuthenticationPrincipal OAuth2User principal) {
        return ResponseEntity.ok(dashboardService.getStats(userId(principal)));
    }
}
