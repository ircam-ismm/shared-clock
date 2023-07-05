#!/bin/bash

# double-click
cd "$( dirname "$0" )" || (echo "no dir: ${0}"; exit 1)

echo "get sources"
branch=$(git symbolic-ref --short HEAD)
git stash
git pull origin $branch

echo "install"
rm -Rf node_modules
npm install

echo "build"
npm run build:production
