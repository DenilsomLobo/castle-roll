FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY . .
RUN node scripts/build.cjs

FROM node:24-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 RANKING_MODE=online DATA_FILE=/app/data/ranking.json
WORKDIR /app
COPY --from=build /app/dist/ ./
COPY server/index.cjs server/ranking.cjs server/public-files.cjs ./server/
RUN mkdir /app/data && chown node:node /app/data
USER node
EXPOSE 8080
CMD ["node", "server/index.cjs"]
