#!/bin/bash
npx prisma generate && node test-db-connection.js
