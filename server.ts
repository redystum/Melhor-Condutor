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

  // Cache session verification to avoid unnecessary cookie rotation
  private lastVerifiedAt = 0;
  private lastVerifiedResult = false;
  private static VERIFY_CACHE_TTL_MS = 60_000; // 60 seconds

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

    // Return cached result if still valid
    const now = Date.now();
    if (this.lastVerifiedResult && (now - this.lastVerifiedAt) < SessionManager.VERIFY_CACHE_TTL_MS) {
      return true;
    }

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
      const isAuthed = text.includes("registeredUser', true") || text.includes("/sair");
      this.lastVerifiedResult = isAuthed;
      this.lastVerifiedAt = now;
      return isAuthed;
    } catch (e) {
      this.lastVerifiedResult = false;
      return false;
    }
  }

  /** Invalidate the cached session so next fetch() will re-verify or re-login */
  public invalidateSession() {
    this.lastVerifiedAt = 0;
    this.lastVerifiedResult = false;
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
      this.lastVerifiedResult = true;
      this.lastVerifiedAt = Date.now();
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

  /** Force a fresh login, invalidating the cached session first */
  public async forceLogin(): Promise<boolean> {
    this.invalidateSession();
    return this.login();
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

  /** Perform a fetch using current cookies without verifying the session first.
   *  Used for retries where we just did a fresh login. */
  public async rawFetch(url: string, init?: RequestInit): Promise<Response> {
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

// Cache for images & comments
const imageCache = new Map<string, { buffer: ArrayBuffer; contentType: string }>();

interface CommentItem {
  author: string;
  message: string;
  createdAt: string;
  likes: number;
  isOfficial?: boolean;
}

const commentsCache = new Map<string, CommentItem[]>();

function decryptExplanation(qid: number | string, cipher: string | null): string | null {
  if (!cipher || !qid) return null;
  try {
    const r = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const digitsSum = String(qid).split("").reduce((acc, d) => acc + (parseInt(d, 10) || 0), 0);
    const o = digitsSum;
    const a = r.slice(o) + r.slice(0, o);

    let transliterated = "";
    for (let i = 0; i < cipher.length; i++) {
      const idx = a.indexOf(cipher[i]);
      transliterated += idx !== -1 ? r[idx] : cipher[i];
    }

    const decoded = Buffer.from(transliterated, "base64").toString("utf-8");
    try {
      return JSON.parse(decoded);
    } catch {
      return decoded;
    }
  } catch {
    return null;
  }
}

async function getQuestionComments(qid: string): Promise<CommentItem[]> {
  if (commentsCache.has(qid)) {
    return commentsCache.get(qid)!;
  }
  try {
    const disqusUrl = `https://disqus.com/embed/comments/?base=default&f=bomcondutor&t_i=questao-${qid}&t_u=https%3A%2F%2Fwww.bomcondutor.pt%2Fquestao%2F${qid}`;
    const res = await fetch(disqusUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      }
    });
    const html = await res.text();
    const scripts = html.match(/<script[^>]*>(.*?)<\/script>/gs) || [];
    const list: CommentItem[] = [];

    for (const s of scripts) {
      const content = s.replace(/<\/?script[^>]*>/gi, "").trim();
      if (content.includes('"posts"') && content.includes('"response"')) {
        try {
          const data = JSON.parse(content);
          const posts = data?.response?.posts || [];
          for (const p of posts) {
            const author = p?.author?.name || "Anónimo";
            list.push({
              author,
              message: p?.message || "",
              createdAt: p?.createdAt || "",
              likes: p?.likes || 0,
              isOfficial: author.toLowerCase().includes("bom condutor")
            });
          }
        } catch {}
      }
    }
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    commentsCache.set(qid, list);
    return list;
  } catch (e) {
    console.warn(`Could not fetch comments for ${qid}:`, e);
    return [];
  }
}

// Bun Server implementation
const server = Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",
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

        // Attach absolute image URLs to each question and decrypt explanation
        if (Array.isArray(testSetup.questions)) {
          for (const q of testSetup.questions) {
            q.imageUrl = `${BASE_URL}/assets/images/questions/${q.id}.jpg`;
            q.proxyImageUrl = `/api/image/${q.id}`;
            if (q.explicacao) {
              q.explicacao = decryptExplanation(q.id, q.explicacao);
            }
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

        // Helper: build the url-encoded body for /api/tests/process
        function buildSubmitParams(hash: string, picks: Record<string, string>, force: boolean, csrf: string): string {
          const params = new URLSearchParams();
          params.append("hash", hash);
          params.append("force", force ? "true" : "false");
          if (csrf) params.append("csrf", csrf);
          for (const [qId, pick] of Object.entries(picks)) {
            params.append(`picks[${qId}]`, String(pick));
          }
          return params.toString();
        }

        // Helper: submit to Bom Condutor
        async function submitToBomCondutor(useRawFetch: boolean): Promise<any> {
          const csrf = sessionManager.getCookie("csrf") || "";
          const submitBody = buildSubmitParams(body.hash, body.picks, !!body.force, csrf);
          const fetchFn = useRawFetch ? "rawFetch" : "fetch";
          const submitRes = await sessionManager[fetchFn](`${BASE_URL}/api/tests/process`, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
              "Referer": `${BASE_URL}/teste`,
              "Origin": BASE_URL,
              "X-Requested-With": "XMLHttpRequest",
              "X-XSRF-TOKEN": csrf
            },
            body: submitBody
          });
          console.log(`[Exam] Resposta do processamento: ${submitRes.status}`);
          try {
            return await submitRes.json();
          } catch {
            return null;
          }
        }

        // 1. First attempt
        let directReview = await submitToBomCondutor(false);

        // 2. Check if the test was saved to the profile.
        //    Bom Condutor returns stats: { tests: N, ... } when saved, or stats: false when not.
        if (directReview && directReview.stats === false) {
          console.log("[Exam] ⚠️ Teste NÃO foi guardado no perfil (stats: false). A forçar re-login e a tentar novamente...");
          
          // Force fresh login to get a properly authenticated session
          await sessionManager.forceLogin();

          // Retry submission with the fresh session
          const retryReview = await submitToBomCondutor(true);
          
          if (retryReview && retryReview.stats && retryReview.stats !== false) {
            console.log(`[Exam] ✅ Retry bem-sucedido! Teste guardado no perfil (tests: ${retryReview.stats.tests}).`);
            directReview = retryReview;
          } else if (retryReview) {
            console.log(`[Exam] ⚠️ Retry concluído mas stats continua: ${JSON.stringify(retryReview.stats)}`);
            // Still use the retry result since it may have more data
            directReview = retryReview;
          } else {
            console.log("[Exam] ⚠️ Retry falhou, a usar resultado da primeira tentativa.");
          }
        } else if (directReview?.stats && typeof directReview.stats === "object") {
          console.log(`[Exam] ✅ Teste guardado no perfil com sucesso (tests: ${directReview.stats.tests}).`);
        }

        // 3. GET /teste/resultado to scrape testReview with full question data, solutions, etc.
        const resultPageRes = await sessionManager.rawFetch(`${BASE_URL}/teste/resultado`);
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

        // Merge permalink and stats from directReview if missing in testReview
        if (!finalReview.permalink && directReview?.permalink) {
          finalReview.permalink = directReview.permalink;
        }
        if (finalReview.permalink) {
          finalReview.permalink = String(finalReview.permalink)
            .trim()
            .replace(/^https?:\/\/[^\/]+\/(testes?\/)?/, "")
            .replace(/^\/?(testes?\/)?/, "");
        }

        // Include whether the test was saved to the profile
        const wasSaved = directReview?.stats && typeof directReview.stats === "object";
        finalReview._savedToProfile = wasSaved;

        // Enrich review and setup questions with image URLs and decrypted explanations
        for (const list of [finalReview.questions, testSetup?.questions]) {
          if (Array.isArray(list)) {
            for (const q of list) {
              q.imageUrl = `${BASE_URL}/assets/images/questions/${q.id}.jpg`;
              q.proxyImageUrl = `/api/image/${q.id}`;
              if (q.explicacao) {
                const dec = decryptExplanation(q.id, q.explicacao);
                if (dec) q.explicacao = dec;
              }
            }
          }
        }

        return Response.json({
          review: finalReview,
          setup: testSetup,
        }, { headers: corsHeaders });
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
      }
    }

    // 5. API: Question Comments
    if (pathname.startsWith("/api/question/") && pathname.endsWith("/comments") && req.method === "GET") {
      const match = pathname.match(/^\/api\/question\/(\d+)\/comments$/);
      if (!match) {
        return Response.json({ error: "Invalid question ID" }, { status: 400, headers: corsHeaders });
      }
      const qid = match[1];
      const comments = await getQuestionComments(qid);
      return Response.json({ comments }, { headers: corsHeaders });
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

    // Serve static files from public directory
    const MIME_TYPES: Record<string, string> = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
      ".webp": "image/webp",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
    };

    // Resolve "/" to "/index.html"
    const filePath = pathname === "/" ? "/index.html" : pathname;
    const safePath = join(publicDir, filePath);

    // Prevent path traversal
    if (!safePath.startsWith(publicDir)) {
      return new Response("Forbidden", { status: 403 });
    }

    const file = Bun.file(safePath);
    if (await file.exists()) {
      const ext = filePath.substring(filePath.lastIndexOf("."));
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      return new Response(file, { headers: { "Content-Type": contentType } });
    }

    return new Response("Not Found", { status: 404 });
  }
});

console.log(`\n======================================================`);
console.log(`🚗 Bom Condutor Real-Time Web Client`);
console.log(`🌐 Servidor a correr em: http://localhost:${server.port}`);
console.log(`🔑 Utilizador configurado: ${EMAIL || "(não configurado)"}`);
console.log(`======================================================\n`);
