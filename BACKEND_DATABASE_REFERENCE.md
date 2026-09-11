# CanaLog: mapa do backend e do banco

Este arquivo registra as conexões necessárias para substituir a camada de interface sem perder o backend atual.

## Arquitetura

```text
Next.js App Router
  -> Server Actions em app/actions/
  -> getCurrentUser() em lib/current-user.ts
  -> Drizzle ORM em lib/db/index.ts
  -> mysql2 Pool
  -> MySQL Railway
```

O navegador nunca deve acessar o MySQL diretamente. Toda leitura ou gravação passa por Server Actions ou por rotas API autenticadas.

## Variáveis de ambiente

Configure estas variáveis no `.env.local` e na Vercel:

```env
DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DATABASE
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=um-segredo-aleatorio-com-pelo-menos-32-caracteres
```

Em produção, `BETTER_AUTH_URL` deve ser a URL pública da aplicação. Nunca commite `DATABASE_URL`, senha ou `BETTER_AUTH_SECRET`.

Para o banco Railway usado neste projeto, a URL deve conter:

```text
host: centerbeam.proxy.rlwy.net
port: 31132
database: railway
user: root
```

A senha deve ser obtida somente nas variáveis protegidas do Railway/Vercel.

## Conexão MySQL

Arquivo: `lib/db/index.ts`

- Lê `DATABASE_URL`.
- Extrai host, porta, usuário, senha e banco com `URL`.
- Cria pool `mysql2/promise`.
- Usa `connectTimeout: 30000`.
- Mantém conexão ativa com `enableKeepAlive`.
- Limita o pool a 5 conexões.
- Exporta `pool` e `db`.
- O `db` usa o schema inteiro de `lib/db/schema.ts`.

## Autenticação

Arquivos:

- `lib/auth.ts`: Better Auth usando `drizzleAdapter(db, { provider: 'mysql' })`.
- `lib/auth-client.ts`: cliente Better Auth no navegador.
- `app/api/auth/[...all]/route.ts`: expõe GET/POST do Better Auth.
- `lib/current-user.ts`: carrega a sessão e relê `user.role` no MySQL.

Tabelas de autenticação:

- `user`
- `session`
- `account`
- `verification`

Perfis aceitos:

- `admin`
- `accountant`
- `driver`

## Rotas principais

- `/`: protege sessão e redireciona para `/erp`.
- `/erp`: carrega dados de gestão, ERP e configurações avançadas.
- `/account`: perfil e troca de senha.
- `/api/auth/[...all]`: login, cadastro, sessão e logout.
- `/api/reports`: relatório ERP autenticado; retorna 401 sem sessão.

## Server Actions

### `app/actions/management.ts`

- `getManagementData`
- `createTruck`
- `createDriver`

Controla frota, motoristas e operações resumidas. Apenas administrador cadastra caminhões e motoristas.

### `app/actions/operations.ts`

- `createDailyOperation`
- `createFuelRecord`

Funcionário pode lançar operação e abastecimento do caminhão atribuído. Contador não pode criar esses registros. Os cálculos de KM/L, custo e indicadores são feitos no backend.

### `app/actions/erp.ts`

Carrega e grava:

- viagens;
- manutenção;
- paradas;
- despesas;
- receitas;
- alertas;
- fechamento mensal;
- auditoria;
- importação das abas `cana` e `abastecimento` da planilha Excel.

### `app/actions/advanced.ts`

Controla:

- regras de manutenção preventiva;
- benchmarks;
- ocorrências;
- notificações;
- regras de alerta;
- configurações;
- regras de faturamento;
- categorias de despesas;
- permissões;
- criação de contas de funcionários.

## Tabelas operacionais

Definidas em `lib/db/schema.ts`:

- `trucks`: frota e KM atual.
- `drivers`: cadastro operacional e caminhão atribuído.
- `daily_operations`: lançamentos diários do funcionário.
- `fuel_records`: abastecimentos e custo calculado.
- `trips`: viagens de cana.
- `maintenance_records`: manutenção e custos.
- `downtime_records`: caminhões parados.
- `expenses`: despesas.
- `revenues`: receitas.
- `alerts`: alertas.
- `audit_logs`: histórico de alterações.
- `monthly_closures`: fechamento mensal.
- tabelas avançadas: `preventive_maintenance_rules`, `benchmarks`, `incidents`, `notifications`, `alert_rules`, `settings`, `revenue_rules`, `expense_categories`.

Todas as tabelas operacionais usam `user_id` como proprietário da empresa. No modelo atual, administrador e contador consultam os dados compartilhados da instalação; o funcionário é limitado aos próprios registros e caminhão atribuído.

## Migrações

Arquivos em `lib/db/migrations/`:

1. `0001_canalog_mysql.sql`: criação inicial MySQL.
2. `0000_operacao_cana.sql`: alterações operacionais posteriores.
3. `0002_erp_foundation_mysql.sql`: tabelas Better Auth em MySQL.
4. `0003_auth_tables_repair_mysql.sql`: apesar do nome, este arquivo contém sintaxe PostgreSQL (`text`, aspas e `now()`). Não execute esse arquivo em MySQL sem convertê-lo antes.

Para um banco MySQL novo, use o schema atual e as migrações MySQL compatíveis. Antes de executar migrações em um banco existente, faça backup e confirme quais tabelas já existem.

## Substituição do frontend

Se outro arquivo substituir os componentes visuais, preserve estes contratos:

1. Obter sessão com `getCurrentUser()` no servidor.
2. Nunca confiar no perfil vindo apenas do navegador.
3. Chamar as Server Actions existentes em vez de acessar o banco no cliente.
4. Enviar datas no formato `YYYY-MM-DD`.
5. Enviar IDs numéricos de caminhão e motorista.
6. Manter as validações de permissão no backend.
7. Para relatórios, usar `/api/reports` com a sessão autenticada.
8. Para Excel, usar `SpreadsheetImport` ou chamar `importSpreadsheetData` com dados normalizados.

## Checklist de troca

- Copiar as variáveis de ambiente para o novo deploy.
- Copiar `lib/db/index.ts`, `lib/db/schema.ts`, `lib/auth.ts` e `lib/current-user.ts`.
- Copiar `app/actions/`.
- Copiar `app/api/auth/[...all]/route.ts` e `app/api/reports/route.ts`.
- Confirmar que o banco possui as tabelas do schema atual.
- Testar login, logout e `/api/auth/get-session`.
- Testar criação de funcionário pelo administrador.
- Testar lançamento de operação pelo funcionário.
- Testar leitura dos dados pelo administrador e contador.
- Testar que contador não grava operação.
- Testar importação de cana e abastecimento.
