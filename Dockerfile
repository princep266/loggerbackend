# 1️⃣ Base image
FROM node:18-alpine

# 2️⃣ Working directory inside container
WORKDIR /app

# 3️⃣ Copy dependency files first (for caching)
COPY package*.json ./

# 4️⃣ Install dependencies
RUN npm install --production

# 5️⃣ Copy source code
COPY . .

# 6️⃣ Expose port
EXPOSE 3000

# 7️⃣ Start the server
CMD ["npm", "start"]
