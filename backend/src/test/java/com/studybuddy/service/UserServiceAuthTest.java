package com.studybuddy.service;

import com.studybuddy.dto.LoginRequest;
import com.studybuddy.dto.RegisterRequest;
import com.studybuddy.entity.User;
import com.studybuddy.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceAuthTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailService emailService;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserService(userRepository, emailService, passwordEncoder);
    }

    @Test
    void registerNormalizesEmailAndStoresOnlyEncodedPassword() {
        when(userRepository.findByEmail("student@example.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User user = userService.register(new RegisterRequest(" Student ", "STUDENT@example.com", "password123"));

        assertEquals("student@example.com", user.getEmail());
        assertEquals("Student", user.getName());
        assertNotEquals("password123", user.getPassword());
        assertTrue(passwordEncoder.matches("password123", user.getPassword()));
        verify(userRepository).save(any(User.class));
    }

    @Test
    void authenticateChecksTheStoredPasswordHash() {
        User user = User.builder()
                .email("student@example.com")
                .password(passwordEncoder.encode("password123"))
                .build();
        when(userRepository.findByEmail("student@example.com")).thenReturn(Optional.of(user));

        assertSame(user, userService.authenticate(new LoginRequest("STUDENT@example.com", "password123")));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> userService.authenticate(new LoginRequest("student@example.com", "wrong-password"))
        );
        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatusCode());
    }
}
