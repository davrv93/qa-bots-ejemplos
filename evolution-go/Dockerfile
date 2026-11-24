# Evolution Go (API de WhatsApp en Go, sobre whatsmeow) construido desde el fork público
# github.com/davrv93/evolution-go en un commit fijo, más un parche de una línea:
#
#   0001-version-del-handshake-405.patch
#     WhatsApp rechaza con «Client outdated (405)» a los clientes que anuncian una versión
#     vieja. El código ya consulta la versión vigente de WhatsApp Web, pero solo la ponía
#     en DeviceProps; el saludo (handshake) seguía saliendo con la versión fija de la
#     librería. El parche llama a store.SetWAVersion() con la versión consultada, así que
#     no envejece sola. Síntoma sin el parche: el QR se queda en «Preparando…».
#
# Fijar el commit hace que todos construyan exactamente lo mismo. Para actualizar,
# cambia EVOGO_COMMIT y comprueba que el parche siga aplicando.
FROM golang:1.25.0-alpine AS build
RUN apk add --no-cache git build-base libjpeg-turbo-dev libwebp-dev
ARG EVOGO_REPO=https://github.com/davrv93/evolution-go.git
ARG EVOGO_COMMIT=65bd74504c5c2109955933ad6967fb55b125b4a7
WORKDIR /build
RUN git init -q . && git remote add origin "$EVOGO_REPO" \
 && git fetch -q --depth 1 origin "$EVOGO_COMMIT" && git checkout -q FETCH_HEAD
COPY 0001-version-del-handshake-405.patch /tmp/
RUN git apply /tmp/0001-version-del-handshake-405.patch
RUN go mod download
# Sin Swagger, SQLite, MinIO, NATS ni RabbitMQ: esta instalación no los usa.
ARG GO_TAGS="noswagger nosqlite nomsgpack nominio nonats noamqp"
RUN CGO_ENABLED=1 go build -trimpath -tags "${GO_TAGS}" \
    -ldflags "-s -w -X main.version=65bd745-405" -o server ./cmd/evolution-go

FROM alpine:3.19.1
RUN apk add --no-cache tzdata ffmpeg libjpeg-turbo libwebp poppler-utils \
 && adduser -D -u 10001 evogo && mkdir -p /app/logs && chown evogo /app/logs
WORKDIR /app
COPY --from=build /build/server .
COPY --from=build /build/manager/dist ./manager/dist
COPY --from=build /build/VERSION ./VERSION
USER evogo
ENV TZ=America/Lima
ENTRYPOINT ["/app/server"]
