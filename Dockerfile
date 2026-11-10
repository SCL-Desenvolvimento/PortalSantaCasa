FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble

WORKDIR /app

COPY ./app/ ./
COPY ./entrypoint.sh /entrypoint.sh

RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 8080

ENV ASPNETCORE_URLS=http://0.0.0.0:8080
ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["/entrypoint.sh"]
