import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

// Firebase web config is public by design; access is controlled by firestore.rules.
const firebaseConfig = {
  apiKey: 'AIzaSyCRHAIjIr0T9mP2wNu6wcqodYrejLEVYx4',
  authDomain: 'word-adventure-game.firebaseapp.com',
  projectId: 'word-adventure-game',
  storageBucket: 'word-adventure-game.firebasestorage.app',
  messagingSenderId: '143002335260',
  appId: '1:143002335260:web:1e5e12de6930295dd847d9',
}

export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
