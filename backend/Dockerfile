FROM node:20-alpine

WORKDIR /app

# Copy package and lock files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Start application
EXPOSE 3000
CMD ["npm", "start"]
