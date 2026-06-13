import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

export interface Flashcard {
  id: string;
  topic: string;
  frontText: string;
  backText: string;
  language: "English" | "Hindi";
  createdAt?: any;
}

export async function fetchFlashcards(language: "English" | "Hindi", limitCount: number = 10): Promise<Flashcard[]> {
  try {
    const q = query(
      collection(db, "flashcards"),
      where("language", "==", language)
    );
    const snap = await getDocs(q);
    
    const cards = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Flashcard[];
    
    // Sort descending internally for stability
    cards.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
    
    if (cards.length > 0) {
      return cards.slice(0, limitCount);
    }
  } catch (error) {
    console.error("Crash executing Flashcard fetching natively:", error);
  }

  // Fallback to gorgeous native demo cards if db is empty or failed
  return [
    {
      id: "f1",
      topic: "Polity",
      language: language,
      frontText: language === "English" 
        ? "Which Article of the Indian Constitution gives the Supreme Court the power to review its own judgments?"
        : "भारतीय संविधान का कौन सा अनुच्छेद सर्वोच्च न्यायालय को अपने स्वयं के निर्णयों की समीक्षा करने की शक्ति देता है?",
      backText: language === "English"
        ? "Article 137. It provides that subject to provisions of any law and rules made under Article 145, the Supreme Court has the power to review any judgment pronounced or order made by it."
        : "अनुच्छेद 137. इसके तहत सर्वोच्च न्यायालय को अपने निर्णयों या आदेशों की समीक्षा करने की शक्ति प्राप्त है।",
    },
    {
      id: "f2",
      topic: "History",
      language: language,
      frontText: language === "English"
        ? "Who was the founder of the Indian Association established in 1876?"
        : "1876 में स्थापित इंडियन एसोसिएशन के संस्थापक कौन थे?",
      backText: language === "English"
        ? "Surendranath Banerjee and Ananda Mohan Bose founded the Indian Association to promote the political, intellectual, and material advancement of the people."
        : "सुरेंद्रनाथ बनर्जी और आनंद मोहन बोस।",
    },
    {
      id: "f3",
      topic: "Geography",
      language: language,
      frontText: language === "English"
        ? "What is the primary reason for the formation of the Roaring Forties in the Southern Hemisphere?"
        : "दक्षिणी गोलार्ध में 'रोअरिंग फोर्टीज़' के बनने का मुख्य कारण क्या है?",
      backText: language === "English"
        ? "The uninterrupted ocean span in the Southern Hemisphere between 40° and 50° latitudes allows westerly winds to blow with great force and constancy."
        : "दक्षिणी गोलार्ध में 40° और 50° अक्षांशों के बीच विशाल और निर्बाध महासागर का होना।",
    }
  ];
}
