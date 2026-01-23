# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies (more tolerant than `npm ci`)
RUN npm install --omit=dev

# Copy application files
COPY . .

# Expose port
EXPOSE 5000

# Start application
CMD ["node", "index.js"]
