#!/bin/bash

# Read .env file and add each variable to Vercel
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ $key =~ ^#.*$ ]] && continue
  [[ -z $key ]] && continue
  
  # Remove quotes from value
  value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
  
  # Update BASE_URL and DISCOGS_CALLBACK_URL with Vercel URL
  if [ "$key" = "BASE_URL" ]; then
    value="https://stack-5cpg3gr0b-nicolaihedams-projects.vercel.app"
  fi
  
  if [ "$key" = "DISCOGS_CALLBACK_URL" ]; then
    value="https://stack-5cpg3gr0b-nicolaihedams-projects.vercel.app/api/auth/discogs/callback"
  fi
  
  echo "Adding $key..."
  echo "$value" | vercel env add "$key" production --yes > /dev/null 2>&1
  
done < .env

echo ""
echo "✅ All environment variables added to Vercel!"
