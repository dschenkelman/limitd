FROM node:4.4.7

WORKDIR /app
ARG db=/data

# make sure config file is provided. it is mandatory since that is where the buckets are obtained
ARG config
RUN if [ -z "$config" ]; then echo "ERROR: config argument not set"; exit 1; else : ; fi

ENV DB $db

# create db directory
RUN mkdir $db 

# Prep for running with non-root
RUN useradd -ms /bin/bash limitd && \
    # make limitd user an admin of db directory
    chown -R limitd $db

# copy config file
RUN mkdir /app/_config
COPY $config /app/_config/limitd.conf

COPY package.json /app/
RUN npm install --production

COPY . /app/

RUN chown -R limitd /app
USER limitd

ARG port=9231
ARG ringpopPort=9696
ARG hostname=127.0.0.1
ENV RINGPOP_PORT $ringpopPort
ENV PORT $port
ENV HOSTNAME $hostname

# limitd's port
EXPOSE $port
# ringpop's port
EXPOSE $ringpopPort

RUN echo $HOSTNAME

# Don't use npm start to ensure it runs at PID=1
CMD ./bin/limitd-ringpop --hostname $HOSTNAME --ringpop-port $RINGPOP_PORT --db $DB --port $PORT --config-file /app/_config/limitd.conf