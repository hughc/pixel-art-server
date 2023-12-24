FROM node:21
WORKDIR /app
COPY . .
RUN npm install && yarn && npm prune --production
EXPOSE 80
ENTRYPOINT ["node","server.js"]
CMD ["--port","80"]

