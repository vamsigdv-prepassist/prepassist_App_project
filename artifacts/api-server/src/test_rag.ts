import { adminAuth, adminDb } from "./lib/firebaseAdmin";

async function main() {
  try {
    const userRecord = await adminAuth.getUserByEmail("business8281@gmail.com");
    const userId = userRecord.uid;
    console.log("Checking notes for User:", userId);

    const snapshot = await adminDb.collection("cloud_notes")
      .where("userId", "==", userId)
      .where("title", "==", "Fundamental Rights Overview")
      .get();

    if (snapshot.empty) {
      console.log("Core note not found!");
      return;
    }

    const coreNote = snapshot.docs[0].data();
    console.log("Found Core Note:", coreNote.title);
    console.log("Has Updates:", coreNote.hasUpdates);
    
    if (coreNote.updatesList && coreNote.updatesList.length > 0) {
      console.log("\n--- UPDATES FOUND ---");
      coreNote.updatesList.forEach((update: any, idx: number) => {
        console.log(`\nUpdate #${idx + 1}`);
        console.log(`Title: ${update.title}`);
        console.log(`Source: ${update.source}`);
        console.log(`Excerpt (Snippet): ${update.excerpt}`);
      });
      console.log("\n---------------------\n");
      console.log("SUCCESS! Raw notes mapping is working perfectly.");
    } else {
      console.log("No updates found in updatesList yet.");
    }

  } catch (e) {
    console.error("Error:", e);
  }
}

main().then(() => process.exit(0));
