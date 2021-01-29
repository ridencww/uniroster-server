FROM node:14.10.1-alpine3.11
ENV NEW_RELIC_NO_CONFIG_FILE=true
WORKDIR /uniroster-server
COPY . .
EXPOSE 80
CMD ["npm", "start"]