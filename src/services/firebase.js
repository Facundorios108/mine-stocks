import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, enableIndexedDbPersistence } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAqOZJPxEiPYdhQnjVvNyrnG_EiUS3g4mA",
  authDomain: "mine-stocks-app.firebaseapp.com",
  projectId: "mine-stocks-app",
  storageBucket: "mine-stocks-app.firebasestorage.app",
  messagingSenderId: "287018129612",
  appId: "1:287018129612:web:5e6ed8f408688424320a69"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Enable offline persistence for Firestore
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence failed: Multiple tabs open')
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence not available in this browser')
  }
})

export default app
