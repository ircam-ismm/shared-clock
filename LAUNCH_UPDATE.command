#!/bin/bash

# double-click
cd "$( dirname "$0" )" || (echo "no dir: ${0}"; exit 1)

echo "get sources"
git stash
git pull origin main

echo "install"
rm -Rf node_modules
npm install

echo "build"
npm run build:production
