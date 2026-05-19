
const axios = require('axios');
const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const TurndownService = require('turndown');

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

async function testScrape(url) {
  try {
    console.log(`Testing ${url}...`);
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });

    const dom = new JSDOM(data, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (article) {
      console.log('Title:', article.title);
      console.log('Content Length:', article.content?.length);
      const markdown = turndownService.turndown(article.content || '');
      console.log('Markdown Length:', markdown.length);
      console.log('Snippet:', markdown.substring(0, 200));
    } else {
      console.log('Readability failed.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testScrape('https://news.ycombinator.com');
testScrape('https://www.wikipedia.org');
