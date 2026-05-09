import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore'
import { db } from './firebase'

// ── Positions CRUD ──

function positionsRef(userId) {
  return collection(db, 'users', userId, 'positions')
}

export async function getPositions(userId) {
  const q = query(positionsRef(userId), orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))
}

export async function getPosition(userId, positionId) {
  const docRef = doc(db, 'users', userId, 'positions', positionId)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() }
  }
  return null
}

export async function addPosition(userId, position) {
  const newDocRef = doc(collection(db, 'users', userId, 'positions'))
  
  // Fire and forget, or await it. Since we want fast UI, we can just return the ID
  // and let the promise resolve in the background, but returning the ID immediately.
  // We'll await the setDoc but with a short timeout to not block UI if offline.
  const dataToSave = {
    ...position,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }
  
  // We don't await this so the UI can proceed immediately.
  // Firebase will queue this write and sync it when online.
  setDoc(newDocRef, dataToSave).catch(err => console.error('Error syncing addPosition:', err))
  
  return newDocRef.id
}

export async function updatePosition(userId, positionId, updates) {
  const docRef = doc(db, 'users', userId, 'positions', positionId)
  // Fire and forget
  updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp()
  }).catch(err => console.error('Error syncing updatePosition:', err))
}

export async function deletePosition(userId, positionId) {
  const docRef = doc(db, 'users', userId, 'positions', positionId)
  // Fire and forget
  deleteDoc(docRef).catch(err => console.error('Error syncing deletePosition:', err))
}

// ── User Preferences ──

export async function getUserPreferences(userId) {
  const docRef = doc(db, 'users', userId)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    return docSnap.data()
  }
  return null
}

export async function updateUserPreferences(userId, preferences) {
  const docRef = doc(db, 'users', userId)
  await setDoc(docRef, {
    ...preferences,
    updatedAt: serverTimestamp()
  }, { merge: true })
}
