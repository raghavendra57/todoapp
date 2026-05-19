import { Router } from 'express';
import { scrapeSuggestions } from '../controllers/scrape';
import { scrapeEmails } from '../controllers/emailScrape';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, scrapeSuggestions);
router.get('/email', requireAuth, scrapeEmails);

export default router;
