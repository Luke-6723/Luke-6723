// Generates the profile README's SVG assets (light + dark) into ../assets.
// Run: node scripts/generate-assets.mjs
// Needs a GitHub token for the contributions chart: GITHUB_TOKEN, or a logged-in `gh` CLI.
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");
const USER = "Luke-6723";

// TopStats.gg palette.
const THEMES = {
  dark: {
    card: "#0c0e1a", inset: "#080a14", border: "#1c2036", chip: "#161a2c",
    text: "#fafafa", muted: "#a1a1aa", accent: "#8a9de4", link: "#8a9de4", onAccent: "#0c0e1a",
  },
  light: {
    card: "#ffffff", inset: "#f7f7f8", border: "#e4e4e7", chip: "#f1f1f4",
    text: "#09090b", muted: "#71717a", accent: "#8a9de4", link: "#4f63d2", onAccent: "#0c0e1a",
  },
};

const SANS = `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif`;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Generous sans advance-width estimate; text is centred in its box so the slack splits evenly.
const textWidth = (s, size) => s.length * size * 0.58;

const svg = (w, h, title, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<style>text{font-family:${SANS}}</style>
${body}
</svg>
`;

const box = (w, h, fill, stroke, rx) =>
  `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;

// ---------- data ----------
async function monthlyContributions() {
  const token = process.env.GITHUB_TOKEN || execSync("gh auth token", { encoding: "utf8" }).trim();
  const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{weeks{contributionDays{date contributionCount}}}}}}`;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { login: USER } }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(`GitHub API: ${JSON.stringify(json.errors ?? json)}`);
  const byMonth = new Map();
  for (const week of json.data.user.contributionsCollection.contributionCalendar.weeks)
    for (const day of week.contributionDays)
      byMonth.set(day.date.slice(0, 7), (byMonth.get(day.date.slice(0, 7)) ?? 0) + day.contributionCount);
  return [...byMonth].sort(([a], [b]) => a.localeCompare(b)).slice(-12);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthName = (ym) => MONTHS[+ym.slice(5) - 1];

// ---------- header ----------
function header(t, months) {
  const W = 1200, H = 300;
  const total = months.reduce((n, [, c]) => n + c, 0);
  const max = Math.max(...months.map(([, c]) => c));

  const px = 700, py = 40, pw = 456, ph = 220;
  const bx0 = px + 24, bx1 = px + pw - 24, by0 = py + 64, by1 = py + ph - 40;
  const slot = (bx1 - bx0) / months.length;
  const bars = months.map(([, c], i) => {
    const h = Math.max(4, ((by1 - by0) * c) / max);
    return `<rect x="${(bx0 + i * slot + 4).toFixed(1)}" y="${(by1 - h).toFixed(1)}" width="${(slot - 8).toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${t.accent}"/>`;
  }).join("\n  ");
  const labels = [0, Math.floor(months.length / 2), months.length - 1].map((i, j) => {
    const anchor = ["start", "middle", "end"][j];
    const x = j === 0 ? bx0 : j === 2 ? bx1 : bx0 + slot * i + slot / 2;
    return `<text x="${x.toFixed(1)}" y="${by1 + 26}" font-size="14" text-anchor="${anchor}" fill="${t.muted}">${monthName(months[i][0])}</text>`;
  }).join("\n  ");

  const body = `${box(W, H, t.card, t.border, 16)}
<text x="54" y="128" font-size="74" font-weight="800" letter-spacing="-3" fill="${t.text}">Luke Stoodley</text>
<text x="58" y="178" font-size="25" fill="${t.muted}">Full-stack developer · Co-founder of <tspan fill="${t.link}" font-weight="600">TopStats.gg</tspan></text>
<text x="58" y="236" font-size="18" fill="${t.muted}">Westbury, Wiltshire, UK</text>

<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="12" fill="${t.inset}" stroke="${t.border}" stroke-width="1.5"/>
<text x="${bx0}" y="${py + 38}" font-size="18" font-weight="600" fill="${t.text}">${total.toLocaleString("en-GB")} contributions</text>
<text x="${bx1}" y="${py + 38}" font-size="15" text-anchor="end" fill="${t.muted}">last 12 months</text>
  ${bars}
  ${labels}`;
  return svg(W, H, `Luke Stoodley, full-stack developer and co-founder of TopStats.gg. ${total} GitHub contributions in the last 12 months.`, body);
}

// ---------- buttons ----------
function button(t, label, primary) {
  const size = 19, H = 52;
  const W = Math.ceil(textWidth(label, size) + 48);
  const body = primary
    ? `<rect width="${W}" height="${H}" rx="10" fill="${t.accent}"/>
