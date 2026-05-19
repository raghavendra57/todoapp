import axios from 'axios';
import * as cheerio from 'cheerio';

async function test() {
  try {
    const { data } = await axios.get('https://en.wikipedia.org/wiki/Main_Page');
    const $ = cheerio.load(data);
    console.log('OTD Elements found:', $('#mp-otd ul li').length);
    $('#mp-otd ul li').each((i, el) => {
      if (i < 5) console.log(`Suggestion ${i+1}:`, $(el).text().trim());
    });
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}
test();
