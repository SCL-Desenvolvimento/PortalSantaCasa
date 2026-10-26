FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        nginx \
        certbot \
        python3-certbot-nginx \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY ./app/ ./

COPY ./nginx/intranet.conf /etc/nginx/sites-available/intranet

COPY ./entrypoint.sh /entrypoint.sh

RUN ln -sf \
      /etc/nginx/sites-available/intranet \
      /etc/nginx/sites-enabled/intranet \
    && rm -f /etc/nginx/sites-enabled/default \
    && sed -i 's/\r$//' /entrypoint.sh \
    && chmod +x /entrypoint.sh

EXPOSE 80
EXPOSE 443

ENV ASPNETCORE_URLS=http://127.0.0.1:8080
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["/entrypoint.sh"]
