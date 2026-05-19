import cron from 'node-cron';
import redisClient from '../config/redis';
import { decrypt } from '../utils/crypto';

export const startReminderJob = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const keys = await redisClient.keys('user:*:todos');
      const now = new Date();
      
      for (const key of keys) {
        const data = await redisClient.get(key);
        if (!data) continue;
        
        const todos = JSON.parse(data);
        const reminders = todos.filter((t: any) => {
          if (!t.reminderTime || t.completed) return false;
          const reminderTime = new Date(t.reminderTime);
          // Check if reminder is in the past or within this minute
          return reminderTime <= now;
        });

        if (reminders.length > 0) {
          const userId = key.split(':')[1];
          // In a real app, send an email, push notification, or websocket event
          console.log(`[REMINDER] User ${userId} has ${reminders.length} pending reminders:`);
          reminders.forEach((r: any) => {
             console.log(`  - ${r.title} (Priority: ${r.priority})`);
          });
          
          // Clear reminder so it doesn't trigger again, or mark as reminded.
          const updatedTodos = todos.map((t: any) => {
             if (reminders.some((r: any) => r.id === t.id)) {
                return { ...t, reminderTime: undefined }; // clear to not trigger again
             }
             return t;
          });
          
          await redisClient.set(key, JSON.stringify(updatedTodos));
        }
      }
    } catch (error) {
      console.error('Error running reminder job', error);
    }
  });
  console.log('Reminder cron job started');
};
