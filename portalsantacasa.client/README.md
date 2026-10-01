# PortalsantacasaClient

Frontend do Portal Santa Casa, atualizado para Angular 21.2, Node.js 24 e npm 11.
Veja o [README do projeto](../README.md) para versões compatíveis, configuração,
auditoria de dependências e publicação integrada com o backend.

## Development server

To start a local development server, run:

```bash
npm start
```

O servidor utiliza HTTPS e o certificado de desenvolvimento do .NET. Abra o
endereço exibido pelo Angular no terminal. Os arquivos são recarregados ao editar o código.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

Os arquivos são gerados em `../PortalSantaCasa.Server/wwwroot/browser` e incluídos
na publicação do Server. A configuração padrão do build é produção.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
