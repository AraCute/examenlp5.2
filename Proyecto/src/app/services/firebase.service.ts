import { inject, Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import {
  getAuth,
  signInWithEmailAndPassword,
  updateProfile,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { User } from '../models/user.model';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import {
  getFirestore,
  setDoc,
  doc,
  getDoc,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import { UtilsService } from './utils.service';

// Interfaz para las categorías
export interface Category {
  id?: string;
  name: string;
  icon: string;
  color: string;
  isDefault?: boolean; // Para marcar categorías que no se pueden eliminar
  createdAt?: any;
}

// Interfaz para las notas con categoría
export interface Note {
  id?: string;
  title: string;
  content: string;
  createdAt: any;
  archived?: boolean;
  category?: string;
}

// Interfaz para las tareas
export interface Task {
  id?: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: any;
  completedAt?: any;
  category?: string;
}

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  auth = inject(AngularFireAuth);
  firestore = inject(AngularFirestore);
  utilsSvc = inject(UtilsService);

  // Iconos y colores disponibles para las categorías
  availableIcons: string[] = [
    'document-text', 'person', 'briefcase', 'bulb', 'alarm',
    'heart', 'home', 'car', 'restaurant', 'fitness',
    'school', 'musical-notes', 'camera', 'airplane', 'gift'
  ];

  availableColors: string[] = [
    'primary', 'secondary', 'tertiary', 'success', 'warning',
    'danger', 'medium', 'dark'
  ];

  // Categorías por defecto (se crearán si no existen)
  defaultCategories: Omit<Category, 'id'>[] = [
    { name: 'General', icon: 'document-text', color: 'medium', isDefault: true },
    { name: 'Personal', icon: 'person', color: 'primary', isDefault: false },
    { name: 'Trabajo', icon: 'briefcase', color: 'success', isDefault: false },
    { name: 'Ideas', icon: 'bulb', color: 'warning', isDefault: false },
    { name: 'Recordatorios', icon: 'alarm', color: 'danger', isDefault: false },
  ];

  // Autenticacion
  signIn(user: User) {
    return signInWithEmailAndPassword(getAuth(), user.email, user.password);
  }

  getAuth() {
    return getAuth();
  }

  // Crear Usuario
  signUp(user: User) {
    return createUserWithEmailAndPassword(getAuth(), user.email, user.password);
  }

  //Actualizar Usuario
  updateUser(displayName: string) {
    return updateProfile(getAuth().currentUser, { displayName });
  }

  //Recuperar contraseña
  sendRecoveryEmail(email: string) {
    return sendPasswordResetEmail(getAuth(), email);
  }

  //Cerrar sesion
  signOut() {
    getAuth().signOut();
    localStorage.removeItem('user');
    this.utilsSvc.routerLink('/auth');
  }

  //Base de datos
  //Setear un documento
  setDocument(path: string, data: any) {
    return setDoc(doc(getFirestore(), path), data);
  }

  //Obtener un documento
  async getDocument(path: string) {
    return (await getDoc(doc(getFirestore(), path))).data();
  }

  // ==================== GESTIÓN DE CATEGORÍAS ====================

  // Inicializar categorías por defecto para un usuario nuevo
  async initializeDefaultCategories(): Promise<void> {
    const user = getAuth().currentUser;
    if (!user) return;

    const db = getFirestore();
    const categoriesRef = collection(db, `users/${user.uid}/categories`);
    
    // Verificar si ya tiene categorías
    const existingCategories = await getDocs(categoriesRef);
    
    if (existingCategories.empty) {
      // Crear categorías por defecto
      for (const category of this.defaultCategories) {
        await addDoc(categoriesRef, {
          ...category,
          createdAt: serverTimestamp(),
        });
      }
    }
  }

  // Obtener categorías en tiempo real
  getCategories(callback: (categories: Category[]) => void): (() => void) | undefined {
    const user = getAuth().currentUser;
    if (!user) return undefined;

    const db = getFirestore();
    const categoriesRef = collection(db, `users/${user.uid}/categories`);
    const q = query(categoriesRef, orderBy('createdAt', 'asc'));

    return onSnapshot(q, (snapshot) => {
      const categories: Category[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        categories.push({
          id: doc.id,
          name: data['name'],
          icon: data['icon'],
          color: data['color'],
          isDefault: data['isDefault'] || false,
          createdAt: data['createdAt'],
        });
      });
      callback(categories);
    });
  }

  // Crear nueva categoría
  async addCategory(name: string, icon: string, color: string): Promise<any> {
    const user = getAuth().currentUser;
    if (!user) return null;

    const db = getFirestore();
    const categoriesRef = collection(db, `users/${user.uid}/categories`);

    return await addDoc(categoriesRef, {
      name: name.trim(),
      icon: icon,
      color: color,
      isDefault: false,
      createdAt: serverTimestamp(),
    });
  }

  // Actualizar categoría
  async updateCategory(categoryId: string, name: string, icon: string, color: string): Promise<any> {
    const user = getAuth().currentUser;
    if (!user) return null;

    const db = getFirestore();
    const categoryRef = doc(db, `users/${user.uid}/categories/${categoryId}`);

    return await updateDoc(categoryRef, {
      name: name.trim(),
      icon: icon,
      color: color,
    });
  }

  // Eliminar categoría
  async deleteCategory(categoryId: string): Promise<any> {
    const user = getAuth().currentUser;
    if (!user) return null;

    const db = getFirestore();
    const categoryRef = doc(db, `users/${user.uid}/categories/${categoryId}`);

    return await deleteDoc(categoryRef);
  }

  // Verificar si una categoría tiene notas asociadas
  async categoryHasNotes(categoryId: string): Promise<boolean> {
    const user = getAuth().currentUser;
    if (!user) return false;

    const db = getFirestore();
    const notesRef = collection(db, `users/${user.uid}/notes`);
    const snapshot = await getDocs(notesRef);
    
    let hasNotes = false;
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data['category'] === categoryId) {
        hasNotes = true;
      }
    });
    
    return hasNotes;
  }

  // Verificar si el nombre de categoría ya existe
  async categoryNameExists(name: string, excludeId?: string): Promise<boolean> {
    const user = getAuth().currentUser;
    if (!user) return false;

    const db = getFirestore();
    const categoriesRef = collection(db, `users/${user.uid}/categories`);
    const snapshot = await getDocs(categoriesRef);
    
    const trimmedName = name.trim().toLowerCase();
    let exists = false;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const categoryName = data['name'].toLowerCase();
      
      if (categoryName === trimmedName && doc.id !== excludeId) {
        exists = true;
      }
    });
    
    return exists;
  }

  // Mover notas de una categoría a otra (útil antes de eliminar)
  async moveNotesToCategory(fromCategoryId: string, toCategoryId: string): Promise<void> {
    const user = getAuth().currentUser;
    if (!user) return;

    const db = getFirestore();
    const notesRef = collection(db, `users/${user.uid}/notes`);
    const snapshot = await getDocs(notesRef);
    
    const updatePromises: Promise<any>[] = [];
    
    snapshot.forEach((noteDoc) => {
      const data = noteDoc.data();
      if (data['category'] === fromCategoryId) {
        const noteRef = doc(db, `users/${user.uid}/notes/${noteDoc.id}`);
        updatePromises.push(updateDoc(noteRef, { category: toCategoryId }));
      }
    });
    
    await Promise.all(updatePromises);
  }

  // ==================== GESTIÓN DE TAREAS ====================

  // Obtener tareas en tiempo real
  getTasks(callback: (tasks: Task[]) => void, showCompleted: boolean = false, categoryFilter?: string): (() => void) | undefined {
    const user = getAuth().currentUser;
    if (!user) return undefined;

    const db = getFirestore();
    const tasksRef = collection(db, `users/${user.uid}/tasks`);
    
    // Consulta básica ordenada por fecha de creación
    const q = query(tasksRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const tasks: Task[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const isCompleted = data['completed'] === true;
        const taskCategory = data['category'] || 'general';
        
        // Filtros: completado y categoría
        const matchesCompletedFilter = showCompleted === isCompleted;
        const matchesCategoryFilter = !categoryFilter || categoryFilter === 'all' || taskCategory === categoryFilter;
        
        if (matchesCompletedFilter && matchesCategoryFilter) {
          tasks.push({
            id: doc.id,
            title: data['title'],
            description: data['description'] || '',
            completed: isCompleted,
            createdAt: data['createdAt'],
            completedAt: data['completedAt'],
            category: taskCategory,
          });
        }
      });
      callback(tasks);
    });
  }

  // Buscar tareas
  searchTasks(searchTerm: string, callback: (tasks: Task[]) => void, showCompleted: boolean = false, categoryFilter?: string): (() => void) | undefined {
    const user = getAuth().currentUser;
    if (!user) return undefined;

    const db = getFirestore();
    const tasksRef = collection(db, `users/${user.uid}/tasks`);
    
    const q = query(tasksRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const tasks: Task[] = [];
      const searchTermLower = searchTerm.toLowerCase();
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const isCompleted = data['completed'] === true;
        const taskCategory = data['category'] || 'general';
        
        // Filtros: completado, categoría y búsqueda
        const matchesCompletedFilter = showCompleted === isCompleted;
        const matchesCategoryFilter = !categoryFilter || categoryFilter === 'all' || taskCategory === categoryFilter;
        const matchesSearchFilter = searchTerm === '' || 
          data['title'].toLowerCase().includes(searchTermLower) || 
          (data['description'] && data['description'].toLowerCase().includes(searchTermLower));
        
        if (matchesCompletedFilter && matchesCategoryFilter && matchesSearchFilter) {
          tasks.push({
            id: doc.id,
            title: data['title'],
            description: data['description'] || '',
            completed: isCompleted,
            createdAt: data['createdAt'],
            completedAt: data['completedAt'],
            category: taskCategory,
          });
        }
      });
      callback(tasks);
    });
  }

  // Añadir nueva tarea
  async addTask(title: string, description: string = '', category: string = 'general') {
    const user = getAuth().currentUser;
    if (!user) return null;

    const db = getFirestore();
    const tasksRef = collection(db, `users/${user.uid}/tasks`);

    return await addDoc(tasksRef, {
      title: title,
      description: description,
      completed: false,
      category: category,
      createdAt: serverTimestamp(),
    });
  }

  // Actualizar tarea
  async updateTask(taskId: string, title: string, description: string = '', category?: string) {
    const user = getAuth().currentUser;
    if (!user) return null;

    const db = getFirestore();
    const taskRef = doc(db, `users/${user.uid}/tasks/${taskId}`);

    const updateData: any = {
      title: title,
      description: description,
    };

    if (category) {
      updateData.category = category;
    }

    return await updateDoc(taskRef, updateData);
  }

  // Marcar tarea como completada/no completada
  async toggleTaskCompleted(taskId: string, completed: boolean) {
    const user = getAuth().currentUser;
    if (!user) return null;

    const db = getFirestore();
    const taskRef = doc(db, `users/${user.uid}/tasks/${taskId}`);

    const updateData: any = {
      completed: completed,
    };

    // Si se marca como completada, agregar timestamp
    if (completed) {
      updateData.completedAt = serverTimestamp();
    } else {
      updateData.completedAt = null;
    }

    return await updateDoc(taskRef, updateData);
  }

  // Eliminar tarea
  async deleteTask(taskId: string) {
    const user = getAuth().currentUser;
    if (!user) return null;

    const db = getFirestore();
    const taskRef = doc(db, `users/${user.uid}/tasks/${taskId}`);

    return await deleteDoc(taskRef);
  }

  // ==================== GESTIÓN DE NOTAS (actualizada) ====================

  // Obtener notas (actualizado con filtro de categoría)
  getNotes(callback: (notes: Note[]) => void, showArchived: boolean = false, categoryFilter?: string): (() => void) | undefined {
    const user = getAuth().currentUser;
    if (!user) return undefined;

    const db = getFirestore();
    const notesRef = collection(db, `users/${user.uid}/notes`);
    
    // Consulta básica ordenada por fecha de creación
    const q = query(notesRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const notes: Note[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const isArchived = data['archived'] === true;
        const noteCategory = data['category'] || 'general';
        
        // Filtros: archivado y categoría
        const matchesArchiveFilter = showArchived === isArchived;
        const matchesCategoryFilter = !categoryFilter || categoryFilter === 'all' || noteCategory === categoryFilter;
        
        if (matchesArchiveFilter && matchesCategoryFilter) {
          notes.push({
            id: doc.id,
            title: data['title'],
            content: data['content'],
            createdAt: data['createdAt'],
            archived: isArchived,
            category: noteCategory,
          });
        }
      });
      callback(notes);
    });
  }

  // Buscar notas (actualizado con filtro de categoría)
  searchNotes(searchTerm: string, callback: (notes: Note[]) => void, showArchived: boolean = false, categoryFilter?: string): (() => void) | undefined {
    const user = getAuth().currentUser;
    if (!user) return undefined;

    const db = getFirestore();
    const notesRef = collection(db, `users/${user.uid}/notes`);
    
    const q = query(notesRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const notes: Note[] = [];
      const searchTermLower = searchTerm.toLowerCase();
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const isArchived = data['archived'] === true;
        const noteCategory = data['category'] || 'general';
        
        // Filtros: archivado, categoría y búsqueda
        const matchesArchiveFilter = showArchived === isArchived;
        const matchesCategoryFilter = !categoryFilter || categoryFilter === 'all' || noteCategory === categoryFilter;
        const matchesSearchFilter = searchTerm === '' || 
          data['title'].toLowerCase().includes(searchTermLower) || 
          data['content'].toLowerCase().includes(searchTermLower);
        
        if (matchesArchiveFilter && matchesCategoryFilter && matchesSearchFilter) {
          notes.push({
            id: doc.id,
            title: data['title'],
            content: data['content'],
            createdAt: data['createdAt'],
            archived: isArchived,
            category: noteCategory,
          });
        }
      });
      callback(notes);
    });
  }

  // Añadir nota (actualizado con categoría)
  async addNote(title: string, content: string, category: string = 'general') {
    const user = getAuth().currentUser;
    if (!user) return null;

    const db = getFirestore();
    const notesRef = collection(db, `users/${user.uid}/notes`);

    return await addDoc(notesRef, {
      title: title,
      content: content,
      category: category,
      createdAt: serverTimestamp(),
      archived: false,
    });
  }

  // Actualizar nota (actualizado con categoría)
  async updateNote(noteId: string, title: string, content: string, category?: string) {
    const user = getAuth().currentUser;
    if (!user) return null;

    const db = getFirestore();
    const noteRef = doc(db, `users/${user.uid}/notes/${noteId}`);

    const updateData: any = {
      title: title,
      content: content,
    };

    if (category) {
      updateData.category = category;
    }

    return await updateDoc(noteRef, updateData);
  }

  // Archivar/Desarchivar nota
  async toggleArchiveNote(noteId: string, archived: boolean) {
    const user = getAuth().currentUser;
    if (!user) return null;

    const db = getFirestore();
    const noteRef = doc(db, `users/${user.uid}/notes/${noteId}`);

    return await updateDoc(noteRef, {
      archived: archived,
    });
  }

  // Eliminar nota
  async deleteNote(noteId: string) {
    const user = getAuth().currentUser;
    if (!user) return null;

    const db = getFirestore();
    const noteRef = doc(db, `users/${user.uid}/notes/${noteId}`);

    return await deleteDoc(noteRef);
  }
}