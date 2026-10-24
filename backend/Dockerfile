FROM maven:3.9.9-eclipse-temurin-21-alpine AS build

WORKDIR /workspace

COPY pom.xml .

COPY src ./src
RUN mvn -B clean package -DskipTests --no-transfer-progress \
    && find target -maxdepth 1 -type f -name '*.jar' \
        ! -name 'original-*.jar' -exec cp {} /workspace/app.jar \;

FROM eclipse-temurin:21-jre-alpine AS runtime

# Removed apk add --no-cache curl to bypass container DNS network issues
RUN addgroup -S app \
    && adduser -S -G app app

WORKDIR /app
COPY --from=build --chown=app:app /workspace/app.jar /app/app.jar

USER app
EXPOSE 8000

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
