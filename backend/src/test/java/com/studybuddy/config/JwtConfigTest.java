package com.studybuddy.config;

import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JwtConfigTest {

    private final JwtConfig jwtConfig = new JwtConfig();

    @Test
    void generatesTemporaryKeyWhenSecretIsNotConfigured() {
        SecretKey firstKey = jwtConfig.jwtSigningKey("");
        SecretKey secondKey = jwtConfig.jwtSigningKey("");

        assertEquals(32, firstKey.getEncoded().length);
        assertFalse(Arrays.equals(firstKey.getEncoded(), secondKey.getEncoded()));
    }

    @Test
    void usesConfiguredSecretWhenItMeetsMinimumLength() {
        String secret = "a".repeat(32);

        assertArrayEquals(
                secret.getBytes(StandardCharsets.UTF_8),
                jwtConfig.jwtSigningKey(secret).getEncoded()
        );
    }

    @Test
    void rejectsConfiguredSecretThatIsTooShort() {
        assertThrows(IllegalStateException.class, () -> jwtConfig.jwtSigningKey("short"));
    }
}
