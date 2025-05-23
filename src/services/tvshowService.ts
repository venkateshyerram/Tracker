import { db } from '../config/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs } from 'firebase/firestore';
import { TVShow } from '../types/tvshow';

const COLLECTION_NAME = 'tvshows';

export const tvshowService = {
  async addTVShow(tvshow: Omit<TVShow, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...tvshow,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return docRef.id;
  },

  async updateTVShow(id: string, tvshow: Partial<TVShow>): Promise<void> {
    const tvshowRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(tvshowRef, {
      ...tvshow,
      updatedAt: new Date()
    });
  },

  async deleteTVShow(id: string): Promise<void> {
    const tvshowRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(tvshowRef);
  },

  async getTVShowsByUserId(userId: string): Promise<TVShow[]> {
    const q = query(collection(db, COLLECTION_NAME), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    })) as TVShow[];
  }
}; 