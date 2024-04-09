FROM ghcr.io/puppeteer/puppeteer:22.6.3

ENV puppeteer_skip_chromium_download true \
puppeteer_executable_path = /usr/bin/google-chrome-stable

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci
COPY . .
CMD ["node", "index.js"]




