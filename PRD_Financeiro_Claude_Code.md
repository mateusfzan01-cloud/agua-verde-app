# PRD - Módulo Financeiro Água Verde
## Versão para Claude Code CLI + MCP Supabase

> **Contexto de execução**: Claude Code CLI com MCP Supabase conectado. 
> As migrations podem ser executadas diretamente via MCP.

---

## 0. Pré-requisitos (Implementar Primeiro!)

### ✅ 0.1 Banco de Dados - CONCLUÍDO

Campos já criados via MCP Supabase:

| Tabela | Campo | Tipo | Default | Descrição |
|--------|-------|------|---------|-----------|
| viagens | valor_motorista | numeric | - | Valor a pagar ao motorista |
| viagens | fornecedor_id | uuid | - | FK para fornecedores (pendente) |
| viagens | status_pagamento_motorista | text | 'pendente' | pendente, pago, cancelado |
| viagens | data_pagamento_motorista | timestamptz | - | Data do pagamento |
| viagens | status_faturamento | text | 'pendente' | pendente, faturado (evita dupla-fatura) |
| motoristas | pagamento_no_dia | boolean | false | Se recebe no mesmo dia |
| motoristas | chave_pix | text | - | Chave PIX do motorista |

> **Nota**: `fornecedor_id` foi criado sem FK porque tabela `fornecedores` ainda não existe. A constraint será adicionada na Fase 1.

### ✅ 0.1.1 Função RPC - Pagamento Atômico - CONCLUÍDO

Função `marcar_viagens_como_pagas` criada para garantir integridade transacional:

```sql
-- Uso no frontend:
const { data, error } = await supabase.rpc('marcar_viagens_como_pagas', {
  p_motorista_id: motoristaId,
  p_viagem_ids: [1, 2, 3],
  p_periodo_inicio: '2024-01-01',
  p_periodo_fim: '2024-01-07'
})
// Retorna: { success: true, pagamento_id: uuid, valor_total: 500.00, quantidade_viagens: 3 }
```

> **Importante**: Esta função executa UPDATE viagens + INSERT pagamentos_motoristas + INSERT pagamento_viagens em uma única transação. Se qualquer operação falhar, todas são revertidas.

### 🔧 0.2 Frontend - Ajustes nos Forms Existentes (PENDENTE)

**DetalheViagem.jsx - Expandir vinculação de motorista:**

O código atual de vinculação é apenas:
```jsx
<select onChange={(e) => vincularMotorista(e.target.value)}>
```

Precisa ser expandido para incluir campo de valor:
```jsx
// Estado
const [valorMotorista, setValorMotorista] = useState('')
const [motoristaParaVincular, setMotoristaParaVincular] = useState('')

// Função de vinculação atualizada
async function vincularMotorista() {
  const { error } = await supabase
    .from('viagens')
    .update({ 
      motorista_id: motoristaParaVincular,
      valor_motorista: valorMotorista ? parseFloat(valorMotorista) : null,
      status: 'vinculada'
    })
    .eq('id', id)
  // ...
}

// UI com dois campos
<div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
  <select value={motoristaParaVincular} onChange={(e) => setMotoristaParaVincular(e.target.value)}>
    <option value="">Selecionar motorista...</option>
    {motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
  </select>
  <input 
    type="number" 
    placeholder="Valor motorista (R$)" 
    value={valorMotorista}
    onChange={(e) => setValorMotorista(e.target.value)}
  />
  <button onClick={vincularMotorista} disabled={!motoristaParaVincular}>
    Vincular
  </button>
</div>
```

**Motoristas.jsx - Adicionar campos no form:**
```jsx
// No estado do form, adicionar:
pagamento_no_dia: false,
chave_pix: ''

// No formulário, adicionar campos:
<div className="form-group">
  <label>
    <input
      type="checkbox"
      name="pagamento_no_dia"
      checked={form.pagamento_no_dia}
      onChange={handleChange}
    />
    Pagamento no dia (não espera segunda)
  </label>
</div>

<div className="form-group">
  <label>Chave Pix</label>
  <input
    type="text"
    name="chave_pix"
    value={form.chave_pix}
    onChange={handleChange}
    placeholder="Email, CPF, telefone ou chave aleatória"
  />
</div>
```

