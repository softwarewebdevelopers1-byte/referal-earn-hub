FROM eclipse-temurin:21-jdk-jammy AS build

WORKDIR /workspace

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw \
    && ./mvnw -B -DskipTests dependency:go-offline

COPY src/ src/
RUN ./mvnw -B -DskipTests clean package \
    && find target -maxdepth 1 -type f -name '*.jar' \
        ! -name 'original-*.jar' -exec cp {} /workspace/app.jar \;

FROM eclipse-temurin:21-jre-jammy

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --create-home --uid 10001 appuser

WORKDIR /app
COPY --from=build --chown=appuser:appuser /workspace/app.jar /app/app.jar

USER appuser
EXPOSE 8080
ENV SERVER_ADDRESS=0.0.0.0

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
