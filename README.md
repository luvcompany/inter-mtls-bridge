# Ponte mTLS — LUV Caixa Forte × Banco Inter

Micro-serviço Node que faz o handshake com certificado (mTLS) que nem o app da
Lovable nem o n8n desta conta conseguem fazer. Isolado: não depende de nada.

- Recebe do app: `POST` com header `x-bridge-secret` e JSON
  `{ metodo, caminho, corpo, headers, cert_pem, key_pem }`.
- Só deixa passar o host do Inter e as rotas `/oauth/v2/token` e `/banking/*`.
- Devolve `{ status, corpo, certApresentado }`.
- O certificado vem **por requisição** (do cofre do app) — nada é guardado aqui.

## Deploy na Easypanel (recomendado)

1. **Coloque este código num repositório Git** (privado). Da pasta `bridge-service`:
   ```
   bash deploy-github.sh
   ```
   (cria `luvcompany/inter-mtls-bridge` privado e faz o push. Precisa do `gh` logado.)

2. Na **Easypanel** → **Create Service** → **App**:
   - **Source:** GitHub → selecione o repositório `inter-mtls-bridge`.
   - **Build:** Nixpacks (detecta Node sozinho) — ou Dockerfile, tanto faz.
   - **Port:** `3000`.

3. Aba **Environment** do serviço, adicione **uma** variável:
   ```
   BRIDGE_SECRET=<mesmo valor de INTER_BRIDGE_SECRET do arquivo ~/.config/luv/inter_bridge.env>
   ```
   Veja o valor com: `cat ~/.config/luv/inter_bridge.env`

4. **Domains:** habilite o domínio que a Easypanel oferece (algo como
   `inter-bridge-xxxx.easypanel.host`). Essa é a URL da ponte.

5. **Deploy.**

## Ligar no app (Lovable)

No projeto LUV Caixa Forte → **Cloud → Secrets**, deixe assim:
- `INTER_BRIDGE_URL` = a URL do serviço (ex.: `https://inter-bridge-xxxx.easypanel.host/`)
- `INTER_BRIDGE_SECRET` = o mesmo valor do `BRIDGE_SECRET`

O código do app **não muda** — ele já chama essa ponte nesse formato.

## Testar

```
bash testar-servico.sh https://inter-bridge-xxxx.easypanel.host/
```
Espera-se `not valid` (o Inter recebeu o certificado e recusou a credencial falsa).

## Portável

Mesmo código roda em Railway (`railway up`), Render, Fly.io (`fly launch`) ou
qualquer host Node. Só precisa da env `BRIDGE_SECRET` e expor a porta.
