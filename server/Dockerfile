FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

# Use PORT env variable (Render default), fallback to 5000
CMD ["node", "index.js"]
