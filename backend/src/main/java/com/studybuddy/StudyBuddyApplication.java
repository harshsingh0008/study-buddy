package com.studybuddy;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;

@SpringBootApplication
@EnableAsync
public class StudyBuddyApplication {

    public static void main(String[] args) {
        loadDotEnv();
        SpringApplication.run(StudyBuddyApplication.class, args);
    }

    private static void loadDotEnv() {
        File[] candidateLocations = new File[] {
                new File(".env"),
                new File("../.env"),
                new File("backend/.env")
        };

        for (File file : candidateLocations) {
            if (file.exists() && file.isFile()) {
                try (BufferedReader reader = new BufferedReader(new FileReader(file))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        line = line.trim();
                        if (line.isEmpty() || line.startsWith("#")) continue;
                        int eqIdx = line.indexOf('=');
                        if (eqIdx > 0) {
                            String key = line.substring(0, eqIdx).trim();
                            String val = line.substring(eqIdx + 1).trim();
                            if ((val.startsWith("\"") && val.endsWith("\"")) ||
                                (val.startsWith("'") && val.endsWith("'"))) {
                                val = val.substring(1, val.length() - 1);
                            }
                            if (System.getProperty(key) == null && System.getenv(key) == null) {
                                System.setProperty(key, val);
                            }
                        }
                    }
                    System.out.println("✅ Loaded environment variables from: " + file.getAbsolutePath());
                    break;
                } catch (Exception e) {
                    System.err.println("⚠️ Could not read .env file: " + e.getMessage());
                }
            }
        }
    }
}