package com.studybuddy.service;

import com.studybuddy.entity.User;
import com.studybuddy.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final EmailService emailService;

    public UserService(UserRepository userRepository, EmailService emailService) {
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    @Transactional
    public User getOrCreateUser(OAuth2User principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }

        Object dbUserId = principal.getAttribute("dbUserId");
        if (dbUserId instanceof Number num) {
            Optional<User> existing = userRepository.findById(num.longValue());
            if (existing.isPresent()) {
                return existing.get();
            }
        }

        String googleId = principal.getAttribute("sub");
        String email = principal.getAttribute("email");
        String name = principal.getAttribute("name");
        String picture = principal.getAttribute("picture");

        if (googleId != null) {
            Optional<User> byGoogleId = userRepository.findByGoogleId(googleId);
            if (byGoogleId.isPresent()) {
                return updateIfNeeded(byGoogleId.get(), name, picture);
            }
        }

        if (email != null) {
            Optional<User> byEmail = userRepository.findByEmail(email);
            if (byEmail.isPresent()) {
                User u = byEmail.get();
                if (u.getGoogleId() == null && googleId != null) {
                    u.setGoogleId(googleId);
                }
                return updateIfNeeded(u, name, picture);
            }
        }

        // New user registration
        User newUser = User.builder()
                .googleId(googleId != null ? googleId : (email != null ? email : "google_user"))
                .email(email != null ? email : "user@gmail.com")
                .name(name != null ? name : "Student")
                .pictureUrl(picture)
                .build();

        User saved = userRepository.save(newUser);
        emailService.sendWelcomeEmail(saved.getEmail(), saved.getName());
        return saved;
    }

    private User updateIfNeeded(User user, String name, String picture) {
        boolean changed = false;
        if (name != null && !name.equals(user.getName())) {
            user.setName(name);
            changed = true;
        }
        if (picture != null && !picture.equals(user.getPictureUrl())) {
            user.setPictureUrl(picture);
            changed = true;
        }
        return changed ? userRepository.save(user) : user;
    }

    public Long getUserId(OAuth2User principal) {
        return getOrCreateUser(principal).getId();
    }
}
