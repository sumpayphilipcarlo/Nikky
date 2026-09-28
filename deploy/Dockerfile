FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache postgresql-client ca-certificates
COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts
COPY . .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node","server/production.js"]
