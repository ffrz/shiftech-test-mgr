.PHONY: run build test lint migrate-up migrate-down migrate-create migrate-force docker-up docker-down

run:
	go run ./cmd/api

build:
	go build -o bin/api ./cmd/api
	go build -o bin/migrate ./cmd/migrate

test:
	go test ./...

test-integration:
	go test ./... -tags=integration

lint:
	go vet ./...
	gofmt -l .

migrate-up:
	go run ./cmd/migrate up

migrate-down:
	go run ./cmd/migrate down $(n)

migrate-create:
	go run ./cmd/migrate create $(name)

migrate-force:
	go run ./cmd/migrate force $(version)

docker-up:
	docker compose up -d

docker-down:
	docker compose down
