#!/bin/sh
set -e
# The API gateway is a stateless proxy: it owns no database and no Prisma schema,
# so there is nothing to migrate. Just start the server.
exec node dist/server.cjs
