package com.embarkx.e2eechatapp.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Central WebSocket/STOMP configuration for the chat backend.
 *
 * This class does two main jobs:
 * 1. Exposes the HTTP endpoint that browsers use to establish a websocket or SockJS connection.
 * 2. Defines which message destination prefixes belong to the broker versus the application.
 */
@Configuration // Tells Spring that this class contains configuration settings.
@EnableWebSocketMessageBroker // Turns on Spring's STOMP-based messaging support.
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {

        // Register the handshake endpoint at "/chat".
        // The React client connects here first, then upgrades to websocket or falls
        // back to SockJS transports such as long polling when needed.
        registry.addEndpoint("/chat")

                // Allow the common local frontend origins used during development.
                // 3000 covers older React setups, 5173 is Vite's default, and 8080
                // keeps the current proxy-based development flow working.
                .setAllowedOrigins("http://localhost:3000", "http://localhost:5173", "http://localhost:8080")

                // Enable SockJS so older browsers or blocked websocket environments
                // can still communicate with the backend.
                .withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {

        // Use Spring's simple in-memory broker for destinations that begin with "/topic".
        // These are the destinations clients subscribe to in order to receive broadcasts.
        config.enableSimpleBroker("/topic");

        // Messages sent from the client to backend controller methods must start with "/app".
        // Example: a client publish to "/app/sendMessage/room-123" reaches
        // the controller method annotated with @MessageMapping("/sendMessage/{roomId}").
        config.setApplicationDestinationPrefixes("/app");
    }
}
