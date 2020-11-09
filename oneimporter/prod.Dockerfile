FROM debian:buster-slim AS builder
RUN apt-get update && \
    apt-get -qq install --no-install-suggests --no-install-recommends python3-venv gcc libpython3-dev libsasl2-dev python-dev libldap2-dev libssl-dev && \
    python3 -m venv /venv && \
    /venv/bin/pip install --upgrade pip

FROM builder AS builder-venv

COPY requirements.txt /requirements.txt
RUN /venv/bin/pip install --disable-pip-version-check -r /requirements.txt

FROM builder-venv AS tester

COPY . /app
WORKDIR /app
RUN /venv/bin/pytest

FROM gcr.io/distroless/python3-debian10 AS runner
ENV VERSION {VERSION}
COPY --from=tester /usr/lib /usr/lib
COPY --from=tester /venv /venv
COPY --from=tester /app /app

WORKDIR /app

ENTRYPOINT ["/venv/bin/python3", "-m", "oneimporter"]
USER 1001

LABEL name={NAME}
LABEL version={VERSION}