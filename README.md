# CofreFlow — Gerenciador Inteligente de Pagamentos, Boletos & Automação de Cofrinho

Aplicativo web completo para controle consolidado de contas bancárias, gestão inteligente de boletos (DDA / FEBRABAN / Pix) e recomendação automatizada de aportes no **Cofrinho** (102% CDI).

## Funcionalidades Principais

1. **Conexão Multi-Bancos (Open Finance + Importador OFX/CSV)**:
   - Visão consolidada de contas correntes e faturas de cartão de crédito (Nubank, Itaú, Banco Inter, etc.).
   - Importação direta de extratos bancários nos formatos **`.ofx`** (Open Financial Exchange) e **`.csv`** com categorização automática.
   - Estrutura pronta para conexão com agregadores **Open Finance Brasil** (**Pluggy** e **Belvo**), incluindo modo Sandbox interativo.

2. **Central de Boletos e Contas a Pagar + Leitor FEBRABAN & Pix**:
   - **Leitor real de Linha Digitável FEBRABAN** (47 dígitos para boletos bancários e 48 dígitos para concessionárias de água, luz, internet e tributos) com cálculo automático do vencimento (incluindo o novo fator de vencimento pós-22/02/2025) e extração do valor e banco emissor.
   - **Decodificador de Pix Copia e Cola (BRCode EMV `000201...`)**: extrai automaticamente recebedor, cidade e valor.
   - Priorização automática por criticidade (*Atrasado*, *Vence Hoje*, *Em até 3 dias*, *Programado*) com cálculo de multa (2%) + juros evitados.

3. **Motor Inteligente de Automação do Cofrinho**:
   - Calcula exatamente **o que pagar agora** e **quanto guardar com segurança no Cofrinho hoje** descontando todos os boletos pendentes, reserva para gastos variáveis e margem de segurança:
     $$\text{Aporte Seguro} = \text{Saldo em Conta} - \left(\text{Boletos Pendentes} + \text{Reserva do Mês} + 0.5 \times \text{Margem de Segurança}\right)$$
   - Três perfis de automação (*Conservador*, *Equilibrado 50-30-20* e *Meta Acelerada*) e regras de arredondamento de troco Pix e percentual sobre receitas.

## Estrutura do Projeto

- `index.html`: Interface principal semântica e responsiva.
- `styles.css`: Design System em Vanilla CSS com suporte a Tema Claro e Escuro.
- `src/openFinance.js`: Decodificador FEBRABAN/Pix EMV, parser de arquivos `.ofx` e `.csv` e conector Open Finance (Pluggy/Belvo).
- `src/cofrinhoEngine.js`: Motor matemático de priorização de boletos e cálculo de aporte seguro no Cofrinho.
- `src/app.js`: Gerenciamento de estado, eventos, gráficos em Canvas e persistência local (`localStorage`).
- `samples/`: Arquivos `extrato-exemplo.ofx` e `extrato-exemplo.csv` para testar a importação imediatamente.

## Como Executar Localmente

Basta servir a pasta raiz com qualquer servidor HTTP estático (por exemplo, Python ou Node.js):

```bash
npx serve .
# ou
python3 -m http.server 8080
```
