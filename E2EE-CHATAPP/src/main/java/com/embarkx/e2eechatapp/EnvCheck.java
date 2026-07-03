package com.embarkx.e2eechatapp;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class EnvCheck implements CommandLineRunner {

    @Value("${spring.data.mongodb.uri:NOT_FOUND}")
    private String mongoUri;

    @Override
    public void run(String... args) {
        // Print first 30 chars only to avoid logging full credentials
        String preview = mongoUri.length() > 30 ? mongoUri.substring(0, 30) + "..." : mongoUri;
        System.out.println("==> MONGO URI CHECK: " + preview);
    }
}
