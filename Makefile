SRC_FILES := $(wildcard src/*.ts)
DST_FILES := $(SRC_FILES:src/%.ts=dist/%.js)

.PHONY: dev
dev:
	ts-node -T src/main.ts

$(DIST_FILES)&: $(SRC_FILES)
	tsc

.PHONY: build
build: $(DIST_FILES)
	docker compose build

.PHONY: deploy
deploy:
	docker compose up -d

.PHONY: logs
logs:
	docker compose logs -f

.PHONY: all
all: build deploy logs
