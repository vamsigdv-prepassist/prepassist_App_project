import { initializeApp } from "firebase/app";
import { getFirestore, collectionGroup, getDocs, limit, query } from "firebase/firestore";

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
  const q = query(collectionGroup(db, "notes"), limit(10));
  const snap = await getDocs(q);
  console.log("Documents found in collectionGroup notes:", snap.size);
  snap.forEach(doc => {
    console.log(doc.ref.path, "Fields:", Object.keys(doc.data()), "Title:", doc.data().title);
  });
}
run().catch(console.error);
