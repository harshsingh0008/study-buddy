package com.studybuddy.security;

import com.studybuddy.entity.User;
import com.studybuddy.repository.UserRepository;
import com.studybuddy.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private static final Logger log = LoggerFactory.getLogger(CustomOAuth2UserService.class);

    private final UserRepository userRepository;
    private final EmailService emailService;

    public CustomOAuth2UserService(UserRepository userRepository, EmailService emailService) {
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauth2User = super.loadUser(userRequest);

        String googleId = oauth2User.getAttribute("sub");
        String email = oauth2User.getAttribute("email");
        String name = oauth2User.getAttribute("name");
        String pictureUrl = oauth2User.getAttribute("picture");

        if (email == null) {
            throw new OAuth2AuthenticationException("Email not found from OAuth2 provider");
        }

        User user = syncUser(googleId, email, name, pictureUrl);

        // Send welcome email upon successful authentication
        emailService.sendWelcomeEmail(user.getEmail(), user.getName());

        Map<String, Object> attributes = new HashMap<>(oauth2User.getAttributes());
        attributes.put("dbUserId", user.getId());

        String userNameAttributeName = userRequest.getClientRegistration()
                .getProviderDetails()
                .getUserInfoEndpoint()
                .getUserNameAttributeName();

        if (userNameAttributeName == null || userNameAttributeName.isBlank()) {
            userNameAttributeName = "sub";
        }

        return new DefaultOAuth2User(oauth2User.getAuthorities(), attributes, userNameAttributeName);
    }

    private User syncUser(String googleId, String email, String name, String pictureUrl) {
        return userRepository.findByGoogleId(googleId)
                .or(() -> userRepository.findByEmail(email))
                .map(existingUser -> {
                    boolean updated = false;
                    if (existingUser.getGoogleId() == null && googleId != null) {
                        existingUser.setGoogleId(googleId);
                        updated = true;
                    }
                    if (name != null && !name.equals(existingUser.getName())) {
                        existingUser.setName(name);
                        updated = true;
                    }
                    if (pictureUrl != null && !pictureUrl.equals(existingUser.getPictureUrl())) {
                        existingUser.setPictureUrl(pictureUrl);
                        updated = true;
                    }
                    return updated ? userRepository.save(existingUser) : existingUser;
                })
                .orElseGet(() -> {
                    User newUser = User.builder()
                            .googleId(googleId != null ? googleId : email)
                            .email(email)
                            .name(name != null ? name : "User")
                            .pictureUrl(pictureUrl)
                            .build();

                    User saved = userRepository.save(newUser);
                    log.info("New user registered via Google OAuth2: {} (ID: {})", email, saved.getId());
                    return saved;
                });
    }
}
