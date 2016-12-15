
# BUILD :  docker build -t irls/server ./
# CREATE:  docker create --volumes-from irls_data -p 9090:3001 --name irls_server  ocean_irls_server
# RUN   :  docker start irls_server

# dev:
# CREATE:  docker create --volumes-from irls_data -p 9090:3001 --name irls_server_dev --env=NODE_ENV=dev ocean_irls_server
# RUN   :  docker start irls_server_dev

# export:  docker save -o "irls.server.tar" irls/server
# import:  docker load < irls.server.tar

FROM node:argon

MAINTAINER altoros.com
LABEL com.altoros.version="1.0"
LABEL com.altoros.description="This is a sample image of irls server"

# Create app directory
# RUN mkdir -p /irls_server

# Bundle app source
COPY . /irls_server

WORKDIR /irls_server

# replace this with your application's default port
ENV NODE_ENV "production"
ENV PORT 3001
EXPOSE 3001
# pay attention to the last dash!
ENV LIBRARY "/irls_data/"

# RUN "node /irls/servenor/init -v"
CMD [ "node", "server/index", "-v" ]

