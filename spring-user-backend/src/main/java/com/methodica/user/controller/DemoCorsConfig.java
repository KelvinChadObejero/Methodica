package com.methodica.user.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class DemoCorsConfig implements WebMvcConfigurer {
    @Value("${demo.allowed-origin:http://localhost:5173}") private String allowedOrigin;
    @Override public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/users/**").allowedOrigins(allowedOrigin)
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS").allowPrivateNetwork(true);
    }
}
