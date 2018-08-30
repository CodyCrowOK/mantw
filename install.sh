#!/bin/sh

read -p "Enter the full path to app/book/src: "

echo "$REPLY" > test.txt

npm link
