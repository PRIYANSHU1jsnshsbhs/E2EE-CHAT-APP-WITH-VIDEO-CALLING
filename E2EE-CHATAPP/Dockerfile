FROM eclipse-temurin:21-jdk-alpine AS build
# cache-bust: 1
WORKDIR /app
COPY . .
RUN chmod +x mvnw && ./mvnw package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/E2EE-CHATAPP-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
