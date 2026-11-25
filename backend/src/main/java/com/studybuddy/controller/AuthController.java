package com.studybuddy.controller;

import com.studybuddy.dto.AuthResponse;
import com.studybuddy.dto.LoginRequest;
import com.studybuddy.dto.RegisterRequest;
import com.studybuddy.dto.UserResponse;
import com.studybuddy.entity.User;
import com.studybuddy.service.JwtService;
import com.studybuddy.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final UserService userService;
    private final JwtService jwtService;

    public AuthController(UserService userService, JwtService jwtService) {
        this.userService = userService;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        User user = userService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(authResponse(user, "Account created successfully"));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        User user = userService.authenticate(request);
        return ResponseEntity.ok(authResponse(user, "Login successful"));
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(@AuthenticationPrincipal OAuth2User principal) {
        User user = userService.getOrCreateUser(principal);
        return ResponseEntity.ok(UserResponse.from(user));
    }

    private AuthResponse authResponse(User user, String message) {
        return AuthResponse.builder()
                .token(jwtService.createToken(user))
                .user(UserResponse.from(user))
                .message(message)
                .build();
    }
}
