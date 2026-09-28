import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

// Load environment variables (.env is auto-loaded by Bun)
const EMAIL = process.env.BC_EMAIL || "";
const PASSWORD = process.env.BC_PASSWORD || "";
const PORT = Number(process.env.PORT || 3001);

const BASE_URL = "https://www.bomcondutor.pt";
const SESSION_FILE = join(process.cwd(), ".session.json");

const THEMES_MAP: Record<string, Record<number, string>> = {
  AM: {
    1: "Circulação, segurança, veículos missão urgente",
    2: "Sinais de Perigo",
    3: "Sinais de Proibição",
    4: "Sinais de Cedência de Passagem",
    5: "Sinais de Indicação",
    6: "Sinalização luminosa, marcas rodoviárias, outra sinalização",
    7: "Paragem, estacionamento e cruzamento de veículos, ultrapassagem",
    8: "Velocidade, outras manobras, condicionantes da velocidade",
    9: "Cedência de passagem, condução defensiva e peões",
    10: "Estado físico do condutor, álcool, drogas e medicamentos",
    11: "Classificação, características dos veículos, ambiente, iluminação, equipamentos, acidente",
    12: "Sinais de obrigação",
    13: "Vias de trânsito e condições ambientais adversas",
    14: "Títulos, obtenção, revalidação, responsabilidade civil e criminal, contra-ordenações"
  },
  B: {
    19: "Sinais de perigo",
    20: "Circulação, segurança e veículos em missão urgente de socorro",
    21: "Sinais de proibição",
    22: "Sinais de prescrição específica, sinais de cedência de passagem",
    23: "Sinais de indicação",
    24: "Sinalização luminosa, marcas no pavimento e outra sinalização",
    25: "Ultrapassagem",
    26: "Paragem, estacionamento e cruzamento de veículos",
    27: "Outras manobras",
    28: "Velocidade",
    29: "Cedência de passagem",
    30: "Estado físico do condutor, álcool, drogas e medicamentos, sinais de obrigação",
    31: "Classificação, constituintes, inspeções, pesos e dimensões, ambiente, segurança",
    32: "Iluminação, passageiros e carga, condução defensiva e peões",
    33: "Vias de trânsito, condições ambientais adversas",
    34: "Títulos de condução, obtenção, revalidação, contra-ordenações, cassação"
  },
  A: {
    15: "Equipamento de Proteção",
    16: "Visibilidade relativamente aos outros utentes da via",
    17: "Classificação das vias",
    18: "Constituintes do veículo"
  },
  C: {
    35: "Noções Básicas do Veículo",
    36: "Manutenção",
    37: "Classificação de Veículos e Inspeções Periódicas",
    38: "Proteção do Ambiente e Equipamentos de Segurança",
    39: "Documentos de que o condutor deverá ser portador",
    40: "Períodos de Condução e Repouso",
    41: "Logística (tipos, utilização, leitura e manutenção)",
    42: "Transporte de Mercadorias"
  },
  D: {
    35: "Noções Básicas do Veículo",
    36: "Manutenção",
    37: "Classificação de Veículos e Inspeções Periódicas",
    38: "Proteção do Ambiente e Equipamentos de Segurança",
    39: "Documentos de que o condutor deverá ser portador",
    40: "Períodos de Condução e Repouso",
    41: "Logística (tipos, utilização, leitura e manutenção)",
    43: "Transporte de Passageiros"
  }
};

const CATEGORIES = [
  { id: "B", name: "B", desc: "Candidatos às categorias B ou B1 (Ligeiros)" },
  { id: "A", name: "A", desc: "Candidatos à categoria A já habilitados com B (Motociclos)" },
  { id: "A+B", name: "A + B", desc: "Candidatos à categoria A não habilitados com B" },
  { id: "AM", name: "AM", desc: "Antiga licença de ciclomotores" },
  { id: "C", name: "C", desc: "Candidatos à categoria C (Pesados de Mercadorias)" },
  { id: "D", name: "D", desc: "Candidatos à categoria D (Pesados de Passageiros)" }
];

const TEST_TYPES = [
  { id: "exame", name: "Exame", desc: "Questões aleatórias simulando o exame oficial" },
  { id: "novas", name: "Novas", desc: "Questões a que ainda não respondeu" },
  { id: "tematico", name: "Temático", desc: "Questões de um ou mais temas específicos" },
  { id: "dificil", name: "Difícil", desc: "Questões mais falhadas pelos nossos utilizadores" },
  { id: "erradas", name: "Erradas", desc: "Questões erradas por si" }
];

