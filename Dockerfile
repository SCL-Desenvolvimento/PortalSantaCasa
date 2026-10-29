FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        nginx \
        certbot \
        python3-certbot-nginx \
        python3-certbot-dns-cloudflare \
        openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY ./app/ ./

COPY ./nginx/intranet.conf /etc/nginx/sites-available/intranet

COPY ./entrypoint.sh /entrypoint.sh
COPY ./certbot/reload-nginx.sh /usr/local/sbin/certbot-reload-nginx

RUN ln -sf \
      /etc/nginx/sites-available/intranet \
      /etc/nginx/sites-enabled/intranet \
    && rm -f /etc/nginx/sites-enabled/default \
    && sed -i 's/\r$//' /entrypoint.sh /usr/local/sbin/certbot-reload-nginx \
    && chmod +x /entrypoint.sh /usr/local/sbin/certbot-reload-nginx

EXPOSE 80
EXPOSE 443

ENV ASPNETCORE_URLS=http://127.0.0.1:8080
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["/entrypoint.sh"]
