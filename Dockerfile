FROM node:22-bullseye-slim

# Install Python 3, pip, supervisor and required tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python requirements
COPY python_car_hunter/requirements.txt ./python_car_hunter/requirements.txt
RUN pip3 install --no-cache-dir -r python_car_hunter/requirements.txt

# Install Node dependencies
COPY package*.json ./
RUN npm ci

# Copy full application code
COPY . .

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Supervisor configuration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
