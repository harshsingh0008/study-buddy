
package com.studybuddy.service;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

// @Service  <-- TEMPORARILY DISABLED so the app can start without email setup
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    // @Async makes this run in the background so login isn't delayed by email sending
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
        } catch (Exception e) {
            // We log the error but don't throw it so login doesn't fail if email fails
            System.err.println("Failed to send welcome email: " + e.getMessage());
        }
    }
}