### 0.3 Ordem de Implementação

1. **Primeiro**: Executar migrations para adicionar campos no banco
2. **Segundo**: Ajustar DetalheViagem.jsx para vinculação com valor
3. **Terceiro**: Ajustar Motoristas.jsx para novos campos
4. **Quarto**: Começar o módulo financeiro propriamente dito

---

## 1. Visão Geral

### 1.1 Contexto
App de gestão de transfers para agência de turismo em Recife. O módulo financeiro resolve duas dores principais do admin:

1. **Pagamento semanal a motoristas**: Toda segunda-feira, precisa saber quanto pagar a cada motorista pelas viagens concluídas na semana
2. **Faturamento mensal a fornecedores**: Gerar faturas para cobrar dos parceiros (iNeedTours, FoxTransfer) que enviam reservas

### 1.2 Acesso
- **Apenas admin** tem acesso ao módulo financeiro
- Gerente e motoristas não veem essa aba

### 1.3 Distinção Importante: Valor vs Valor Motorista

| Campo | Descrição | Quem vê | Moeda |
|-------|-----------|---------|-------|
| `valor` | Valor pago pelo fornecedor à agência | Admin | BRL, USD, EUR |
| `valor_motorista` | Valor que a agência paga ao motorista | Admin (motorista não vê) | Sempre BRL |

**Exemplo prático:**
- FoxTransfer paga R$ 170 à Água Verde (`valor`)
- Água Verde paga R$ 100 ao motorista (`valor_motorista`)  
- Margem da agência: R$ 70 (não calculamos automaticamente por decisão)

### 1.4 Stack Atual
- React (frontend)
- Supabase (banco de dados + auth)
- Vercel (deploy)
- n8n (automação de emails/reservas)
- Resend (envio de emails)

---

## 2. Modelo de Dados

### 2.1 Alterações em Tabelas Existentes

#### Tabela `viagens`

**Campos que JÁ EXISTEM:**
- `valor` - valor do fornecedor
- `moeda` - moeda do valor (BRL, USD, EUR)
- `numero_reserva` - ✅ número de reserva do fornecedor
- `valor_motorista` - ✅ criado
- `fornecedor_id` - ✅ criado (FK pendente)
- `status_pagamento_motorista` - ✅ criado (default 'pendente')
- `data_pagamento_motorista` - ✅ criado
- `status_faturamento` - ✅ criado (default 'pendente') - evita dupla-fatura

**Pendente (Fase 1)** - Adicionar FK após criar tabela fornecedores:
```sql
ALTER TABLE viagens 
  ADD CONSTRAINT fk_viagens_fornecedor 
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id);
```

#### Tabela `motoristas`

**Campos que JÁ EXISTEM:**
- `pagamento_no_dia` - ✅ criado (default false)
- `chave_pix` - ✅ criado

### 2.2 Novas Tabelas

#### Tabela `fornecedores`
```sql
CREATE TABLE IF NOT EXISTS fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  nome_legal VARCHAR(255),
  identificador_fiscal VARCHAR(100),
  endereco TEXT,
  email VARCHAR(255),
  moeda_padrao VARCHAR(3) DEFAULT 'BRL',
  prazo_pagamento_dias INT DEFAULT 30,
  dados_extras JSONB DEFAULT '{}'::jsonb,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fornecedores_ativo ON fornecedores(ativo);
```

**Dados iniciais** (executar após criar tabela):
```sql
INSERT INTO fornecedores (nome, nome_legal, identificador_fiscal, endereco, email, dados_extras) VALUES
(
  'iNeedTours', 
  'WORLD EXPERIENCE SRL', 
  'P.IVA: 02441070469', 
  'Via Francesco de Pinedo 18, 55041 Lido di Camaiore (LU) Italy', 
  NULL,
  '{"numero_rea": "LU-225916", "sdi": "M5UXCR1"}'::jsonb
),
(
  'FoxTransfer', 
  'Fox Transfer Brasil Servico Receptivo Ltda - ME', 
  '21.727.286/0001-81',
  'Av Moema, 265, Loja: 2, Moema, Sao Paulo, SP - CEP 04077-020',
  NULL,
  '{"telefone": "(11) 2776 5767", "id_cliente": "Foxtransfers"}'::jsonb
);
```