class SessionManager {
  private cookies = new Map<string, string>();
  private defaultHeaders = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  };

  constructor() {
    this.loadSession();
  }

  private loadSession() {
    try {
      if (existsSync(SESSION_FILE)) {
        const data = JSON.parse(readFileSync(SESSION_FILE, "utf-8"));
        if (data && typeof data === "object") {
          for (const [k, v] of Object.entries(data)) {
            this.cookies.set(k, String(v));
          }
          console.log(`[Session] Loaded ${this.cookies.size} cookies from ${SESSION_FILE}`);
        }
      }
    } catch (e) {
      console.warn("[Session] Could not load session file:", e);
    }
  }

  private saveSession() {
    try {
      const obj: Record<string, string> = {};
      for (const [k, v] of this.cookies.entries()) {
        obj[k] = v;
      }
      writeFileSync(SESSION_FILE, JSON.stringify(obj, null, 2), "utf-8");
    } catch (e) {
      console.warn("[Session] Could not save session file:", e);
    }
  }

  public updateCookies(response: Response) {
    // Bun provides getSetCookie() for multiple Set-Cookie headers
    const setCookies = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
    if (setCookies.length === 0) {
      const single = response.headers.get("set-cookie");
      if (single) setCookies.push(single);
    }

    let changed = false;
    for (const raw of setCookies) {
      const parts = raw.split(";");
      const [keyVal] = parts;
      const eqIdx = keyVal.indexOf("=");
      if (eqIdx !== -1) {
        const key = keyVal.slice(0, eqIdx).trim();
        const val = keyVal.slice(eqIdx + 1).trim();
        if (key) {
          this.cookies.set(key, val);
          changed = true;
        }
      }
    }
    if (changed) {
      this.saveSession();
    }
  }

  public getCookieHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  public getCookie(name: string): string | undefined {
    return this.cookies.get(name);
  }

  public async verifySession(): Promise<boolean> {
    if (this.cookies.size === 0) return false;
    try {
      const res = await fetch(`${BASE_URL}/teste`, {
        headers: {
          ...this.defaultHeaders,
          "Cookie": this.getCookieHeader(),
        },
        redirect: "manual"
      });
      this.updateCookies(res);
      const text = await res.text();
      return text.includes("registeredUser', true") || text.includes("/sair");
    } catch (e) {
      return false;
    }
  }

  public async login(): Promise<boolean> {
    if (!EMAIL || !PASSWORD) {
      throw new Error("Credenciais não configuradas no ficheiro .env (BC_EMAIL e BC_PASSWORD)");
    }

    console.log(`[Auth] Iniciar autenticação para ${EMAIL}...`);
    // 1. GET /entrar to get CSRF and initial session
    const getRes = await fetch(`${BASE_URL}/entrar`, {
      headers: this.defaultHeaders
    });
    this.updateCookies(getRes);
    const getHtml = await getRes.text();

    const csrfMatch = getHtml.match(/name=["']csrf["']\s+value=["']([^"']+)["']/);
    if (!csrfMatch) {
      throw new Error("Não foi possível extrair o token CSRF de /entrar");
    }
    const csrf = csrfMatch[1];
    console.log(`[Auth] CSRF obtido: ${csrf}`);

    // 2. POST /entrar
    const body = new URLSearchParams({
      csrf,
      email: EMAIL,
      password: PASSWORD,
      remember: "true",
      login: "Entrar"
    });

    const postRes = await fetch(`${BASE_URL}/entrar`, {
      method: "POST",
      body,
      headers: {
        ...this.defaultHeaders,
        "Cookie": this.getCookieHeader(),
        "Origin": BASE_URL,
        "Referer": `${BASE_URL}/entrar`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      redirect: "manual"
    });
    this.updateCookies(postRes);

    const postHtml = await postRes.text();
    const isSuccess = postRes.status === 302 || postHtml.includes("registeredUser', true") || postHtml.includes("/sair");

    if (isSuccess) {
      console.log("[Auth] Autenticado com sucesso no Bom Condutor!");
      return true;
    }

    // Extract error if possible
    const modalMatch = postHtml.match(/constant\('flashModal',\s*(\[.*?\])\);/);
    if (modalMatch) {
      try {
        const modalData = JSON.parse(modalMatch[1]);
        const msg = modalData[0]?.body?.replace(/<[^>]+>/g, "") || modalData[0]?.title;
        throw new Error(`Falha no login: ${msg}`);
      } catch (err: any) {
        throw new Error(`Falha no login: ${err.message}`);
      }
    }

    throw new Error("Falha no login: credenciais inválidas ou erro no portal Bom Condutor.");
  }

  public async fetch(url: string, init?: RequestInit): Promise<Response> {
    const isAuthed = await this.verifySession();
    if (!isAuthed) {
      await this.login();
    }

    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      "Cookie": this.getCookieHeader(),
      ...(init?.headers as Record<string, string> || {})
    };

    const res = await fetch(url, {
      ...init,
      headers
    });
    this.updateCookies(res);
    return res;
  }
}

const sessionManager = new SessionManager();

// Cache for images
const imageCache = new Map<string, { buffer: ArrayBuffer; contentType: string }>();

// Bun Server implementation
const server = Bun.serve({
  port: PORT,
  async fetch(req: Request) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // CORS headers for local flexibility
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 1. API: Authentication & Profile Status
    if (pathname === "/api/status" && req.method === "GET") {
      try {
        const isAuthed = await sessionManager.verifySession();
        return Response.json({
          authenticated: isAuthed,
          email: EMAIL,
        }, { headers: corsHeaders });
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    // 2. API: Get selections from /teste (Categories, Types, Themes, Recommended Test, User Stats)
    if (pathname === "/api/teste/options" && req.method === "GET") {
      try {
        const res = await sessionManager.fetch(`${BASE_URL}/teste`);
        const html = await res.text();

        // Extract userStats
        let userStats = null;
        const statsMatch = html.match(/constant\('userStats',\s*(\{.*?\})\);/);
        if (statsMatch) {
          try {
            userStats = JSON.parse(statsMatch[1]);
          } catch (e) {}
        }

        // Return rich selection data
        return Response.json({
          userStats,
          categories: CATEGORIES,
          types: TEST_TYPES,
          themes: THEMES_MAP,
        }, { headers: corsHeaders });
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    // 3. API: Start Exam (Scrape questions in real time)
    if (pathname === "/api/teste/start" && req.method === "POST") {
      try {
        const body = await req.json() as {
          url?: string;
          category?: string;
          type?: string;
          themes?: number[];
        };

        let targetPath = "";
        if (body.url) {
          targetPath = body.url.replace(/^\//, "");
        } else {
          const category = body.category || "B";
          const type = body.type || "novas";
          if (type === "tematico" && body.themes && body.themes.length > 0) {
            const sortedThemes = [...body.themes].sort((a, b) => a - b).join(",");
            targetPath = `teste/${category}/tematico/${sortedThemes}`;
          } else {
            targetPath = `teste/${category}/${type}`;
          }
        }

        const fullUrl = `${BASE_URL}/${targetPath}`;
        console.log(`[Exam] A obter teste de: ${fullUrl}`);

        const res = await sessionManager.fetch(fullUrl);
        const html = await res.text();

        // Extract testSetup
        const testMatch = html.match(/BC\.constant\('testSetup',\s*(\{.*?\})\);/);
        if (!testMatch) {
          // Check for flash error modal
          const modalMatch = html.match(/constant\('flashModal',\s*(\[.*?\])\);/);
          if (modalMatch) {
            const m = JSON.parse(modalMatch[1]);
            return Response.json({ error: m[0]?.body?.replace(/<[^>]+>/g, "") || "Erro ao carregar teste." }, { status: 400, headers: corsHeaders });
          }
          return Response.json({ error: "Não foi possível carregar as questões deste teste. Verifique se a seleção é válida." }, { status: 400, headers: corsHeaders });
        }

        const testSetup = JSON.parse(testMatch[1]);

        // Attach absolute image URLs to each question for easy rendering
        if (Array.isArray(testSetup.questions)) {
          for (const q of testSetup.questions) {
            q.imageUrl = `${BASE_URL}/assets/images/questions/${q.id}.jpg`;
            q.proxyImageUrl = `/api/image/${q.id}`;
          }
        }

        return Response.json({
          setup: testSetup,
          targetUrl: fullUrl
        }, { headers: corsHeaders });
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    // 4. API: Submit Exam Answers & Get Results
    if (pathname === "/api/teste/submit" && req.method === "POST") {
      try {
        const body = await req.json() as {
          hash: string;
          picks: Record<string, string>;
          force?: boolean;
        };

        if (!body.hash || !body.picks) {
          return Response.json({ error: "Hash e respostas (picks) são obrigatórios." }, { status: 400, headers: corsHeaders });
        }

        console.log(`[Exam] A submeter teste com hash ${body.hash.slice(0, 20)}...`);

        // Retrieve CSRF token from cookies
        const csrfToken = sessionManager.getCookie("csrf") || "";

        // Serialize payload into application/x-www-form-urlencoded as AngularJS transformRequest does
        const params = new URLSearchParams();
        params.append("hash", body.hash);
        params.append("force", body.force ? "true" : "false");
        if (csrfToken) {
          params.append("csrf", csrfToken);
        }

        for (const [qId, pick] of Object.entries(body.picks)) {
          params.append(`picks[${qId}]`, String(pick));
        }

        // 1. POST to https://www.bomcondutor.pt/api/tests/process
        const submitRes = await sessionManager.fetch(`${BASE_URL}/api/tests/process`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
            "Referer": `${BASE_URL}/teste`,
            "Origin": BASE_URL,
            "X-Requested-With": "XMLHttpRequest",
            "X-XSRF-TOKEN": csrfToken
          },
          body: params.toString()
        });

        console.log(`[Exam] Resposta do processamento: ${submitRes.status}`);

        let directReview = null;
        try {
          directReview = await submitRes.json();
        } catch (e) {}

        // 2. GET https://www.bomcondutor.pt/teste/resultado to scrape testReview with full solutions
        const resultPageRes = await sessionManager.fetch(`${BASE_URL}/teste/resultado`);
        const resultHtml = await resultPageRes.text();

        const reviewMatch = resultHtml.match(/BC\.constant\('testReview',\s*(\{.*?\})\);/);
        const setupMatch = resultHtml.match(/BC\.constant\('testSetup',\s*(\{.*?\})\);/);

        let testReview = null;
        let testSetup = null;

        if (reviewMatch) {
          try {
            testReview = JSON.parse(reviewMatch[1]);
          } catch (e) {}
        }
        if (setupMatch) {
          try {
            testSetup = JSON.parse(setupMatch[1]);
          } catch (e) {}
        }

        const finalReview = testReview || directReview;

        if (!finalReview) {
          return Response.json({
            error: "O teste foi submetido, mas não foi possível extrair a revisão final do Bom Condutor."
          }, { status: 500, headers: corsHeaders });
        }

        return Response.json({
          review: finalReview,
          setup: testSetup,
        }, { headers: corsHeaders });
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    // 5. Image Proxy to avoid CORS / loading issues
    if (pathname.startsWith("/api/image/")) {
      const qId = pathname.replace("/api/image/", "").replace(/\.jpg$/, "");
      if (imageCache.has(qId)) {
        const cached = imageCache.get(qId)!;
        return new Response(cached.buffer, {
          headers: {
            "Content-Type": cached.contentType,
            "Cache-Control": "public, max-age=86400",
            ...corsHeaders
          }
        });
      }

      try {
        const imgRes = await fetch(`${BASE_URL}/assets/images/questions/${qId}.jpg`);
        if (!imgRes.ok) {
          return new Response("Not found", { status: 404, headers: corsHeaders });
        }
        const buffer = await imgRes.arrayBuffer();
        const contentType = imgRes.headers.get("content-type") || "image/jpeg";
        imageCache.set(qId, { buffer, contentType });
        return new Response(buffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400",
            ...corsHeaders
          }
        });
      } catch (e: any) {
        return new Response(e.message, { status: 500, headers: corsHeaders });
      }
    }

    // 6. Static Web Files
    const publicDir = join(process.cwd(), "public");

    if (pathname === "/" || pathname === "/index.html") {
      const file = Bun.file(join(publicDir, "index.html"));
      return new Response(file, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    if (pathname === "/style.css") {
      const file = Bun.file(join(publicDir, "style.css"));
      return new Response(file, { headers: { "Content-Type": "text/css; charset=utf-8" } });
    }

    if (pathname === "/app.js") {
      const file = Bun.file(join(publicDir, "app.js"));
      return new Response(file, { headers: { "Content-Type": "application/javascript; charset=utf-8" } });
    }

    return new Response("Not Found", { status: 404 });
  }
});

console.log(`\n======================================================`);
console.log(`🚗 Bom Condutor Real-Time Web Client`);
console.log(`🌐 Servidor a correr em: http://localhost:${server.port}`);
console.log(`🔑 Utilizador configurado: ${EMAIL || "(não configurado)"}`);
console.log(`======================================================\n`);
