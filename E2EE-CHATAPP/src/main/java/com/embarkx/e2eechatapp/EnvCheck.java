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
        // Print the host portion only (safe, no credentials)
        String host = mongoUri.replaceAll("mongodb(\\+srv)?://[^@]+@", "REDACTED@");
        System.out.println("==> MONGO URI CHECK (host visible): " + host);
    }
}
