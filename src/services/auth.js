import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'

const googleProvider = new GoogleAuthProvider()

// Create user document in Firestore
async function createUserDocument(user) {
  const userRef = doc(db, 'users', user.uid)
  const userSnap = await getDoc(userRef)

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      displayName: user.displayName || user.email?.split('@')[0] || 'User',
      photoURL: user.photoURL || null,
      preferredCurrency: 'USD',
      preferredDollarType: 'blue',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  }

  return userRef
}

// Google Sign-In
export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider)
  await createUserDocument(result.user)
  return result.user
}

// Email/Password Sign-Up
export async function signUpWithEmail(email, password, displayName) {
  const result = await createUserWithEmailAndPassword(auth, email, password)
  if (displayName) {
    await updateProfile(result.user, { displayName })
  }
  await createUserDocument(result.user)
  return result.user
}

// Email/Password Sign-In
export async function signInWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password)
  return result.user
}

// Sign Out
export async function logout() {
  await signOut(auth)
}

// Auth State Observer
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback)
}

// Get current user
export function getCurrentUser() {
  return auth.currentUser
}
