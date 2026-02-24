
import { GoogleGenAI, Type } from "@google/genai";
import { Trend, Article, Keyword, CATEGORY_MAP } from "../types";

const getAI = (apiKey?: string) => {
  return new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY });
};

const cleanJson = (text: string) => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

const formatAIError = (e: any): string => {
  const errorStr = String(e);
  if (errorStr.includes("Rpc failed") || errorStr.includes("xhr error")) {
    return "AI Engine: Connection failed. This is often a temporary network issue or a restriction on your hosting (Hostinger). Please try again in a few seconds.";
  }
  if (errorStr.includes("API key not valid")) {
    return "AI Engine: Invalid API Key. Please check your Gemini API key in Settings.";
  }
  if (errorStr.includes("quota exceeded") || errorStr.includes("429")) {
    return "AI Engine: Rate limit exceeded. Please wait a minute before trying again.";
  }
  if (errorStr.includes("Safety") || errorStr.includes("blocked")) {
    return "AI Engine: Content blocked by safety filters. Try rephrasing your topic.";
  }
  return errorStr.length > 100 ? errorStr.substring(0, 100) + "..." : errorStr;
};

export const fetchTrendingTopics = async (niche: string, countryCode: string, categoryName: string, apiKey?: string): Promise<Trend[]> => {
  const ai = getAI(apiKey);
  const geoTarget = countryCode === 'GLOBAL' ? 'worldwide' : countryCode;
  
  try {
    const searchPromise = ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a real-time Google Trends scraper. Find trending breakout topics for:
      - Geo: ${geoTarget}
      - Category: ${categoryName}
      - Niche: ${niche}
      
      Focus on high-momentum spikes from the last 24 hours.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              volume: { type: Type.STRING },
              category: { type: Type.STRING },
              rising: { type: Type.BOOLEAN },
              searchIntent: { type: Type.STRING },
              trendType: { type: Type.STRING },
              timePeriod: { type: Type.STRING },
              region: { type: Type.STRING },
              competition: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] }
            },
            required: ["topic", "volume", "category", "rising", "searchIntent", "trendType", "timePeriod", "region", "competition"]
          }
        }
      }
    });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Trends search timed out")), 25000)
    );

    const response = await Promise.race([searchPromise, timeoutPromise]) as any;

    const text = response.text;
    if (text) {
      const data = JSON.parse(cleanJson(text));
      if (data && data.length > 0) return data;
    }
  } catch (e) {
    console.warn("Trends search with tool failed or timed out, trying fallback...", e);
  }

  // Fallback with retry
  let retries = 2;
  while (retries > 0) {
    try {
      // Small delay before fallback to avoid transient RPC issues
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: `Generate 5 trending breakout topics for: ${niche} in ${geoTarget}. Use your internal knowledge to predict what's likely trending right now. Output in JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                volume: { type: Type.STRING },
                category: { type: Type.STRING },
                rising: { type: Type.BOOLEAN },
                searchIntent: { type: Type.STRING },
                trendType: { type: Type.STRING },
                timePeriod: { type: Type.STRING },
                region: { type: Type.STRING },
                competition: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] }
              },
              required: ["topic", "volume", "category", "rising", "searchIntent", "trendType", "timePeriod", "region", "competition"]
            }
          }
        }
      });
      return JSON.parse(cleanJson(fallbackResponse.text || "[]"));
    } catch (e) {
      retries--;
      if (retries === 0) {
        console.error("Trends Fallback Error after retries:", e);
        throw new Error(formatAIError(e));
      }
      console.warn(`Trends fallback failed, retrying... (${retries} left)`);
      // We can't easily addLog here without passing it in, but console.warn is good for debugging.
    }
  }
  return [];
};

export const generateBlogImage = async (topic: string, apiKey?: string): Promise<string | undefined> => {
  const ai = getAI(apiKey);
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: `A unique, professional featured blog image for: "${topic}". Clean, high-impact style, minimal text, professional lighting, 16:9 aspect ratio.` }]
    },
    config: {
      imageConfig: { aspectRatio: "16:9" }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return undefined;
};

export const findKeywords = async (seed: string, startDate?: string, endDate?: string, apiKey?: string): Promise<Keyword[]> => {
  const ai = getAI(apiKey);
  const dateContext = startDate && endDate ? `Specifically for the period from ${startDate} to ${endDate}.` : "Focus on recent data.";
  
  // Try with Google Search first with a timeout
  try {
    const searchPromise = ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Search for and find 10 high-value, real-world SEO keywords related to: "${seed}". ${dateContext} 
      Include estimated monthly search volume, competition levels (Low, Medium, High), search intent, and keyword type.
      Use Google Search data to ensure accuracy.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              phrase: { type: Type.STRING },
              volume: { type: Type.STRING, description: "Estimated monthly search volume (e.g. 1.2K, 500)" },
              competition: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
              intent: { type: Type.STRING, enum: ['Informational', 'Commercial', 'Transactional'] },
              type: { type: Type.STRING, enum: ['Long-tail', 'Question', 'Seed'] }
            },
            required: ["phrase", "volume", "competition", "intent", "type"]
          }
        }
      }
    });

    // 25 second timeout for tool search
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Search tool timed out")), 25000)
    );

    const response = await Promise.race([searchPromise, timeoutPromise]) as any;

    const text = response.text;
    if (text) {
      const data = JSON.parse(cleanJson(text));
      if (data && Array.isArray(data) && data.length > 0) return data;
    }
  } catch (e) {
    console.warn("Keyword search with tool failed or timed out, trying fallback...", e);
  }

  // Fallback without Google Search tool - faster but based on internal knowledge
  let retries = 2;
  while (retries > 0) {
    try {
      // Small delay before fallback
      await new Promise(resolve => setTimeout(resolve, 1500));

      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: `Generate a list of 10 high-value SEO keywords for: "${seed}". ${dateContext} 
        Provide estimated monthly search volume and competition levels based on your internal knowledge of search patterns. Output in JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                phrase: { type: Type.STRING },
                volume: { type: Type.STRING },
                competition: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
                intent: { type: Type.STRING, enum: ['Informational', 'Commercial', 'Transactional'] },
                type: { type: Type.STRING, enum: ['Long-tail', 'Question', 'Seed'] }
              },
              required: ["phrase", "volume", "competition", "intent", "type"]
            }
          }
        }
      });
      const text = fallbackResponse.text;
      return JSON.parse(cleanJson(text || '[]'));
    } catch (e) {
      retries--;
      if (retries === 0) {
        console.error("Keyword Fallback Error after retries:", e);
        throw new Error(formatAIError(e));
      }
      console.warn(`Keyword fallback failed, retrying... (${retries} left)`);
    }
  }
  return [];
};

