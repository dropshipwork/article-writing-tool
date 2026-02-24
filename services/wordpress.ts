
import { Article, WordPressConfig } from "../types";
import { marked } from 'marked';

export const publishToWordPress = async (article: Article, config: WordPressConfig): Promise<string> => {
  const auth = btoa(`${config.username}:${config.appPassword}`);
  const endpoint = `${config.url.replace(/\/$/, '')}/wp-json/wp/v2/posts`;

  // Convert Markdown to HTML for WordPress
  const htmlContent = marked.parse(article.content);

  const payload: any = {
    title: article.title,
    content: htmlContent,
    slug: article.slug,
    status: article.scheduledAt ? 'future' : 'publish',
    excerpt: article.metaDescription,
    format: 'standard',
    meta: {
      _yoast_wpseo_focuskw: article.focusKeyword || '',
      _yoast_wpseo_metadesc: article.metaDescription || '',
      _yoast_wpseo_title: article.seoTitle || article.title
    }
  };

  if (article.scheduledAt) {
    payload.date = article.scheduledAt;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errorMsg = "Failed to publish to WordPress";
    try {
      const error = await response.json();
      errorMsg = error.message || errorMsg;
    } catch (e) {
      if (response.status === 401) errorMsg = "WordPress Authentication Failed: Check your Application Password and Username.";
      else if (response.status === 403) errorMsg = "WordPress Permission Denied: Your user might not have permission to post.";
      else if (response.status === 404) errorMsg = "WordPress API Not Found: Ensure the URL is correct and REST API is enabled.";
      else if (response.status === 500) errorMsg = "WordPress Server Error: Something went wrong on your website.";
      else errorMsg = `WordPress Error (${response.status}): ${response.statusText}`;
    }
    throw new Error(errorMsg);
  }

  const data = await response.json();
  return data.link;
};
