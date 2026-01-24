#!/bin/bash
# Setup local HTTPS for PWA development
# This creates a self-signed certificate for local development

echo "Creating self-signed SSL certificate..."
mkdir -p .cert

# Create certificate
openssl req -x509 -newkey rsa:2048 -keyout .cert/key.pem -out .cert/cert.pem -days 365 -nodes -subj "/CN=localhost"

echo ""
echo "Certificate created!"
echo ""
echo "To use HTTPS in development:"
echo "1. Update your nuxt.config.ts to use HTTPS"
echo "2. On your iPhone, you'll need to accept the self-signed certificate warning"
echo ""
echo "Note: You'll need to modify package.json to run with HTTPS"
