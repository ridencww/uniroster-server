.PHONY: clean image-clean build push test register-qa runtask version check-version docker-login put-environments scheduletasks

QA_PROFILE := qa
PROD_PROFILE := prod

MODULE := oneimporter

QA_CLUSTER := utility
PROD_CLUSTER := blue

# Where to push the docker image.
QA_REGISTRY ?= 732004662672.dkr.ecr.us-east-1.amazonaws.com/roster
PROD_REGISTRY ?= 560112230788.dkr.ecr.us-east-1.amazonaws.com/roster

QA_IMAGE := $(QA_REGISTRY)/$(MODULE)
PROD_IMAGE := $(PROD_REGISTRY)/$(MODULE)

# This version-strategy uses git tags to set the version string
TAG := $(shell git describe --tags --always --dirty)

BLUE=\033[0;34m
NC=\033[0m # No Color

all_schools.csv:
	@echo "Export all_schools.csv from Splunk at the following URL and save it to the current working directory: https://splunk.carnegielearning.com/en-US/app/search/report?s=%2FservicesNS%2Fnobody%2Fsearch%2Fsaved%2Fsearches%2Fget_all_schools&sid=_bWdsb3ZlckBjYXJuZWdpZWxlYXJuaW5nLmNvbQ_bWdsb3ZlckBjYXJuZWdpZWxlYXJuaW5nLmNvbQ__search__RMD5deab73271702bdea_at_1604934806_12191&display.page.search.mode=fast&dispatch.sample_ratio=1&earliest=%40d&latest=now"
	exit 1


# Example: make build VERSION=1.0.0
build: all_schools.csv check-version oneimporter.prod.json oneimporter.qa.json
	@echo "\n${BLUE}Building Production image with labels:\n"
	@echo "name: $(MODULE)"
	@echo "version: $(VERSION)${NC}\n"
	@echo $(VERSION) > VERSION
	@sed                                     \
	    -e 's|{NAME}|$(MODULE)|g'            \
	    -e 's|{VERSION}|$(VERSION)|g'        \
	    prod.Dockerfile | docker build -t $(MODULE):$(VERSION) -f- .
	

build-dev:
	@echo "${BLUE}Building Development image with labels:"
	@echo "name: $(MODULE)"
	@echo "version: $(TAG)${NC}\n"
	@sed                                 \
	    -e 's|{NAME}|$(MODULE)|g'        \
	    -e 's|{VERSION}|$(TAG)|g'        \
	    dev.Dockerfile | docker build -t $(MODULE):$(TAG) -f- .
	@docker tag $(MODULE):$(TAG) $(MODULE):latest

# Example: make shell CMD="-c 'date > datefile'"
shell: build-dev
	@echo "\n${BLUE}Launching a shell in the containerized build environment...${NC}\n"
		@docker run --name $(MODULE)                                \
			-ti                                                     \
			--rm                                                    \
			--entrypoint /bin/bash                                  \
			-u $$(id -u):$$(id -g)                                  \
			$(MODULE):$(TAG)										    \
			$(CMD)

# Example: make push-prod VERSION=0.0.2
push-qa: build check-version
	@echo "\n${BLUE}Pushing image $(QA_IMAGE):$(VERSION) to GitHub Docker Registry...${NC}\n"
	@aws --profile qa ecr get-login-password | docker login --username AWS --password-stdin 732004662672.dkr.ecr.us-east-1.amazonaws.com
	@docker tag $(MODULE):$(VERSION) $(QA_IMAGE):$(VERSION)
	@docker tag $(MODULE):$(VERSION) $(QA_IMAGE):latest
	@docker push $(QA_IMAGE):$(VERSION)
	@docker push $(QA_IMAGE):latest

# Example: make push-prod VERSION=0.0.2
push-prod: build check-version
	@echo "\n${BLUE}Pushing image $(PROD_IMAGE):$(VERSION) to GitHub Docker Registry...${NC}\n"
	@aws --profile $(PROD_PROFILE) ecr get-login-password | docker login --username AWS --password-stdin 560112230788.dkr.ecr.us-east-1.amazonaws.com
	@docker tag $(MODULE):$(VERSION) $(PROD_IMAGE):$(VERSION)
	@docker tag $(MODULE):$(VERSION) $(PROD_IMAGE):latest
	@docker push $(PROD_IMAGE):$(VERSION)
	@docker push $(PROD_IMAGE):latest

version:
	@echo $(TAG)

check-version:
ifndef VERSION
	$(error command line env VERSION= is undefined)
endif

docker-login:
	aws --profile $(PROFILE) ecr get-login-password | docker login --username AWS --password-stdin 732004662672.dkr.ecr.us-east-1.amazonaws.com

oneimporter.prod.yml: check-version
	@sed 's/env_file: .env/env_file: prod.env/' docker-compose.yml \
	| sed 's/splunk-index: qa_migration/splunk-index: cl_migration/' \
	| sed 's/732004662672/560112230788/' > dc.tmp.yml
	@echo building yaml for $(MODULE):$(VERSION)
	docker-compose -f dc.tmp.yml config > oneimporter.prod.yml
	sed -i "" "s/$(MODULE):latest/$(MODULE):$(VERSION)/" oneimporter.prod.yml

#Example: make oneimporter.qa.yml (optionally) VERSION=1.0.0
oneimporter.qa.yml:
	@sed "s/env_file: .env/env_file: qa.env/" docker-compose.yml > dc.tmp.yml
ifeq ($(VERSION),)
	@echo building yaml for $(MODULE):latest
	docker-compose -f dc.tmp.yml config > oneimporter.qa.yml
else
	@echo building yaml for $(MODULE):$(VERSION)
	docker-compose -f dc.tmp.yml config > oneimporter.qa.yml
	sed -i "" "s/$(MODULE):latest/$(MODULE):$(VERSION)/" oneimporter.qa.yml
endif

oneimporter.qa.json: oneimporter.qa.yml
	@aws --profile $(QA_PROFILE) ecr get-login-password | docker login --username AWS --password-stdin 732004662672.dkr.ecr.us-east-1.amazonaws.com
	docker run --rm -i 732004662672.dkr.ecr.us-east-1.amazonaws.com/utils/container-transform -i compose -o ecs < oneimporter.qa.yml > oneimporter.qa.json

oneimporter.prod.json: oneimporter.prod.yml
	@aws --profile $(PROD_PROFILE) ecr get-login-password | docker login --username AWS --password-stdin 732004662672.dkr.ecr.us-east-1.amazonaws.com
	docker run --rm -i 732004662672.dkr.ecr.us-east-1.amazonaws.com/utils/container-transform -i compose -o ecs < oneimporter.prod.yml > oneimporter.prod.json

register-qa: oneimporter.qa.json check-version
	aws --profile $(QA_PROFILE) ecs register-task-definition --family oneimporter --cli-input-json file://oneimporter.qa.json > oneimporter.qa.ecs.json
	@jq -r '.taskDefinition.taskDefinitionArn' oneimporter.qa.ecs.json

register-prod: oneimporter.prod.json check-version
	aws --profile $(PROD_PROFILE) ecs register-task-definition --family oneimporter --cli-input-json file://oneimporter.prod.json > oneimporter.prod.ecs.json

runtask-qa:
	aws --profile $(QA_PROFILE) ecs run-task --task-definition oneimporter --cluster $(QA_CLUSTER) > task.json
	@echo "https://console.aws.amazon.com/ecs/home?region=us-east-1#/clusters/$(QA_CLUSTER)/tasks/$(shell jq -r '.tasks[0].taskArn' task.json | sed 's/.*\///g')/details"

runtask-prod:
	aws --profile $(PROD_PROFILE) ecs run-task --task-definition oneimporter --cluster $(PROD_CLUSTER) > task.json
	@echo "https://console.aws.amazon.com/ecs/home?region=us-east-1#/clusters/$(PROD_CLUSTER)/tasks/$(shell jq -r '.tasks[0].taskArn' task.json | sed 's/.*\///g')/details"

put-environments:
	vault kv put secret/internal/apps/uniroster/envs/qa ".env"=@qa.env
	vault kv put secret/internal/apps/uniroster/envs/prod ".env"=@prod.env

get-environments: qa.env prod.env
	vault kv get --field=.env secret/internal/apps/uniroster/envs/qa > qa.env
	vault kv get --field=.env secret/internal/apps/uniroster/envs/prod > prod.env

scheduletasks:
	@echo Create the cloudwatch rule with the schedule
	@echo aws --profile qa events put-rule --cli-input-json file://scheduler/cloudwatch.rule.json
	@echo aws --profile prod events put-rule --cli-input-json file://scheduler/cloudwatch.rule.json
	@echo

	@echo Get the lambda alias arn:
	@echo aws --profile qa lambda list-aliases --function-name LaunchECS
	@echo aws --profile prod lambda list-aliases --function-name launchecs

	@echo Update the lambda.target.json file with the lambda alias arn.  This is important.

	@echo Create the rule target with the lambda alias arn and the event input.
	@echo aws --profile qa events put-targets --cli-input-json file://scheduler/lambda.target.json
	@echo aws --profile prod events put-targets --cli-input-json file://scheduler/lambda.target.json

docker-clean:
	@docker system prune -f --filter "label=name=$(MODULE)"

clean:
	@rm -rf .pytest_cache .coverage .pytest_cache coverage.xml oneimporter.qa.yml oneimporter.qa.json oneimporter.prod.yml oneimporter.prod.json dc.tmp.yml oneimporter.qa.ecs.json oneimporter.prod.ecs.json task.json

