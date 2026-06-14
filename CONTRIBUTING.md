# Contributing

Obrigado por considerar contribuir com este toolkit de automacao para servidores Discord.

## Ambiente local

1. Instale dependencias do bot:

```bash
cd discord-bot
npm install
```

2. Instale dependencias do dashboard:

```bash
cd ../dashboard
npm install
```

3. Crie `discord-bot/.env` com base em `.env.example`.

## Padrao de trabalho

- Mantenha mudancas pequenas e focadas.
- Nao publique tokens, `.env`, banco SQLite, logs ou arquivos `.pid`.
- Rode testes antes de abrir PR.
- Atualize documentacao quando mudar comandos, setup ou fluxos do dashboard.
- Prefira nomes e conteudos originais. Nao use assets oficiais de franquias protegidas.

## Testes

```bash
cd discord-bot
npm run test:smoke
npm run test:system
```

Para screenshots:

```bash
cd dashboard
npm run screenshots
```

## Pull requests

Inclua:

- resumo da mudanca;
- motivacao;
- screenshots quando alterar UI;
- comandos/testes executados;
- riscos conhecidos.

## Areas boas para contribuir

- OAuth2 no dashboard.
- Modais de ticket.
- Cards de perfil.
- Mercado entre usuarios.
- Eventos de criaturas.
- Melhorias de AutoMod.
- Testes automatizados mais completos.

## Codigo de conduta

Seja respeitoso, objetivo e colaborativo. Este projeto e voltado para comunidades Discord saudaveis; a colaboracao deve seguir o mesmo principio.
