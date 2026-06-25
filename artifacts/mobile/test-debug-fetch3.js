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
  const titles = {};
  snap.forEach(doc => {
    const data = doc.data();
    if (data.userId === "cae718e8-5fc5-454a-870e-ca884b878f16") {
      titles[data.title] = (titles[data.title] || 0) + 1;
    }
  });
  console.log("Titles count for this user:", titles);
}
run().catch(console.error);