#### Tabela `faturas`

> **Nota**: Campo `numero_reserva` removido - já existe em `viagens`. Cada viagem tem seu próprio número de reserva.

```sql
CREATE TABLE IF NOT EXISTS faturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero SERIAL UNIQUE NOT NULL,
  -- numero_reserva removido: já existe em viagens.numero_reserva
  fornecedor_id UUID REFERENCES fornecedores(id) NOT NULL,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  valor_total DECIMAL(10,2) NOT NULL,
  moeda VARCHAR(3) DEFAULT 'BRL',
  quantidade_viagens INT NOT NULL,
  status VARCHAR(20) DEFAULT 'rascunho'
    CHECK (status IN ('rascunho', 'emitida', 'enviada', 'paga', 'vencida')),
  data_emissao DATE,
  data_vencimento DATE,
  data_pagamento DATE,
  arquivo_url TEXT,
  observacoes TEXT,
  criado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faturas_fornecedor ON faturas(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_faturas_status ON faturas(status);
CREATE INDEX IF NOT EXISTS idx_faturas_vencimento ON faturas(data_vencimento);
```

#### Tabela `fatura_viagens`
```sql
CREATE TABLE IF NOT EXISTS fatura_viagens (
  fatura_id UUID REFERENCES faturas(id) ON DELETE CASCADE,
  viagem_id BIGINT REFERENCES viagens(id) ON DELETE RESTRICT,
  valor_na_fatura DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (fatura_id, viagem_id)
);

CREATE INDEX IF NOT EXISTS idx_fatura_viagens_viagem ON fatura_viagens(viagem_id);
```

#### Tabela `pagamentos_motoristas`

> **Nota**: Campo `data_pagamento` removido por redundância - usar `criado_em` como data oficial do pagamento.

```sql
CREATE TABLE IF NOT EXISTS pagamentos_motoristas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motorista_id UUID REFERENCES motoristas(id) NOT NULL,
  valor_total DECIMAL(10,2) NOT NULL,
  quantidade_viagens INT NOT NULL,
  periodo_inicio DATE NOT NULL,
  periodo_fim DATE NOT NULL,
  -- data_pagamento removido: usar criado_em como data do pagamento
  observacoes TEXT,
  criado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ DEFAULT NOW() -- Esta é a data oficial do pagamento
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_motorista ON pagamentos_motoristas(motorista_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_criado_em ON pagamentos_motoristas(criado_em);
```

#### Tabela `pagamento_viagens`
```sql
CREATE TABLE IF NOT EXISTS pagamento_viagens (
  pagamento_id UUID REFERENCES pagamentos_motoristas(id) ON DELETE CASCADE,
  viagem_id BIGINT REFERENCES viagens(id) ON DELETE RESTRICT,
  valor_pago DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (pagamento_id, viagem_id)
);

CREATE INDEX IF NOT EXISTS idx_pagamento_viagens_viagem ON pagamento_viagens(viagem_id);
```

### 2.3 RLS (Row Level Security)

```sql
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE faturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE fatura_viagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos_motoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagamento_viagens ENABLE ROW LEVEL SECURITY;

-- Fornecedores: admin full access
CREATE POLICY "Admin gerencia fornecedores" ON fornecedores
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfis WHERE perfis.id = auth.uid() AND perfis.tipo = 'admin')
  );

-- Faturas: admin full access  
CREATE POLICY "Admin gerencia faturas" ON faturas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfis WHERE perfis.id = auth.uid() AND perfis.tipo = 'admin')
  );

-- Fatura_viagens: admin full access
CREATE POLICY "Admin gerencia fatura_viagens" ON fatura_viagens
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfis WHERE perfis.id = auth.uid() AND perfis.tipo = 'admin')
  );

-- Pagamentos_motoristas: admin full access
CREATE POLICY "Admin gerencia pagamentos" ON pagamentos_motoristas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfis WHERE perfis.id = auth.uid() AND perfis.tipo = 'admin')
  );

-- Pagamento_viagens: admin full access
CREATE POLICY "Admin gerencia pagamento_viagens" ON pagamento_viagens
  FOR ALL USING (
    EXISTS (SELECT 1 FROM perfis WHERE perfis.id = auth.uid() AND perfis.tipo = 'admin')
  );
```

