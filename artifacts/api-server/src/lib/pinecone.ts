import { Pinecone } from '@pinecone-database/pinecone';

let instance: Pinecone | null = null;

export const pinecone = new Proxy({}, {
  get: (target, prop) => {
    if (!instance) {
      const apiKey = process.env.PINECONE_API_KEY;
      if (!apiKey) {
        throw new Error("PINECONE_API_KEY is completely missing in Environment Variables!");
      }
      try {
        const cleanKey = apiKey.replace(/^["']|["']$/g, '').trim();
        instance = new Pinecone({ apiKey: cleanKey });
      } catch (e: any) {
        throw new Error(`Pinecone SDK crashed during initialization: ${e.message}`);
      }
    }
    return (instance as any)[prop];
  }
}) as Pinecone;
