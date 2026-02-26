// services/gemini.ts
// FREE version — works with your Vercel API (/api/generate)

async function callAI(prompt: string) {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  const data = await response.json();
  return data.text || "No response";
}

export async function generateArticle(topic: string, length?: string) {
  return callAI(
    `Write a professional SEO article about: ${topic}. Length: ${length || "medium"}`
  );
}

export async function fetchTrendingTopics(niche: string) {
  return callAI(`Give trending blog topics in this niche: ${niche}`);
}

export async function auditAndRewrite(text: string) {
  return callAI(`Improve and rewrite this article professionally:\n${text}`);
}

export async function findKeywords(topic: string) {
  return callAI(`Find SEO keywords for: ${topic}`);
}

export async function generateBlogImage(topic: string) {
  return callAI(`Describe a blog thumbnail image for: ${topic}`);
}

export async function fetchSmartSuggestions(topic: string) {
  return callAI(`Give smart content suggestions for: ${topic}`);
}
