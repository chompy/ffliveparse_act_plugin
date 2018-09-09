FROM golang:alpine
WORKDIR /app
COPY . /app/
RUN cd /app && \
    apk add --update git && \
    go get github.com/olebedev/emitter && \
    go get github.com/martinlindhe/base36 && \
    go get golang.org/x/net/websocket && \
    go build && \
    apk del git
CMD ["./app"]
