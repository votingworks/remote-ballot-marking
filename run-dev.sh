#!/usr/bin/env bash

export FLASK_ENV=${FLASK_ENV:-development}
trap 'kill 0' SIGINT SIGHUP
cd "$(dirname "${BASH_SOURCE[0]}")"
pipenv run python -m server.main &
yarn --cwd client start
