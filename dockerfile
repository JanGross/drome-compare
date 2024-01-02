FROM node:21-alpine3.18
ENV NODE_ENV production
WORKDIR /app
COPY --chown=node:node . .
RUN npm ci --only=production
USER node
EXPOSE 8000
CMD ["node", "src/index.js"]