<text x="${W / 2}" y="33" font-size="${size}" font-weight="600" text-anchor="middle" fill="${t.onAccent}">${esc(label)}</text>`
    : `${box(W, H, t.card, t.border, 10)}
<text x="${W / 2}" y="33" font-size="${size}" font-weight="600" text-anchor="middle" fill="${t.text}">${esc(label)}</text>`;
  return svg(W, H, label, body);
}

// ---------- project cards ----------
const ICONS = {
  chart: (c) => `<g fill="${c}"><rect x="2" y="16" width="7" height="12" rx="1.5"/><rect x="12" y="9" width="7" height="19" rx="1.5"/><rect x="22" y="2" width="7" height="26" rx="1.5"/></g>`,
  bot: (c) => `<g fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round"><line x1="15" y1="2" x2="15" y2="7"/><rect x="3" y="7" width="24" height="19" rx="5"/></g><g fill="${c}"><circle cx="10.5" cy="16.5" r="2.4"/><circle cx="19.5" cy="16.5" r="2.4"/></g>`,
  hash: (c) => `<g stroke="${c}" stroke-width="2.8" stroke-linecap="round"><line x1="12" y1="2" x2="9" y2="28"/><line x1="22" y1="2" x2="19" y2="28"/><line x1="4" y1="10" x2="28" y2="10"/><line x1="2" y1="20" x2="26" y2="20"/></g>`,
  db: (c) => `<g fill="none" stroke="${c}" stroke-width="2.6"><ellipse cx="15" cy="6" rx="11" ry="4"/><path d="M4 6v18c0 2.2 4.9 4 11 4s11-1.8 11-4V6"/><path d="M4 15c0 2.2 4.9 4 11 4s11-1.8 11-4"/></g>`,
};

function card(t, p) {
  const W = 600, H = 240, stripY = 180, id = `c${p.slug}`;
  const cellW = (W - 2) / p.tags.length;
  const cells = p.tags.map((tag, i) => {
    const x = 1 + i * cellW;
    return `${i ? `<line x1="${x}" y1="${stripY}" x2="${x}" y2="${H}" stroke="${t.border}" stroke-width="1.5"/>` : ""}
  <text x="${(x + cellW / 2).toFixed(1)}" y="${stripY + 37}" font-size="16" text-anchor="middle" fill="${t.muted}">${esc(tag)}</text>`;
  }).join("\n  ");

  const body = `<defs><clipPath id="${id}"><rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="14"/></clipPath></defs>
<g clip-path="url(#${id})">
  <rect width="${W}" height="${H}" fill="${t.card}"/>
  <rect y="${stripY}" width="${W}" height="${H - stripY}" fill="${t.inset}"/>
  <line x1="0" y1="${stripY}" x2="${W}" y2="${stripY}" stroke="${t.border}" stroke-width="1.5"/>
  ${cells}
</g>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="14" fill="none" stroke="${t.border}" stroke-width="2"/>

<rect x="26" y="28" width="64" height="64" rx="12" fill="${t.chip}"/>
<g transform="translate(43 45)">${ICONS[p.icon](t.accent)}</g>
<text x="108" y="58" font-size="27" font-weight="800" letter-spacing="-.8" fill="${t.text}">${esc(p.title)}</text>
<text x="${W - 28}" y="56" font-size="16" text-anchor="end" fill="${t.muted}">${esc(p.domain)}</text>
${p.desc.map((l, i) => `<text x="108" y="${92 + i * 26}" font-size="18" fill="${t.muted}">${esc(l)}</text>`).join("\n")}`;
  return svg(W, H, `${p.title} (${p.domain}): ${p.desc.join(" ")}`, body);
}

