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

    @org.springframework.beans.factory.annotation.Value("${spring.mail.username:}")
    private String fromEmail;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Async
    public void sendWelcomeEmail(String toEmail, String userName) {
        log.info("""
                
                ==========================================================
                📧 [STUDYBUDDY LOGIN EMAIL TRIGGERED]
                To:       {}
                Subject:  Welcome to StudyBuddy AI! 🎓 (Login Notification)
                Greeting: Hello {}!
                From:     {}
                ==========================================================""", 
                toEmail, userName, (fromEmail != null && !fromEmail.isBlank()) ? fromEmail : "NOT CONFIGURED");

        if (fromEmail == null || fromEmail.isBlank()) {
            log.warn("""
                    ⚠️ [DEPLOYMENT CONFIGURATION NOTE]
                    To send live emails to every user upon login:
                    Set MAIL_USERNAME and MAIL_PASSWORD in your environment variables or application.properties.
                    ==========================================================""");
            return;
        }

        try {
            String timeStr = java.time.LocalDateTime.now()
                    .format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"));

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Welcome to StudyBuddy AI! 🎓 (Login Notification)");
            message.setText("Hello " + userName + ",\n\n" +
                    "You have successfully logged in to StudyBuddy AI on " + timeStr + ".\n\n" +
                    "Here is what you can do on your dashboard:\n" +
                    "✨ Track and log your daily study sessions\n" +
                    "🎯 Set and monitor daily, weekly, and monthly topic goals\n" +
                    "🤖 Get personalized study recommendations from AI\n\n" +
                    "Keep up the great work and achieve your study goals!\n\n" +
                    "Best regards,\n" +
                    "StudyBuddy AI Team\n" +
                    "Dream Big, Study Smart! 💙");

            mailSender.send(message);
            log.info("✅ [DELIVERED] Login notification email successfully sent via SMTP to {}", toEmail);
        } catch (Exception e) {
            log.error("❌ Failed to send login email via SMTP to {}: {}", toEmail, e.getMessage());
        }
    }
}
