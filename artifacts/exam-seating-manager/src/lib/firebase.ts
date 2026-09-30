import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD0FUqy1nfSUMWfXkXw8IQ9X7iWfc-74A8",
  authDomain: "seatingarrangement-8e0cb.firebaseapp.com",
  projectId: "seatingarrangement-8e0cb",
  storageBucket: "seatingarrangement-8e0cb.firebasestorage.app",
  messagingSenderId: "688108275064",
  appId: "1:688108275064:web:1de1c58f904bfbe076348d",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);
export const firebaseStorage = getStorage(firebaseApp);