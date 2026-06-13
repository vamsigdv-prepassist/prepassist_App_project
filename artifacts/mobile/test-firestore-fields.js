import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";

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
  const q = query(collection(db, "current_affairs"), limit(1));
  const snap = await getDocs(q);
  snap.forEach(doc => console.log("Fields:", Object.keys(doc.data())));
  snap.forEach(doc => console.log("Data:", doc.data()));
}
run().catch(console.error);
