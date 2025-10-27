FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache postgresql-client
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 4000

# Ensure pg, bcrypt, and dotenv are installed in the container
RUN npm install pg bcrypt dotenv

# Use an entrypoint script to handle the migration and startup
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]