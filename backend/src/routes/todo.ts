import { Router } from 'express';
import { getTodos, createTodo, updateTodo, deleteTodo } from '../controllers/todo';
import { requireAuth, requireMFA } from '../middleware/auth';

const router = Router();

// Apply requireAuth and optionally requireMFA
router.use(requireAuth);
// router.use(requireMFA); // You can enforce MFA for all Todo operations

router.get('/', getTodos);
router.post('/', createTodo);
router.put('/:id', updateTodo);
router.delete('/:id', deleteTodo);

export default router;
