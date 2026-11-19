package com.studybuddy.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Async
    public void sendWelcomeEmail(String toEmail, String userName) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject("Welcome to StudyBuddy AI! 🎓");
            message.setText("Hello " + userName + ",\n\n" +
                    "Welcome to StudyBuddy! We are thrilled to have you on board.\n\n" +
                    "With StudyBuddy, you can:\n" +
                    "- Log your daily study sessions\n" +
                    "- Set daily, weekly, and monthly goals\n" +
                    "- Get personalized topic suggestions from our AI\n\n" +
                    "Log in today and start learning smarter!\n\n" +
                    "Best regards,\n" +
                    "The StudyBuddy Team");

            mailSender.send(message);
            log.info("Welcome email sent successfully to {}", toEmail);
        } catch (Exception e) {
            log.warn("Failed to send welcome email to {}: {}", toEmail, e.getMessage());
        }
    }
}
