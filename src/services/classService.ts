import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ClassInfo } from '../types';

export const classService = {
  async getAllClasses(): Promise<ClassInfo[]> {
    const querySnapshot = await getDocs(collection(db, 'classes'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClassInfo));
  },

  async addClass(classInfo: ClassInfo): Promise<void> {
    await setDoc(doc(db, 'classes', classInfo.id), classInfo);
  },

  async updateClass(classInfo: ClassInfo): Promise<void> {
    await updateDoc(doc(db, 'classes', classInfo.id), { ...classInfo });
  },

  async deleteClass(classId: string): Promise<void> {
    await deleteDoc(doc(db, 'classes', classId));
  }
};
