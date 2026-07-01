package com.embarkx.e2eechatapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the Spring Boot backend.
 *
 * Starting this class boots the embedded web server, loads the REST controllers,
 * enables WebSocket/STOMP messaging, and wires the MongoDB repository layer.
 */
@SpringBootApplication
public class E2EeChatappApplication {

    public static void main(String[] args) {
        // Delegate startup to Spring Boot so it can create the application context
        // and start the server with all discovered configuration.
        SpringApplication.run(E2EeChatappApplication.class, args);
    }

}
