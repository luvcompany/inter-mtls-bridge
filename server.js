// Ponte mTLS entre o LUV Caixa Forte e a API do Banco Inter.
// Recebe do app: { metodo, caminho, corpo, headers, cert_pem, key_pem } e devolve
// { status, corpo, certApresentado }. O certificado vem por requisição — nada é
// guardado aqui. NUNCA logar cert_pem, key_pem, corpo de token ou o segredo.
const http = require("node:http");
const https = require("node:https");

const SECRET = process.env.BRIDGE_SECRET || "";
const PORT = Number(process.env.PORT) || 3000;
const INTER_HOST = "cdpj.partners.bancointer.com.br";

function responder(res, http_status, obj) {
  const corpo = JSON.stringify(obj);
  res.writeHead(http_status, { "Content-Type": "application/json" });
  res.end(corpo);
}

const server = http.createServer((req, res) => {
  // Health check (Easypanel/observabilidade)
  if (req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("bridge inter ok");
    return;
  }
  if (req.method !== "POST") {
    return responder(res, 405, { status: 405, corpo: "metodo nao suportado", certApresentado: false });
  }
  if (!SECRET || req.headers["x-bridge-secret"] !== SECRET) {
    return responder(res, 401, { status: 401, corpo: "bridge: nao autorizado", certApresentado: false });
  }

  let raw = "";
  req.on("data", (c) => {
    raw += c;
    if (raw.length > 5_000_000) req.destroy(); // trava payload absurdo
  });
  req.on("end", () => {
    let body;
    try { body = JSON.parse(raw); }
    catch { return responder(res, 400, { status: 400, corpo: "bridge: json invalido", certApresentado: false }); }

    const caminho = String(body.caminho || "");
    if (!(caminho.startsWith("/oauth/v2/token") || caminho.startsWith("/banking/"))) {
      return responder(res, 400, { status: 400, corpo: "bridge: caminho nao permitido", certApresentado: false });
    }
    if (!body.cert_pem || !body.key_pem) {
      return responder(res, 400, { status: 400, corpo: "bridge: certificado/chave ausentes", certApresentado: false });
    }

    const metodo = String(body.metodo || "GET").toUpperCase();
    const hs = (body.headers && typeof body.headers === "object") ? body.headers : {};

    const up = https.request({
      host: INTER_HOST, path: caminho, method: metodo,
      cert: body.cert_pem, key: body.key_pem,
      headers: Object.assign({ Accept: "application/json" }, hs),
    }, (r) => {
      let dados = ""; let ca = false;
      try { const c = r.socket.getCertificate && r.socket.getCertificate(); ca = !!(c && Object.keys(c).length); } catch {}
      r.on("data", (c) => (dados += c));
      r.on("end", () => responder(res, 200, { status: r.statusCode || 0, corpo: dados, certApresentado: ca }));
    });
    up.on("error", (e) => responder(res, 200, { status: 0, corpo: "bridge: falha de conexao: " + e.message, certApresentado: false }));
    up.setTimeout(30000, () => up.destroy(new Error("timeout 30s")));
    if (body.corpo) up.write(body.corpo);
    up.end();
  });
});

server.listen(PORT, () => console.log("Ponte Inter ouvindo na porta " + PORT));
