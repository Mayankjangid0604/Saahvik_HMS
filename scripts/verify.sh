#!/bin/bash
ssh -i C:/Users/mayan/.ssh/saahvik.pem ubuntu@43.205.218.39 "curl -I -X OPTIONS http://localhost:3000/api/v1/health -H 'Origin: https://app.saahvik.com' -H 'Access-Control-Request-Method: POST'"
