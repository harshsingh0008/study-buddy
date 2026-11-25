package com.studybuddy.service;

import com.studybuddy.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class JwtService {

    private final JwtEncoder jwtEncoder;
    private final long expirationDays;

    public JwtService(
            JwtEncoder jwtEncoder,
            @Value("${jwt.expiration-days:7}") long expirationDays) {
        if (expirationDays <= 0) {
            throw new IllegalArgumentException("JWT_EXPIRATION_DAYS must be greater than zero");
        }
        this.jwtEncoder = jwtEncoder;
        this.expirationDays = expirationDays;
    }

    public String createToken(User user) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("study-buddy")
                .issuedAt(now)
                .expiresAt(now.plus(expirationDays, ChronoUnit.DAYS))
                .subject(user.getEmail())
                .claim("uid", user.getId())
                .claim("email", user.getEmail())
                .claim("name", user.getName())
                .claim("role", user.getRole())
                .build();

        return jwtEncoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(),
                claims
        )).getTokenValue();
    }
}