const PROJECTS = [
  {
    slug: "topstats",
    icon: "chart",
    title: "TopStats.gg",
    domain: "topstats.gg",
    desc: ["Analytics for game servers, Discord bots and", "backends. SDKs for 12 languages plus 17", "framework and game integrations."],
    tags: ["TypeScript", "Go", "12 SDKs", "17 integrations"],
  },
  {
    slug: "bots",
    icon: "bot",
    title: "TopStats Bots",
    domain: "bots.topstats.gg",
    desc: ["Stats for Discord bots listed on Top.gg.", "Started out as DBL Statistics in 2020."],
    tags: ["Next.js", "Expo", "Fastify", "TimescaleDB"],
  },
  {
    slug: "servers",
    icon: "hash",
    title: "TopStats Servers",
    domain: "servers.topstats.gg",
    desc: ["Discord server analytics bot. Tracks messages,", "voice activity, joins and leaves, and server", "leaderboards."],
    tags: ["TypeScript", "Discord bot"],
  },
  {
    slug: "trackedpool",
    icon: "db",
    title: "TrackedPool",
    domain: "npm",
    desc: ["Drop-in pg.Pool wrapper that tags each SQL", "query with the function, file and line that", "sent it."],
    tags: ["TypeScript", "PostgreSQL", "npm"],
  },
];

// ---------- skills ----------
const SKILL_COLUMNS = [
  [
    ["Languages", ["TypeScript", "JavaScript", "SQL", "Python", "Go", "PHP", "GraphQL"]],
    ["Frontend", ["React", "Next.js", "React Native", "Expo"]],
    ["Backend", ["Node.js", "Fastify", "Express", "REST APIs", "GraphQL APIs"]],
    ["Testing", ["Cypress", "Browser testing", "QA pipelines", "Pre-commit checks"]],
  ],
  [
    ["Data", ["ClickHouse", "TimescaleDB", "PostgreSQL", "MongoDB", "Grafana"]],
    ["DevOps", ["Docker", "Docker Swarm", "Docker Compose", "CI/CD", "GitHub Actions runners", "Kong Gateway", "Linux", "AWS", "Hetzner"]],
    ["Other", ["Agile", "WordPress", "Plesk", "Cisco firewalls", "Windows domain admin"]],
  ],
];

function skills(t) {
  const W = 1200, pad = 40, colGap = 40, colW = (W - pad * 2 - colGap) / 2;
  const size = 17, chipH = 38, gap = 8;
  const parts = [];
  let H = 0;
  SKILL_COLUMNS.forEach((col, ci) => {
    const x0 = pad + ci * (colW + colGap);
    let y = pad;
    for (const [label, items] of col) {
      parts.push(`<text x="${x0}" y="${y + 14}" font-size="14" font-weight="600" letter-spacing="1.2" fill="${t.muted}">${esc(label.toUpperCase())}</text>`);
      let x = x0, rowY = y + 28;
      for (const item of items) {
        const w = textWidth(item, size) + 28;
        if (x + w > x0 + colW) { x = x0; rowY += chipH + gap; }
        parts.push(`<rect x="${x.toFixed(1)}" y="${rowY}" width="${w.toFixed(1)}" height="${chipH}" rx="8" fill="${t.chip}"/>
<text x="${(x + w / 2).toFixed(1)}" y="${rowY + 25}" font-size="${size}" text-anchor="middle" fill="${t.text}">${esc(item)}</text>`);
        x += w + gap;
      }
      y = rowY + chipH + 30;
    }
    H = Math.max(H, y - 30 + pad);
  });
  const alt = SKILL_COLUMNS.flat().map(([l, i]) => `${l}: ${i.join(", ")}`).join(". ");
  return svg(W, H, alt, `${box(W, H, t.card, t.border, 16)}\n${parts.join("\n")}`);
}

// ---------- write ----------
const months = await monthlyContributions();
mkdirSync(OUT, { recursive: true });
const write = (name, content) => writeFileSync(join(OUT, name), content);
for (const [mode, t] of Object.entries(THEMES)) {
  write(`header-${mode}.svg`, header(t, months));
  write(`skills-${mode}.svg`, skills(t));
  write(`button-site-${mode}.svg`, button(t, "lukestoodley.com →", true));
  write(`button-topstats-${mode}.svg`, button(t, "TopStats.gg", false));
  for (const p of PROJECTS) write(`card-${p.slug}-${mode}.svg`, card(t, p));
}
console.log(`wrote assets to ${OUT}`);
