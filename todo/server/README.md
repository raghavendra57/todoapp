To Do Activity Application - Backend API

Requirements
- Node.js 18+
- MongoDB Atlas cluster connection string

Setup
1. Copy .env.example to .env and set MONGODB_URI
   - Example: mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/todo?retryWrites=true&w=majority
   - Optionally set DB_NAME and PORT

2. Install dependencies
   - From this folder: npm install

3. Run the API
   - Development (auto-restart): npx nodemon
   - Production: npm start

4. Test health endpoint
   - Open http://localhost:3000/api/health

Frontend integration
- The frontend reads BASE_API_URL from localStorage key adv_todo_api_base
- In the browser console (on index.html), set:
  localStorage.setItem('adv_todo_api_base', 'http://localhost:3000/api')
  Then refresh the page.

Data model
- Lists collection: { _id, name, createdAt }
- Tasks collection: { _id, listId, title, dueAt, priority, tags[], notes, subtasks[{_id,title,completed}], completed, createdAt }

API Endpoints
- GET /api/health
- GET /api/lists
- POST /api/lists { name }
- PATCH /api/lists/:id { name }
- DELETE /api/lists/:id
- GET /api/lists/:listId/tasks
- POST /api/lists/:listId/tasks { title, dueAt, priority, tags, notes, subtasks[], completed }
- PATCH /api/tasks/:id { ...any updatable fields }
- DELETE /api/tasks/:id

Notes
- The frontend remains offline-first using localStorage; API calls are best-effort and failures are ignored.
- For full server truth and multi-device sync, extend the app to fetch lists/tasks from the API at load and reconcile with local state.
