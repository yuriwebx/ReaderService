# BUILD :  docker build -t irls/agent ./
# RUN   :  todo

FROM node:argon
#FROM node:6-slim
MAINTAINER altoros.com
LABEL version="1.0"
LABEL description="This is a sample image of irls agent"

# Create app directory
RUN mkdir -p /irls_agent
WORKDIR /irls_agent

# Bundle app source
COPY . /irls_agent

# replace this with your application's default port
ENV NODE_ENV production
ENV port 3000
EXPOSE 3000

CMD [ "node", "index" ]

