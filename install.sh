#!/bin/sh

read -p "Enter the full path to app/book/src: "

echo "$REPLY" > book-src-directory-path.txt

npm link
