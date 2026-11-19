package com.studybuddy.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HomeController {

    @GetMapping("/")
    public ResponseEntity<Map<String, Object>> root() {
        return ResponseEntity.ok(Map.of(
                "application", "StudyBuddy AI Backend",
                "status", "UP",
                "version", "0.0.1-SNAPSHOT",
                "documentation", "/swagger-ui/index.html"
        ));
    }
}