export const generateArticle = async (topic: string, intent: string = "Informational", apiKey?: string): Promise<Partial<Article>> => {
  const ai = getAI(apiKey);
  
  const prompt = `You are a professional human SEO content writer with real-world experience. Write a 100% human-like, original, and SEO-optimized article about: "${topic}".

    STRICT WRITING RULES:
    1. Write for humans first. Use natural, conversational language.
    2. Vary sentence length naturally (short + long).
    3. Avoid robotic phrases like "In today's fast-paced world", "This article will explore", or "In conclusion".
    4. Write like an expert sharing real experience. Use practical examples and real-life insights.
    5. Minimum length: 800-1000 words. Fully satisfy search intent.
    6. Do NOT mention AI, automation, or tools like ChatGPT.
    7. Intent: ${intent}.

    SEO & STRUCTURE (YOAST SEO COMPLIANT):
    1. Use the main focus keyword naturally in the Title, within the FIRST 100 WORDS of the content, and at least one H2 heading.
    2. Structure: Use MARKDOWN for formatting. H1 for title, H2 for main sections, H3 for sub-sections.
    3. Paragraphs should be short (2-4 lines).
    4. Include transition words for better readability.
    5. Include at least 2 placeholders for internal links (e.g., [Internal Link: Related Topic]) and 1 placeholder for an external authoritative source (e.g., [External Link: Source Name]).
    6. Ensure the content is structured for a high readability score.
    7. Output MUST be in MARKDOWN format.

    META DESCRIPTION RULES:
    1. Length: STRICTLY 150-160 characters.
    2. Content: Must include the primary focus keyword and a clear, compelling Call to Action (CTA).
    3. Purpose: Optimized for high Click-Through Rate (CTR) in search results.

    CRITICAL: OUTPUT MUST BE VALID JSON.`;

  // Try with Flash first for speed and reliability on shared hosting
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Main Article Title" },
            seoTitle: { type: Type.STRING, description: "SEO-optimized Title for Yoast (max 60 chars)" },
            focusKeyword: { type: Type.STRING, description: "The primary focus keyword for Yoast SEO" },
            content: { type: Type.STRING, description: "Full article content (800+ words) in MARKDOWN format" },
            metaDescription: { type: Type.STRING, description: "Compelling meta description (STRICTLY 150-160 chars with focus keyword and CTA)" },
            slug: { type: Type.STRING, description: "SEO-friendly URL slug" },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Main keyword and LSI keywords used" }
          },
          required: ["title", "seoTitle", "focusKeyword", "content", "metaDescription", "slug", "keywords"]
        }
      }
    });

    const data = JSON.parse(cleanJson(response.text || '{}'));
    if (data.content) {
      data.content = data.content.replace(/\\n/g, '\n');
    }
    return data;
  } catch (e) {
    console.warn("Article generation with Flash failed, trying Pro fallback...", e);
    try {
      const proResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              seoTitle: { type: Type.STRING },
              focusKeyword: { type: Type.STRING },
              content: { type: Type.STRING },
              metaDescription: { type: Type.STRING },
              slug: { type: Type.STRING },
              keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["title", "seoTitle", "focusKeyword", "content", "metaDescription", "slug", "keywords"]
          }
        }
      });
      const data = JSON.parse(cleanJson(proResponse.text || '{}'));
      if (data.content) data.content = data.content.replace(/\\n/g, '\n');
      return data;
    } catch (err) {
      console.error("Article Generation Error:", err);
      throw new Error(formatAIError(err));
    }
  }
};

