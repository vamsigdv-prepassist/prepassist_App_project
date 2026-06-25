import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

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
  const userId = "cae718e8-5fc5-454a-870e-ca884b878f16";
  const q = query(collection(db, "cloud_notes"), where("userId", "==", userId));
  const snap = await getDocs(q);
  snap.forEach(doc => {
    const data = doc.data();
    if (data.title && data.title.includes("Repo Rate impact")) {
      console.log("Title:", data.title);
      console.log("Content:", data.content);
    }
  });
}
run().catch(console.error);
