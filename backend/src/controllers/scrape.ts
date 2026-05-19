import { Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export const scrapeSuggestions = async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  
  if (!targetUrl) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    console.log(`[SCRAPER] Scraping (Advanced): ${targetUrl}`);
    const { data } = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 15000,
      maxRedirects: 5
    });

    // Use JSDOM and Readability for high-quality extraction
    const dom = new JSDOM(data, { url: targetUrl });
    const reader = new Readability(dom.window.document);
    let article = reader.parse();

    // If Readability fails or returns very little content, use a more inclusive fallback
    if (!article || (article.content && article.content.length < 200)) {
      const $ = cheerio.load(data);
      
      // Don't remove as much - registration pages often have important info in headers/divs
      $('script, style, noscript, iframe').remove();
      
      const title = $('title').text().trim() || $('h1').first().text().trim() || 'Scraped Page';
      
      // Find the "main" part of the page more intelligently
      const mainContent = $('main, #content, .content, .main, article, .container').first().html() || $('body').html();
      const markdown = turndownService.turndown(mainContent || '');
      
      const suggestions: string[] = [];
      $('h1, h2, h3, label, button').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 2 && text.length < 60 && suggestions.length < 8) {
          if (!suggestions.includes(text)) suggestions.push(text);
        }
      });

      return res.json({
        title,
        url: targetUrl,
        content: markdown.trim().slice(0, 15000),
        suggestions: suggestions.length > 0 ? suggestions : [title, 'View Page']
      });
    }

    // Convert extracted content to Markdown
    const markdown = article.content ? turndownService.turndown(article.content) : '';
    
    // Extract headings for suggestions
    const $ = cheerio.load(article.content || '');
    const suggestions: string[] = [];
    $('h1, h2, h3').each((_, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 3 && text.length < 100 && suggestions.length < 8) {
        suggestions.push(text);
      }
    });

    if (suggestions.length === 0) suggestions.push(article.title || 'Untitled');

    return res.json({ 
      title: article.title || 'Untitled',
      url: targetUrl,
      content: markdown.trim(),
      suggestions: suggestions
    });

  } catch (error: any) {
    console.error(`[SCRAPER] Error: ${error.message}`);
    const status = error.response?.status || 500;
    
    let errorMessage = 'Failed to scrape the URL';
    if (status === 403) errorMessage = 'Access Denied: This site blocks bots.';
    if (error.code === 'ECONNABORTED') errorMessage = 'Timeout: Site took too long.';
    if (targetUrl.includes('google.com/mail')) errorMessage = 'Cannot scrape Gmail: Authentication required.';

    return res.status(status).json({ 
      error: errorMessage,
      details: error.message
    });
  }
};
