import { useState, useEffect } from 'react';
import { collection, query, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Flashcard {
  id: string;
  topic: string;
  frontText: string;
  backText: string;
  language: string;
}

export function useFirebaseFlashcards(maxCount: number = 10) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCards() {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'flashcards'),
          orderBy('createdAt', 'desc'),
          limit(maxCount)
        );
        
        const querySnapshot = await getDocs(q);
        const fetchedCards: Flashcard[] = [];
        
        querySnapshot.forEach((doc) => {
          fetchedCards.push({ id: doc.id, ...doc.data() } as Flashcard);
        });
        
        setFlashcards(fetchedCards);
        setError(null);
      } catch (err) {
        console.error("Error fetching flashcards:", err);
        setError("Failed to fetch flashcards from Firebase.");
      } finally {
        setLoading(false);
      }
    }

    fetchCards();
  }, [maxCount]);

  return { flashcards, loading, error };
}