---

## 3. Telas e Componentes React

### 3.1 Navegação

Adicionar na sidebar (visível apenas para admin):
- Ícone: 💰 ou ícone de cifrão
- Label: "Financeiro"
- Sub-rotas:
  - `/financeiro/pagamentos` - Pagamentos a Motoristas
  - `/financeiro/faturas` - Faturas para Fornecedores
  - `/financeiro/historico` - Histórico

### 3.2 Componente: PagamentosMotoristas

**Rota**: `/financeiro/pagamentos`

**Funcionalidade**:
1. Filtro de período (padrão: última semana, segunda a domingo)
2. Buscar viagens onde:
   - `status = 'concluida'`
   - `status_pagamento_motorista = 'pendente'`
   - `motorista_id IS NOT NULL`
3. Agrupar por motorista
4. Separar em duas seções:
   - "Pagamento no dia": motoristas com `pagamento_no_dia = true`
   - "Pagamento semanal": demais motoristas
5. Para cada motorista mostrar:
   - Nome e foto
   - Quantidade de viagens
   - Valor total (soma de `valor_motorista`)
   - Chave Pix
   - Botões: "Ver viagens", "WhatsApp", "Marcar pago"
6. Checkbox para seleção múltipla (seção semanal)
7. Resumo no rodapé: total selecionado
8. Alerta: viagens concluídas sem `valor_motorista`

**Ação "Marcar como pago"** (usando função RPC atômica):

> ⚠️ **IMPORTANTE**: Usar a função RPC `marcar_viagens_como_pagas` que executa todas operações em uma única transação. NUNCA fazer 3 chamadas separadas - risco de dados inconsistentes.

```javascript
// ✅ CORRETO: Uma única chamada atômica
async function marcarComoPago(motoristaId, viagemIds, periodoInicio, periodoFim) {
  const { data, error } = await supabase.rpc('marcar_viagens_como_pagas', {
    p_motorista_id: motoristaId,
    p_viagem_ids: viagemIds,
    p_periodo_inicio: periodoInicio,
    p_periodo_fim: periodoFim
  })

  if (error) {
    alert('Erro ao processar pagamento: ' + error.message)
    return null
  }

  // Retorno: { success: true, pagamento_id: uuid, valor_total: 500.00, quantidade_viagens: 3 }
  alert(`Pagamento registrado! R$ ${data.valor_total.toFixed(2)} - ${data.quantidade_viagens} viagens`)
  return data
}

// ❌ ERRADO: 3 chamadas separadas (risco de inconsistência)
// await supabase.from('viagens').update(...)      // Se falhar aqui...
// await supabase.from('pagamentos_motoristas')... // ...ou aqui...
// await supabase.from('pagamento_viagens')...     // ...dados ficam corrompidos
```

**Botão WhatsApp**:
```javascript
const mensagem = `Olá ${nome}! 💰

Segue o pagamento referente às viagens de ${dataInicio} a ${dataFim}:

• ${qtdViagens} viagens realizadas
• Valor total: R$ ${valor.toFixed(2)}

Chave Pix: ${chavePix}

