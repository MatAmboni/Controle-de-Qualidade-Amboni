<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Amboni ERP - Controle de Qualidade

Aplicativo desktop para controle de qualidade da Amboni Alimentos.

## Desenvolvimento

Pré-requisito: Node.js instalado.

1. Instale as dependências: `npm install`
2. Inicie o ambiente web: `npm run dev`
3. Para abrir a janela Electron durante o desenvolvimento, execute `npm run build`, `npm run build:server` e depois `npm run electron`.

## Gerar o executável Windows

Execute:

```bash
npm run electron:dist
```

O instalador será criado em `release/AmboniERP-0.0.0.exe` (o número acompanha a versão do `package.json`). O aplicativo armazena os dados em `%APPDATA%/Amboni ERP`, portanto os registros continuam disponíveis após atualizações e reinstalações.

Para instalar em outros computadores, consulte o [tutorial de instalação](./INSTALL.md).
