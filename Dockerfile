FROM maven:3.9-eclipse-temurin-25 AS build

WORKDIR /app
COPY backend/pom.xml backend/pom.xml
COPY backend/src backend/src
RUN mvn -f backend/pom.xml --batch-mode --no-transfer-progress clean package -DskipTests

FROM eclipse-temurin:25-jre

WORKDIR /app
COPY --from=build /app/backend/target/studybuddy-0.0.1-SNAPSHOT.jar app.jar

ENTRYPOINT ["sh", "-c", "exec java -XX:+UseContainerSupport -XX:MaxRAMPercentage=70.0 -Dserver.port=${PORT:-8081} -jar app.jar"]
