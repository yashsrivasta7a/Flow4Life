import { initializeApp } from 'firebase/app';

const firebaseConfig = {
   apiKey: "AIzaSyD_9kApMf_AotAlYwvSmgY_hd9cOaFsWx0",
  authDomain: "flow4life.firebaseapp.com",
  projectId: "flow4life",
  storageBucket: "flow4life.firebasestorage.app",
  messagingSenderId: "360337861795",
  appId: "1:360337861795:web:1eace881dd5ef5c0762316",
  measurementId: "G-RCKYFN5NER",
  databaseURL:"https://flow4life-default-rtdb.firebaseio.com/"
};

export const app = initializeApp(firebaseConfig);
