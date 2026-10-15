# Base Rendimo

Base de empresas por categoria de empreitada. Interface em português, azul principal `#263A7A`.

## O que inclui

- Entrada por código validado no servidor e sessão em cookie HttpOnly.
- Criação e edição de empresas: nome, imagem, categoria, email opcional, contacto, site e notas.
- Pesquisa por empresa ou categoria; categorias por ordem alfabética.
- Categorias e backups nas definições.
- Seleção de empresas para abrir um email em BCC ou copiar endereços; ignora empresas sem email.
- Eliminação com confirmação e código validado no servidor.
- Dados partilhados no servidor, atualização ao voltar à janela e a cada minuto enquanto aberta.
- Verificação de conflitos ao editar registos noutro computador.
- Exportação e importação de backups JSON (a importação acrescenta registos e ignora identificadores existentes).
- Cópia interna em R2 após cada alteração, uma cópia por dia.

**Os backups automáticos para os dois Google Drives ainda não estão implementados.** A interface identifica-os como pendentes.

## Colocar no GitHub

1. Extrair o ZIP.
2. Criar um repositório no GitHub.
3. Colocar o conteúdo da pasta `base-rendimo` na raiz do repositório, incluindo as pastas que começam por ponto e `.gitignore`.
4. Não enviar `node_modules`, `dist`, `.wrangler`, `.sites-runtime` nem ficheiros com segredos.

Também podes usar Git, a partir da pasta extraída:

```sh
git init
git add .
git commit -m "Base Rendimo"
git branch -M main
git remote add origin https://github.com/TEU_UTILIZADOR/TEU_REPOSITORIO.git
git push -u origin main
```

Publicar o código no GitHub não publica automaticamente a aplicação. **GitHub Pages, por si só, não executa este servidor nem a base de dados.** O projeto utiliza Cloudflare Workers, D1 e R2. O GitHub pode guardar o código; é necessário alojamento compatível para executar a aplicação completa.

## Tecnologia

React, TypeScript, Vinext/Vite, Cloudflare Workers, D1 (SQLite), R2 e Drizzle.

## Desenvolvimento local

Requisitos: Node.js 22.13 ou superior e pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
```

Copiar `.dev.vars.example` para `.dev.vars` e definir os três valores. Escolhe o código de acesso e o código de eliminação pretendidos. Gera um segredo de sessão, por exemplo:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Nunca publiques `.dev.vars`. Os segredos da versão alojada não estão incluídos neste pacote.

Compilar e criar as tabelas da base de dados local (executar a migração apenas uma vez numa base nova):

```sh
pnpm build
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_panoramic_bloodscream.sql
pnpm dev
```

Abrir o endereço mostrado no terminal. A base de dados local é independente da versão publicada.

```sh
pnpm build           # Compilar o Worker e os ficheiros do cliente
pnpm start           # Executar a versão compilada localmente
node tests/api.mjs   # Testes da API, sem utilizar dados reais
```

## Alojamento próprio

É preciso criar uma base D1 e um bucket R2 na conta Cloudflare, associando os bindings `DB` e `BUCKET`. Configurar `ACCESS_PASSWORD`, `DELETE_CODE` e `SESSION_SECRET` como segredos do Worker, aplicar a migração SQL e publicar o Worker com os ficheiros estáticos de `dist/client`.

`dist/server/wrangler.json` é gerado pela compilação. O identificador D1 fictício e os nomes de recursos do ambiente local devem ser substituídos pelos recursos reais antes de publicar numa conta própria. O ZIP contém `.openai/hosting.json` sem a identidade do site original. Não foi feita uma publicação numa conta Cloudflare externa nem configuração de GitHub Actions.

No alojamento atual, o acesso privado tem também a proteção da conta ChatGPT. Num alojamento próprio, essa camada não acompanha os ficheiros: a proteção disponível no código é o código de acesso da aplicação.

## Dados existentes

Este pacote contém o código e o esquema das tabelas, **não contém os registos de empresas nem cópias da base de dados de produção**. Para transportar os dados, no site atual abrir Definições → Backups e importação → Exportar. Depois, importar esse JSON na nova instalação.

## Estrutura

- `app/`: interface e rotas de autenticação/dados.
- `lib/access.ts`: validação do código, assinatura e verificação da sessão.
- `db/schema.ts` e `drizzle/`: esquema e migração da base de dados.
- `build/`, `scripts/`, `vite.config.ts`: integração e compilação do Worker.
- `tests/api.mjs`: testes de autenticação, CRUD, conflitos, importação e backups.
- `docs/SITES-STARTER.md`: documentação técnica do projeto inicial.
