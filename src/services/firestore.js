import {
  collection,
  doc,
  addDoc,
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
  const docRef = await addDoc(positionsRef(userId), {
    ...position,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  return docRef.id
}

export async function updatePosition(userId, positionId, updates) {
  const docRef = doc(db, 'users', userId, 'positions', positionId)
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp()
  })
}

export async function deletePosition(userId, positionId) {
  const docRef = doc(db, 'users', userId, 'positions', positionId)
  await deleteDoc(docRef)
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
  await updateDoc(docRef, {
    ...preferences,
    updatedAt: serverTimestamp()
  })
}