Obrigado pelo excelente trabalho! 🚗`

window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`)
```

### 3.3 Componente: Faturas

**Rota**: `/financeiro/faturas`

**Funcionalidade**:

**Seção 1 - Gerar Nova Fatura**:
1. Select de fornecedor (buscar de `fornecedores` onde `ativo = true`)
2. Inputs de período (data início e fim)
3. Botão "Buscar viagens" - **filtrar por `status_faturamento = 'pendente'`**
4. Lista de viagens encontradas com checkbox
5. Viagens canceladas aparecem com:
   - Ícone ✗ no status
   - Valor R$ 0,00
   - Podem ser incluídas/excluídas
6. Input para "Nº Reserva" (referência do fornecedor)
7. Data de vencimento (auto: data atual + prazo do fornecedor)
8. Botões: "Pré-visualizar PDF", "Gerar Fatura"

**Seção 2 - Faturas Emitidas**:
1. Lista de faturas ordenada por data (mais recente primeiro)
2. Para cada fatura mostrar:
   - Número, fornecedor, período
   - Quantidade de viagens, valor total
   - Status com ícone (⏳ Aguardando, ✅ Paga, ⚠️ Vencida)
   - Data de vencimento
   - Botões: "Ver PDF", "Marcar como paga"

### 3.4 Componente: HistoricoFinanceiro

**Rota**: `/financeiro/historico`

**Funcionalidade**:
1. Filtros: motorista, fornecedor, mês/ano
2. Seção "Pagamentos a Motoristas":
   - Tabela com: Data, Motorista, Qtd Viagens, Valor, botão Detalhes
   - Total do período
3. Seção "Faturas Emitidas":
   - Tabela com: Número, Fornecedor, Período, Valor, Status
   - Totais: faturado vs recebido

---

## 4. Geração de PDF das Faturas

### 4.1 Biblioteca Sugerida
Usar `@react-pdf/renderer` ou `pdfmake` para gerar PDF no frontend.

### 4.2 Layout do PDF

#### Header (igual para ambos fornecedores)
```
┌────────────────────────────────────────────────────────────────────┐
│ [LOGO AGUA VERDE]                          Data: DD.MM.YYYY       │
│                                            FATURA Nº XXXXX        │
│ Agua Verde – Viagens & Receptivos          RESERVA Nº XXXXX       │
│ Rua Jonatas de Vasconcelos, 788            VENCIMENTO: DD/MM/YYYY │
│ Boa Viagem - Pernambuco - Brasil                                  │
│ (81) 3033-0245                                                    │
│ 17.427.292/0001-46                         [DADOS DO FORNECEDOR]  │
│ Inscrição Estadual: Isento                 Nome Legal             │
│                                            Identificador Fiscal   │
│                                            Endereço               │
└────────────────────────────────────────────────────────────────────┘
```

#### Tabela - iNeedTours
Colunas:
| # | Nº Reserva | Nome de Pax | Data do Serviço | Nº Pax | Veículo | Local de Saída | Destino | Status | Valor |

- Status: ✓ (verde) para OK, ✗ (vermelho) para cancelada
- Viagens canceladas: valor = R$ 0,00
- Linhas alternadas com fundo cinza claro

#### Tabela - FoxTransfer
Colunas:
| Nº Reserva | Nome | Nº Pax | Local de Saída | Destino | Hora Reserva | Hora Voo | Hora Encontro | Status | Tipo | Valor |

- Status: "Confirmado" ou "Cancelado"
- Tipo: "Private Transfer" ou "Shared Transfer"
- Viagens canceladas: valor = R$ 0,00

#### Footer
```
┌────────────────────────────────────────────────────────────────────┐
│                                          TOTAL    R$ XX.XXX,XX    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 5. Alterações em Componentes Existentes

### 5.1 NovaViagem.jsx e EditarViagem.jsx

Adicionar campos:
```jsx
{/* Valor do Motorista */}
<div className="form-group">
  <label>Valor Motorista (R$)</label>
  <input
    type="number"
    name="valor_motorista"
    value={form.valor_motorista}
    onChange={handleChange}
    step="0.01"
    placeholder="0,00"
  />
</div>

{/* Fornecedor */}
<div className="form-group">
  <label>Fornecedor</label>
  <select name="fornecedor_id" value={form.fornecedor_id} onChange={handleChange}>
    <option value="">Selecione...</option>
    {fornecedores.map(f => (
      <option key={f.id} value={f.id}>{f.nome}</option>
    ))}
  </select>
</div>
```

