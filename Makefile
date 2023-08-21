service := ntc-psbt
version := 0.0.0
docker_org := pineappleworkshop
docker-image := gcr.io/${docker_org}/${service}:${version}
root := $(abspath $(shell pwd))
port := 3001

init:
	npm ci

dev:
	npx ts-node ./src/server.ts

docker-build:
	docker build -t $(docker-image) .

docker-push:
	docker push $(docker-image)

bumpversion-patch:
	bumpversion patch --allow-dirty

bumpversion-minor:
	bumpversion minor --allow-dirty

bumpversion-major:
	bumpversion major --allow-dirty
