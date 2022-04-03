FROM node:12.22.11-bullseye
ENV NODE_ENV=production
EXPOSE 50080
COPY . /app
WORKDIR "/app/back-end"
#RUN apt-get update && apt-get install autoconf automake libtool zlib1g-dev libbz2-dev wget g++
RUN apt-get update && apt-get install -y gcc-multilib g++
RUN npm install --production
RUN chmod u+x /app/md5-collision-generator/generator/make2collExecs.out
CMD ["npm", "run", "prod_start"]