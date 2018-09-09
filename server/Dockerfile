FROM golang:alpine

COPY . /app/

RUN cd /app && \
    go get github.com/olebedev/emitter && \
    go get github.com/martinlindhe/base36 && \
    go get golang.org/x/net/websocket && \
    go build

CMD ["/app/app"]