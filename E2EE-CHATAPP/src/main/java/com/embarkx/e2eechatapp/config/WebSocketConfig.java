package com.embarkx.e2eechatapp.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Central WebSocket/STOMP configuration for the chat backend.
 *
 * Allowed origins are driven by the ALLOWED_ORIGINS environment variable so
 * the same JAR works both locally and in production without recompiling.
 *
 * Local default: localhost:3000, localhost:5173, localhost:8080
 * Production:    set ALLOWED_ORIGINS=https://your-app.vercel.app
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    // Comma-separated list of allowed origins.
    // Defaults to the three common local dev origins so local dev still works
    // without setting any environment variable.
    @Value("${allowed.origins:http://localhost:3000,http://localhost:5173,http://localhost:8080}")
    private String allowedOriginsRaw;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] origins = allowedOriginsRaw.split(",");

        registry.addEndpoint("/chat")
                .setAllowedOrigins(origins)
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }
}
