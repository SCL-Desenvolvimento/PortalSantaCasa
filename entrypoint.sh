#!/bin/bash

dotnet PortalSantaCasa.Server.dll &

nginx -g "daemon off;"