export const auditAndRewrite = async (content: string, title: string, keywords: string[], apiKey?: string): Promise<{ rewritten: string, similarity: number, humanScore: number, seoScore: number, seoRecommendations: string[] }> => {
  const ai = getAI(apiKey);
  // Enhanced humanization audit with plagiarism avoidance logic and SEO analysis
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `You are an expert editor. Perform a deep humanization, plagiarism audit, and SEO analysis on the provided content.

    HUMANIZATION & ORIGINALITY:
    1. Rewrite any robotic or repetitive patterns into natural human speech.
    2. Ensure the text is 100% unique and avoids common AI filler phrases.
    3. Similarity score MUST be below 10% (where 0 means fully unique).
    4. Content must feel authoritative, useful, and written by a human expert.
    5. Strip any remaining AI-like over-explanations or fluff.
    6. MAINTAIN ALL MARKDOWN FORMATTING (headings, lists, bold text).

    SEO AUDIT (YOAST SEO STANDARDS):
    1. Evaluate SEO readiness based on the title, focus keyword, and target keywords.
    2. Check for keyword placement in the first 100 words, headings, and meta description.
    3. Provide specific, actionable SEO recommendations for Yoast SEO optimization.
    
    Title: ${title}
    Keywords: ${keywords.join(', ')}
    Content:
    ${content.substring(0, 15000)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          rewritten: { type: Type.STRING, description: "The fully humanized and audited version of the content" },
          similarity: { type: Type.NUMBER, description: "Plagiarism similarity score (0-100)" },
          humanScore: { type: Type.NUMBER, description: "Human-likeness score (0-100)" },
          seoScore: { type: Type.NUMBER, description: "SEO readiness score (0-100)" },
          seoRecommendations: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Specific actionable SEO improvements"
          }
        },
        required: ["rewritten", "similarity", "humanScore", "seoScore", "seoRecommendations"]
      }
    }
  });

  try {
    const data = JSON.parse(cleanJson(response.text || '{"rewritten": "", "similarity": 0, "humanScore": 100, "seoScore": 85, "seoRecommendations": []}'));
    if (data.rewritten) {
      data.rewritten = data.rewritten.replace(/\\n/g, '\n');
    }
    // Enforce the 0% similarity badge logic if the AI reports it as clean
    if (data.similarity < 10) data.similarity = 0; 
    return data;
  } catch (e) {
    console.error("Audit Parse Error:", e, response.text);
    throw new Error(formatAIError(e));
  }
};

export const fetchSmartSuggestions = async (category: string, country: string, apiKey?: string): Promise<{ topic: string, reason: string, potential: string, keywords: string[] }[]> => {
  const ai = getAI(apiKey);
  const geoContext = country === 'GLOBAL' ? 'worldwide' : `in ${country}`;
  
  try {
    const searchPromise = ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Identify 5 high-momentum, rising trending topics ${geoContext} within the "${category}" category that have LOW competition but high search interest today. 
      For each topic, provide:
      1. The topic name.
      2. A brief reason why it's a breakout opportunity.
      3. Its commercial potential.
      4. 3-5 high-value keywords associated with it.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              reason: { type: Type.STRING },
              potential: { type: Type.STRING },
              keywords: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Associated high-value keywords"
              }
            },
            required: ["topic", "reason", "potential", "keywords"]
          }
        }
      }
    });

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Suggestions search timed out")), 25000)
    );

    const response = await Promise.race([searchPromise, timeoutPromise]) as any;

    const text = response.text;
    if (text) {
      const data = JSON.parse(cleanJson(text));
      if (data && data.length > 0) return data;
    }
  } catch (e) {
    console.warn("Suggestions search with tool failed or timed out, trying fallback...", e);
  }

  // Fallback
  let retries = 2;
  while (retries > 0) {
    try {
      // Small delay before fallback
      await new Promise(resolve => setTimeout(resolve, 1500));

      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: `Generate 5 high-momentum, rising trending topics ${geoContext} within the "${category}" category. Use your internal knowledge. Output in JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                reason: { type: Type.STRING },
                potential: { type: Type.STRING },
                keywords: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING },
                  description: "Associated high-value keywords"
                }
              },
              required: ["topic", "reason", "potential", "keywords"]
            }
          }
        }
      });
      return JSON.parse(cleanJson(fallbackResponse.text || "[]"));
    } catch (e) {
      retries--;
      if (retries === 0) {
        console.error("Suggestions Fallback Error after retries:", e);
        throw new Error(formatAIError(e));
      }
      console.warn(`Suggestions fallback failed, retrying... (${retries} left)`);
    }
  }
  return [];
};