### 5.2 Motoristas.jsx (form de cadastro/edição)

Adicionar campos:
```jsx
{/* Pagamento no dia */}
<div className="form-group">
  <label>
    <input
      type="checkbox"
      name="pagamento_no_dia"
      checked={form.pagamento_no_dia}
      onChange={handleChange}
    />
    Pagamento no dia (não espera segunda)
  </label>
</div>

{/* Chave Pix */}
<div className="form-group">
  <label>Chave Pix</label>
  <input
    type="text"
    name="chave_pix"
    value={form.chave_pix}
    onChange={handleChange}
    placeholder="Email, CPF, telefone ou chave aleatória"
  />
</div>
```

### 5.3 Sidebar/Menu

Adicionar verificação de admin e link para Financeiro:
```jsx
{user?.perfil?.tipo === 'admin' && (
  <NavLink to="/financeiro/pagamentos">
    💰 Financeiro
  </NavLink>
)}
```

---

## 6. Rotas

Adicionar em App.jsx ou equivalente:
```jsx
<Route path="/financeiro/pagamentos" element={<AdminRoute><PagamentosMotoristas /></AdminRoute>} />
<Route path="/financeiro/faturas" element={<AdminRoute><Faturas /></AdminRoute>} />
<Route path="/financeiro/historico" element={<AdminRoute><HistoricoFinanceiro /></AdminRoute>} />
```

---

## 7. Fases de Implementação

### Fase 0 - Pré-requisitos ✅ CONCLUÍDA
- [x] ~~Migrations para campos no banco~~ ✅ CONCLUÍDO
- [x] ~~Criar função RPC `marcar_viagens_como_pagas`~~ ✅ CONCLUÍDO (pagamento atômico)
- [x] ~~Adicionar `status_faturamento` em viagens~~ ✅ CONCLUÍDO (evita dupla-fatura)
- [x] ~~Ajustar DetalheViagem.jsx~~ ✅ CONCLUÍDO - vinculação com valor_motorista + edição posterior
- [x] ~~Ajustar Motoristas.jsx~~ ✅ CONCLUÍDO - campos pagamento_no_dia e chave_pix no form
- [ ] Testar: vincular motorista com valor, editar motorista com novos campos

### Fase 1 - Banco de Dados do Módulo Financeiro
1. Criar tabela `fornecedores` com dados iniciais (iNeedTours, FoxTransfer)
2. Adicionar FK: viagens.fornecedor_id → fornecedores(id)
3. Criar tabela `faturas`
4. Criar tabela `fatura_viagens`
5. Criar tabela `pagamentos_motoristas`
6. Criar tabela `pagamento_viagens`
7. Criar RLS policies para todas as novas tabelas

### Fase 2 - Pagamentos a Motoristas  
1. Criar componente PagamentosMotoristas.jsx
2. Implementar listagem de motoristas com viagens pendentes
3. Separar seções "Pagamento no dia" vs "Semanal"
4. Implementar ação "Marcar como pago"
5. Implementar botão WhatsApp com mensagem formatada
6. Implementar alerta de viagens sem valor_motorista

### Fase 3 - Faturas
1. Criar componente Faturas.jsx (geração + listagem)
2. Implementar busca de viagens por fornecedor/período
3. Implementar geração de PDF (template por fornecedor)
4. Implementar lista de faturas emitidas
5. Implementar controle de status (aguardando/paga)

### Fase 4 - Histórico e Refinamentos
1. Criar componente HistoricoFinanceiro.jsx
2. Adicionar item "Financeiro" no menu/sidebar (admin only)
3. Adicionar rotas protegidas
4. Testar fluxo completo

---

## 8. Dados da Empresa (para PDF)

```
Agua Verde – Viagens & Receptivos
Rua Jonatas de Vasconcelos, 788 - Boa Viagem - Pernambuco - Brasil
(81) 3033-0245
CNPJ: 17.427.292/0001-46
Inscrição Estadual: Isento
```
