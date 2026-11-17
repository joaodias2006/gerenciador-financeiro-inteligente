# Raio-X Financeiro — Gestão Financeira Pessoal Inteligente & Open Finance

Aplicação web full-stack moderna e responsiva para controle rigoroso de gastos, clareza em tempo real de fluxo de caixa e consolidação de múltiplas contas bancárias do mesmo titular.

## 1. Stack e Arquitetura Técnica

- **Frontend:** React 18 (Vite), Tailwind CSS v4, ícones `lucide-react` e gráficos interativos (`recharts`).
- **Backend & Banco de Dados:**
  - **API Full-Stack Node.js + SQLite (`node:sqlite`):** Servidor integrado em [`server/apiPlugin.js`](server/apiPlugin.js) e banco relacional em [`server/db.js`](server/db.js) com autenticação e isolamento de dados por titular (`user_id` / CPF).
  - **Esquema PostgreSQL / Supabase (`RLS`):** Script completo em [`supabase/schema.sql`](supabase/schema.sql) com políticas de *Row Level Security* (`auth.uid() = user_id`).
- **Design System (UI/UX):**
  - Estilo fintech moderna com suporte a **Dark Mode** e **Light Mode**.
  - **Modo Privacidade** para ocultar/exibir todos os valores monetários com um clique.
  - Tipografia numérica tabular (`JetBrains Mono`) e alertas visuais semânticos (Verde = Margem Segura, Amarelo = Atenção ao Limite, Vermelho = Limite Excedido).

---

## 2. Módulos Principais

### 2.1. Minhas Contas e Bancos (Open Finance & Importação)
- Gerenciamento consolidado e individual de múltiplas instituições financeiras do mesmo titular (**Nubank**, **Itaú Unibanco**, **Banco Inter**, **Bradesco**, **Banco do Brasil**, **Caixa**, **Santander**, **BTG Pactual**, **C6 Bank**).
- **Arquitetura Modular Open Finance Brasil:** Adaptador pronto para **Pluggy** e **Belvo** em [`src/services/openFinanceService.js`](src/services/openFinanceService.js).
- **Simulador de Conexão Bancária:** Conecte qualquer banco com 1 clique para teste imediato com saldo, limite de cartão e lançamentos realistas.
- **Importador de Extratos Manuais (`.OFX` e `.CSV`):** Upload de arquivos reais ou simulação instantânea com categorização automática e detecção de meio de pagamento.

### 2.2. Dashboard Principal — Visão Inteligente do Mês
1. **Card "Livre para Gastar" (Safe-to-Spend):**
   $$\text{Livre para Gastar} = (\text{Saldo Total em Conta} + \text{Receitas do Mês}) - (\text{Gastos Já Realizados} + \text{Contas Fixas/Comprometidas a Pagar} + \text{Meta de Reserva})$$
2. **Card "Dinheiro Intocável / Comprometido":** Soma automática de contas fixas pendentes, boletos agendados e faturas/parcelas de cartão a vencer no mês.
3. **Card "Cofre & Reserva para o Próximo Mês":** Meta de poupança editável, acompanhamento do valor guardado no mês e controle de *rollover* (reforço de caixa) para o mês seguinte.
4. **Card "Sobra Real do Mês":** Diferença líquida entre todas as entradas e saídas do mês em tempo real.
5. **Painel "Crédito vs. Débito & Meios de Pagamento":**
   - Termômetro de limite de cartão de crédito (Limite Total, Limite Utilizado, Limite Livre e Fatura Atual).
   - Gráficos Recharts comparando saídas à vista vs. crédito, distribuição por Meio de Pagamento e por Categoria.

### 2.3. Registro e Histórico Completo de Pagamentos
- **Modal "+ Registrar Pagamento / Receita":** Suporte a Despesa/Receita, Banco/Conta, Categoria, Status (`Pago` / `Agendado`), Conta Fixa Recorrente e Forma de Pagamento (`Pix`, `Cartão de Crédito à Vista`, `Cartão de Crédito Parcelado`, `Cartão de Débito`, `Boleto`, `Transferência`, `Benefício`).
- **Geração Automática de Parcelas Futuras:** Ao selecionar **Cartão de Crédito Parcelado** (`ex: 1 de 6`), o sistema gera automaticamente as parcelas nos meses seguintes.
- **Extrato Unificado de Gestão:** Busca textual, filtros combinados por período, banco, meio de pagamento, categoria e status, baixa rápida com 1 clique, edição, exclusão e exportação `.CSV`.

### 2.4. Previsão do Próximo Mês
- Cálculo automático dos **Gastos já comprometidos para o próximo mês** (parcelas de cartão futuras + despesas fixas recorrentes).
- Cálculo do **Orçamento estimado do próximo mês**:
  $$\text{Orçamento Estimado} = (\text{Renda Mensal Prevista} + \text{Sobra/Reserva Acumulada Deste Mês}) - \text{Gastos Já Comprometidos para o Próximo Mês}$$
- Simulador rápido de impacto de novas compras parceladas e gráfico de evolução de comprometimento para os próximos 6 meses.

---

## 3. Como Executar Localmente

```bash
npm install
npm run dev
```
O servidor iniciará em `http://localhost:5173` com o Frontend React + Vite e a API Full-Stack SQLite (`/api/*`) integrados.
