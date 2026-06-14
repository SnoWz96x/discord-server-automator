FROM node:20-bookworm-slim

WORKDIR /app

COPY discord-bot/package*.json ./discord-bot/
COPY dashboard/package*.json ./dashboard/

RUN npm --prefix discord-bot ci --omit=dev \
  && npm --prefix dashboard ci --omit=dev

COPY . .

ENV DASHBOARD_HOST=0.0.0.0
ENV DASHBOARD_PORT=3000

EXPOSE 3000

CMD ["npm", "run", "start:bot"]
