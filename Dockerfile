FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache \
    git \
    bash \
    curl \
    openjdk17-jdk \
    android-tools \
    && rm -rf /var/cache/apk/*

ENV ANDROID_HOME=/opt/android-sdk
ENV PATH=${PATH}:${ANDROID_HOME}/tools:${ANDROID_HOME}/platform-tools

RUN npm install -g @expo/cli

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 8081 19000 19001 19002

CMD ["npm", "start"]