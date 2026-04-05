# Plano de Produto — AgendaBot para Barbeiros/Salões

## Visão Geral

Um assistente de agendamento automatizado via WhatsApp e Telegram, integrado ao Google Calendar, com foco inicial em profissionais autônomos como barbeiras e cabeleireiros.

---

## Núcleo do Sistema

### Fluxo Principal

```
Cliente manda mensagem
    → Bot recebe via WhatsApp/Telegram
    → Consulta disponibilidade no Google Calendar
    → Responde naturalmente (com IA ou fluxo fixo)
    → Cliente confirma → Bot cria evento no Calendar
    → Lembretes automáticos são agendados
```

### Blocos Funcionais

#### Bloco A — Integração de Mensageria
- WhatsApp via **Evolution API** (open source, sem custo, ideal para MVP)
- Telegram via **Bot API** (mais simples, ótimo para começar)
- Um único backend processa as mensagens dos dois canais

#### Bloco B — Motor de Agendamento
- Leitura de slots disponíveis via **Google Calendar API**
- Criação de eventos com dados do cliente (nome, serviço, contato)
- Regras de negócio: duração do serviço, intervalo entre atendimentos, horário de funcionamento

#### Bloco C — Inteligência de Conversa
- **Opção 1 (MVP simples):** Fluxo de perguntas fixas com botões/opções
- **Opção 2 (mais poderoso):** LLM via Claude/GPT com contexto da agenda — o bot entende linguagem natural como *"semana que vem de manhã tem algum horário?"*

#### Bloco D — Lembretes Automáticos
- Fila de jobs agendados (ex: BullMQ + Redis)
- Configurável pelo profissional: 24h antes, 12h antes, 1h antes
- Mensagem personalizável, com opção de confirmação ou cancelamento pelo cliente

#### Bloco E — Painel Administrativo
- Configuração de horários de atendimento
- Configuração das mensagens do bot
- Visualização de agendamentos
- Configuração dos lembretes

---

## Stack Recomendada

| Camada | Tecnologia |
|---|---|
| Backend | Node.js + TypeScript |
| Banco de dados | PostgreSQL |
| Fila de jobs | BullMQ + Redis |
| WhatsApp | Evolution API |
| Telegram | Telegraf.js |
| Agenda | Google Calendar API |
| Painel admin | Next.js |
| Hospedagem | Railway ou Render |

---

## Fases de Implementação

### Fase 1 — MVP (4–6 semanas)
> Telegram + Google Calendar + fluxo fixo de conversa

- [ ] Bot no Telegram respondendo perguntas básicas
- [ ] Conexão com Google Calendar (ler slots livres)
- [ ] Criação de agendamento via bot
- [ ] Lembrete simples 24h antes

> **Por que começar pelo Telegram?** A API é gratuita, sem aprovação, sem custo por mensagem. Perfeita para validar o produto.

### Fase 2 — Expansão (4–6 semanas)
> WhatsApp + painel admin + IA na conversa

- [ ] Integração com WhatsApp via Evolution API
- [ ] Painel web para o profissional configurar tudo
- [ ] Substituir fluxo fixo por linguagem natural com LLM
- [ ] Múltiplos lembretes configuráveis
- [ ] Cancelamento e reagendamento via bot

### Fase 3 — Produto (ongoing)
> Multi-profissional + monetização

- [ ] Suporte a múltiplos profissionais (SaaS)
- [ ] Planos de assinatura (ex: até X agendamentos/mês)
- [ ] Relatórios de atendimento
- [ ] Integração com outros calendários (Outlook, Calendly)
- [ ] Migração opcional para API oficial Meta (Twilio) em alto volume

---

## Twilio vs Evolution API

| Critério | Twilio | Evolution API |
|---|---|---|
| Custo inicial | Médio/alto | Quase zero |
| Complexidade técnica | Baixa | Média |
| Risco de ban | Nenhum | Baixo (volume pequeno) |
| Aprovação Meta | Obrigatória | Não precisa |
| Ideal para | SaaS escalável | MVP e negócios locais |

**Decisão:** Usar **Evolution API** no MVP. Volume de uma barbeira é pequeno, risco de ban é mínimo, e valida a ideia sem custo. Migrar para API oficial quando virar SaaS com alto volume.

---

## Pontos de Atenção

- **Evolution API** requer VPS própria e manutenção. A Meta pode alterar o protocolo e causar instabilidades temporárias.
- **Google Calendar OAuth** precisa que o profissional conecte a própria conta — o fluxo de autenticação tem que ser simples e bem explicado no onboarding.
- **Conflito de horários** é crítico — se dois clientes perguntarem ao mesmo tempo sobre o mesmo slot, o sistema precisa de lock (reserva temporária) antes de confirmar.
- **LGPD** — dados de clientes (nome, telefone) ficam armazenados; o profissional precisa estar ciente e aceitar os termos.

---

## Por Onde Começar Agora

1. Criar um bot no Telegram (@BotFather) e testar recepção de mensagens
2. Configurar o projeto Google Cloud e ativar a Calendar API
3. Montar o fluxo mais simples possível: cliente pergunta → bot lista horários → cliente escolhe → bot agenda
4. Testar com uma pessoa real (a própria barbeira) antes de qualquer painel
5. Subir a Evolution API em uma VPS simples (Docker) para testes com WhatsApp
