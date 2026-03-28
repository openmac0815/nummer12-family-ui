const fs = require("node:fs");

function normalizeUrl(baseUrl, apiPath) {
  const base = String(baseUrl || "").replace(/\/$/, "");
  const pathPart = String(apiPath || "").startsWith("/") ? apiPath : `/${apiPath || ""}`;
  return `${base}${pathPart}`;
}

function withTimeout(timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeout };
}

function readOpenRouterConfig(env = process.env) {
  return {
    apiKey: env.OPENROUTER_API_KEY || "",
    baseUrl: env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    chatPath: env.OPENROUTER_CHAT_API_PATH || "/chat/completions",
    imageModel: env.OPENROUTER_IMAGE_MODEL || "google/gemini-2.5-flash-image",
    timeoutMs: Number(env.OPENROUTER_TIMEOUT_MS || 90000),
    appName: env.OPENROUTER_APP_NAME || "Nummer12 Family UI",
    httpReferer: env.OPENROUTER_HTTP_REFERER || ""
  };
}

function decodeDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(.+?);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64")
  };
}

function collectImageCandidates(node, acc = []) {
  if (!node) return acc;

  if (typeof node === "string") {
    if (node.startsWith("data:image/") || /^https?:\/\//.test(node)) {
      acc.push({ url: node });
    }
    return acc;
  }

  if (Array.isArray(node)) {
    for (const item of node) collectImageCandidates(item, acc);
    return acc;
  }

  if (typeof node !== "object") return acc;

  if (typeof node.b64_json === "string") {
    acc.push({ dataUrl: `data:image/png;base64,${node.b64_json}` });
  }

  if (typeof node.image_base64 === "string") {
    acc.push({ dataUrl: `data:image/png;base64,${node.image_base64}` });
  }

  if (typeof node.image_url === "string") {
    acc.push({ url: node.image_url });
  }

  if (node.image_url && typeof node.image_url.url === "string") {
    acc.push({ url: node.image_url.url });
  }

  if (typeof node.url === "string" && (node.url.startsWith("data:image/") || /^https?:\/\//.test(node.url))) {
    acc.push({ url: node.url });
  }

  for (const value of Object.values(node)) {
    if (value && typeof value === "object") collectImageCandidates(value, acc);
  }

  return acc;
}

async function materializeImage(candidate) {
  const source = candidate.dataUrl || candidate.url || "";
  if (!source) return null;

  if (source.startsWith("data:image/")) {
    const decoded = decodeDataUrl(source);
    if (!decoded) return null;
    return {
      buffer: decoded.buffer,
      mimeType: decoded.mimeType
    };
  }

  if (/^https?:\/\//.test(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`OpenRouter image fetch failed (${response.status})`);
    }
    const mimeType = response.headers.get("content-type") || "image/png";
    const arrayBuffer = await response.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType
    };
  }

  return null;
}

function extensionForMime(mimeType) {
  const value = String(mimeType || "").toLowerCase();
  if (value.includes("jpeg") || value.includes("jpg")) return "jpg";
  if (value.includes("webp")) return "webp";
  if (value.includes("gif")) return "gif";
  return "png";
}

async function generateImageViaOpenRouter(config, { prompt, referenceImages = [] }) {
  if (!config.apiKey) {
    const error = new Error("OpenRouter API key not configured");
    error.status = 503;
    throw error;
  }

  const url = normalizeUrl(config.baseUrl, config.chatPath);
  const { controller, timeout } = withTimeout(config.timeoutMs);

  try {
    const content = [{ type: "text", text: prompt }];
    for (const image of referenceImages) {
      if (image?.dataUrl) {
        content.push({
          type: "image_url",
          image_url: { url: image.dataUrl }
        });
      }
    }

    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
        ...(config.appName ? { "x-title": config.appName } : {}),
        ...(config.httpReferer ? { "http-referer": config.httpReferer } : {})
      },
      body: JSON.stringify({
        model: config.imageModel,
        modalities: ["image", "text"],
        messages: [
          {
            role: "user",
            content
          }
        ]
      })
    });

    const payloadText = await response.text();
    let payload = null;
    try {
      payload = payloadText ? JSON.parse(payloadText) : null;
    } catch {
      payload = { raw: payloadText };
    }

    if (!response.ok) {
      const message = payload?.error?.message || payload?.error || `OpenRouter error (${response.status})`;
      const error = new Error(String(message));
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    const candidates = collectImageCandidates(payload);
    if (!candidates.length) {
      const error = new Error("OpenRouter returned no image data");
      error.status = 502;
      error.payload = payload;
      throw error;
    }

    const images = [];
    for (const candidate of candidates) {
      const materialized = await materializeImage(candidate);
      if (materialized) images.push(materialized);
    }

    if (!images.length) {
      const error = new Error("OpenRouter image payload could not be decoded");
      error.status = 502;
      error.payload = payload;
      throw error;
    }

    return {
      model: config.imageModel,
      images,
      payload
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  readOpenRouterConfig,
  generateImageViaOpenRouter,
  extensionForMime,
  decodeDataUrl
};
