import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { environment } from '../environments/environment';

const app = initializeApp(environment.firebase);
const db = getFirestore(app);

// Obtener todos los documentos de médicos
export const getData = async () => {
  const querySnapshot = await getDocs(collection(db, 'medico'));
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Agregar nuevo médico
export const addMedico = async (data: any) => {
  try {
    const docRef = await addDoc(collection(db, 'medico'), data);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding medico: ", error);
    return { success: false, error };
  }
};

// Actualizar médico
export const updateMedico = async (id: string, data: any) => {
  try {
    await updateDoc(doc(db, 'medico', id), data);
    return { success: true };
  } catch (error) {
    console.error("Error updating medico: ", error);
    return { success: false, error };
  }
};

// Eliminar médico
export const deleteMedico = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'medico', id));
    return { success: true };
  } catch (error) {
    console.error("Error deleting medico: ", error);
    return { success: false, error };
  }
};