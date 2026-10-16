import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

/**
 * Test the connection to Firestore on initialization
 */
async function testConnection() {
  try {
    // Attempt to read a dummy document to verify connectivity/rules
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    // Ignore "not found" errors, as they mean the db is reachable but document is missing
    if (error instanceof Error && !error.message.includes('not found')) {
      console.error("Firestore connection issue:", error);
    }
  }
}
testConnection();
