import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCi5nA-ZtNLgVDM0UIJj7cWrPQhulEPy70",
  authDomain: "prepassist-v2.firebaseapp.com",
  projectId: "prepassist-v2",
  storageBucket: "prepassist-v2.firebasestorage.app",
  messagingSenderId: "848376794933",
  appId: "1:848376794933:web:6f10da60d65ccdc470067c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const q = query(collection(db, "cloud_notes"));
  const snap = await getDocs(q);
  console.log("Documents found:", snap.size);
  let count = 0;
  snap.forEach(doc => {
    const data = doc.data();
    if (data.title && data.title.toLowerCase().includes("constitution")) {
      console.log(doc.id, "Title:", data.title, "isStaged:", data.isStaged, "Content length:", data.content?.length, "userId:", data.userId);
      count++;
    }
  });
  console.log("Total matching notes:", count);
}
run().catch(console.error);
