// Mock Redis Client for In-Memory Storage
const store = new Map<string, string>();

class MockRedisClient {
  isOpen = true;

  async connect() {
    console.log('Connected to In-Memory "Redis" (Mock)');
  }

  async get(key: string): Promise<string | null> {
    return store.get(key) || null;
  }

  async set(key: string, value: string): Promise<void> {
    store.set(key, value);
  }

  async setEx(key: string, seconds: number, value: string): Promise<void> {
    store.set(key, value);
    // Simple mock: delete after timeout
    setTimeout(() => {
      store.delete(key);
    }, seconds * 1000);
  }

  async del(key: string): Promise<void> {
    store.delete(key);
  }

  async keys(pattern: string): Promise<string[]> {
    const matchedKeys: string[] = [];
    const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    
    for (const key of store.keys()) {
      if (regexPattern.test(key)) {
        matchedKeys.push(key);
      }
    }
    return matchedKeys;
  }
}

const client = new MockRedisClient();

export const connectRedis = async () => {
  await client.connect();
};

export default client;
