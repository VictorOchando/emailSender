FROM node

# Create app directory
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install


COPY . .

RUN npm rebuild bcrypt --build-from-source



EXPOSE 3010
CMD [ "node", "emailSender.ts" ]

