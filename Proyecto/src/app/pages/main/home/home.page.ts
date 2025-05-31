import { Component, inject, OnInit, ViewChild } from '@angular/core';
import {
  FirebaseService,
  Note,
  Category,
  Task,
} from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';
import { AlertController, IonModal, MenuController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  EmailAuthProvider,
  getAuth,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  @ViewChild(IonModal) modal: IonModal;

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);
  alertCtrl = inject(AlertController);
  formBuilder = inject(FormBuilder);
  menuCtrl = inject(MenuController);

  notes: Note[] = [];
  tasks: Task[] = [];
  categories: Category[] = [];
  unsubscribe: any;
  tasksUnsubscribe: any;
  categoriesUnsubscribe: any;

  // Propiedades para el modal de notas
  showModal = false;
  noteForm: FormGroup;
  editingNote: Note | null = null;

  // Propiedades para el modal de perfil
  showProfileModal = false;
  profileForm: FormGroup;

  // Propiedades para el modal de cambio de contraseña
  showPasswordModal = false;
  passwordForm: FormGroup;

  // Propiedades para el modal de categorías
  showCategoryModal = false;
  categoryForm: FormGroup;
  editingCategory: Category | null = null;

  // Propiedades para el modal de tareas
  showTaskModal = false;
  taskForm: FormGroup;
  editingTask: Task | null = null;

  // Propiedades para búsqueda, archivo y categorías
  searchTerm: string = '';
  showArchived: boolean = false;
  showCompleted: boolean = false;
  isSearching: boolean = false;
  selectedCategory: string = 'all';
  currentView: 'notes' | 'tasks' = 'notes';

  currentUser: any = null;

  // Iconos y colores disponibles
  availableIcons: string[] = [];
  availableColors: string[] = [];

  constructor() {
    // Inicializar el formulario de notas (actualizado con categoría)
    this.noteForm = this.formBuilder.group({
      title: ['', [Validators.required]],
      content: ['', [Validators.required]],
      category: ['', [Validators.required]],
    });

    // Inicializar el formulario de perfil
    this.profileForm = this.formBuilder.group({
      displayName: ['', [Validators.required]],
      email: [{ value: '', disabled: true }],
    });

    // Inicializar el formulario de cambio de contraseña
    this.passwordForm = this.formBuilder.group(
      {
        currentPassword: ['', [Validators.required]],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      {
        validators: this.passwordsMatchValidator,
      }
    );

    // Inicializar el formulario de categorías
    this.categoryForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      icon: ['document-text', [Validators.required]],
      color: ['primary', [Validators.required]],
    });

    // Inicializar el formulario de tareas
    this.taskForm = this.formBuilder.group({
      title: ['', [Validators.required]],
      description: [''],
      category: ['', [Validators.required]],
    });
  }

  // Validador personalizado para comprobar que las contraseñas coinciden
  passwordsMatchValidator(formGroup: FormGroup) {
    const newPassword = formGroup.get('newPassword')?.value;
    const confirmPassword = formGroup.get('confirmPassword')?.value;

    if (newPassword === confirmPassword) {
      return null;
    } else {
      return { passwordsNotMatch: true };
    }
  }

  async ngOnInit() {
    // Cargar iconos y colores disponibles
    this.availableIcons = this.firebaseSvc.availableIcons;
    this.availableColors = this.firebaseSvc.availableColors;

    // Inicializar categorías por defecto si es necesario
    await this.firebaseSvc.initializeDefaultCategories();

    // Cargar categorías
    this.loadCategories();

    // Cargar datos del usuario actual
    this.currentUser = this.firebaseSvc.getAuth().currentUser;
    if (this.currentUser) {
      this.profileForm.patchValue({
        displayName: this.currentUser.displayName || '',
        email: this.currentUser.email || '',
      });
    }
  }

  ngOnDestroy() {
    // Cancelar las suscripciones cuando se destruye el componente
    if (this.unsubscribe) this.unsubscribe();
    if (this.tasksUnsubscribe) this.tasksUnsubscribe();
    if (this.categoriesUnsubscribe) this.categoriesUnsubscribe();
  }

  // Cargar categorías
  loadCategories() {
    if (this.categoriesUnsubscribe) this.categoriesUnsubscribe();

    this.categoriesUnsubscribe = this.firebaseSvc.getCategories(
      (categories) => {
        this.categories = categories;

        // Si no hay categoría seleccionada o la categoría seleccionada no existe, seleccionar 'all'
        if (
          this.selectedCategory !== 'all' &&
          !this.categories.find((cat) => cat.id === this.selectedCategory)
        ) {
          this.selectedCategory = 'all';
        }

        // Cargar notas y tareas después de cargar categorías
        this.loadNotes();
        this.loadTasks();
      }
    );
  }

  // Cargar notas (actualizado con filtro de categoría)
  loadNotes() {
    if (this.unsubscribe) this.unsubscribe();

    const categoryFilter =
      this.selectedCategory === 'all' ? undefined : this.selectedCategory;

    if (this.isSearching && this.searchTerm.trim() !== '') {
      // Si está buscando, usar el método de búsqueda
      this.unsubscribe = this.firebaseSvc.searchNotes(
        this.searchTerm,
        (notes) => {
          this.notes = notes;
        },
        this.showArchived,
        categoryFilter
      );
    } else {
      // Si no está buscando, mostrar todas las notas filtradas por categoría
      this.unsubscribe = this.firebaseSvc.getNotes(
        (notes) => {
          this.notes = notes;
        },
        this.showArchived,
        categoryFilter
      );
    }
  }

  // Cargar tareas (similar a cargar notas)
  loadTasks() {
    if (this.tasksUnsubscribe) this.tasksUnsubscribe();

    const categoryFilter =
      this.selectedCategory === 'all' ? undefined : this.selectedCategory;

    if (this.isSearching && this.searchTerm.trim() !== '') {
      // Si está buscando, usar el método de búsqueda
      this.tasksUnsubscribe = this.firebaseSvc.searchTasks(
        this.searchTerm,
        (tasks) => {
          this.tasks = tasks;
        },
        this.showCompleted,
        categoryFilter
      );
    } else {
      // Si no está buscando, mostrar todas las tareas filtradas por categoría
      this.tasksUnsubscribe = this.firebaseSvc.getTasks(
        (tasks) => {
          this.tasks = tasks;
        },
        this.showCompleted,
        categoryFilter
      );
    }
  }

  // Método para buscar (actualizado para incluir tareas)
  searchNotes() {
    this.isSearching = this.searchTerm.trim() !== '';
    this.loadNotes();
    this.loadTasks();
  }

  // Método para limpiar búsqueda (actualizado)
  clearSearch() {
    this.searchTerm = '';
    this.isSearching = false;
    this.loadNotes();
    this.loadTasks();
  }

  // Método para alternar entre notas activas y archivadas (actualizado)
  toggleArchivedView() {
    this.loadNotes();
  }

  // Método para alternar entre tareas completadas y pendientes
  toggleCompletedView() {
    this.loadTasks();
  }

  // Método para cambiar categoría seleccionada (actualizado)
  selectCategory(categoryId: string) {
    this.selectedCategory = categoryId;
    this.loadNotes();
    this.loadTasks();
    this.menuCtrl.close(); // Cerrar el menú después de seleccionar
  }

  // Método para cambiar vista entre notas y tareas
  switchView(event: any) {
  const view = event?.detail?.value || event;
  if (view === 'notes' || view === 'tasks') {
    this.currentView = view as 'notes' | 'tasks';
  }
}

  // Obtener el nombre de la categoría actual
  getCurrentCategoryName(): string {
    if (this.selectedCategory === 'all') return 'Todas las categorías';
    const category = this.categories.find(
      (cat) => cat.id === this.selectedCategory
    );
    return category ? category.name : 'General';
  }

  // Obtener la categoría de una nota
  getNoteCategory(note: Note): Category {
    const categoryId = note.category;
    const category = this.categories.find((cat) => cat.id === categoryId);

    // Si no encuentra la categoría, usar la primera disponible
    return (
      category ||
      this.categories[0] || {
        id: 'general',
        name: 'General',
        icon: 'document-text',
        color: 'medium',
      }
    );
  }

  // ==================== GESTIÓN DE TAREAS ====================

  // Mostrar modal para añadir tarea
  addTask() {
    this.editingTask = null;
    this.taskForm.reset();

    // Establecer la categoría por defecto
    const defaultCategory =
      this.selectedCategory !== 'all'
        ? this.selectedCategory
        : this.categories[0]?.id || 'general';
    this.taskForm.patchValue({ category: defaultCategory });
    this.showTaskModal = true;
  }

  // Mostrar modal para editar tarea
  editTask(task: Task) {
    this.editingTask = task;
    this.taskForm.patchValue({
      title: task.title,
      description: task.description || '',
      category: task.category || this.categories[0]?.id || 'general',
    });
    this.showTaskModal = true;
  }

  // Cerrar modal de tareas
  cancelTask() {
    this.showTaskModal = false;
    this.taskForm.reset();
  }

  // Guardar tarea (crear o actualizar)
  async saveTask() {
    if (this.taskForm.invalid) return;

    const title = this.taskForm.value.title;
    const description = this.taskForm.value.description || '';
    const category = this.taskForm.value.category;

    try {
      if (this.editingTask && this.editingTask.id) {
        // Actualizar tarea existente
        await this.firebaseSvc.updateTask(
          this.editingTask.id,
          title,
          description,
          category
        );
        this.utilsSvc.presentToast({
          message: 'Tarea actualizada correctamente',
          duration: 1500,
          color: 'success',
          position: 'middle',
        });
      } else {
        // Crear nueva tarea
        await this.firebaseSvc.addTask(title, description, category);
        this.utilsSvc.presentToast({
          message: 'Tarea creada correctamente',
          duration: 1500,
          color: 'success',
          position: 'middle',
        });
      }

      // Cerrar modal y resetear formulario
      this.showTaskModal = false;
      this.taskForm.reset();
    } catch (error) {
      console.log(error);
      this.utilsSvc.presentToast({
        message: this.editingTask
          ? 'Error al actualizar la tarea'
          : 'Error al crear la tarea',
        duration: 1500,
        color: 'danger',
        position: 'middle',
      });
    }
  }

  // Marcar/desmarcar tarea como completada
  async toggleTaskCompleted(task: Task) {
    try {
      await this.firebaseSvc.toggleTaskCompleted(task.id!, !task.completed);

      const message = task.completed
        ? 'Tarea marcada como pendiente'
        : 'Tarea completada ✓';

      this.utilsSvc.presentToast({
        message: message,
        duration: 1500,
        color: task.completed ? 'warning' : 'success',
        position: 'middle',
      });
    } catch (error) {
      console.log(error);

      this.utilsSvc.presentToast({
        message: 'Error al actualizar la tarea',
        duration: 1500,
        color: 'danger',
        position: 'middle',
      });
    }
  }

  // Eliminar tarea
  async deleteTask(taskId: string) {
    const alert = await this.alertCtrl.create({
      header: '¿Eliminar esta tarea?',
      message: 'Esta acción no se puede deshacer.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Eliminar',
          handler: async () => {
            try {
              await this.firebaseSvc.deleteTask(taskId);
              this.utilsSvc.presentToast({
                message: 'Tarea eliminada correctamente',
                duration: 1500,
                color: 'success',
                position: 'middle',
              });
            } catch (error) {
              console.log(error);
              this.utilsSvc.presentToast({
                message: 'Error al eliminar la tarea',
                duration: 1500,
                color: 'danger',
                position: 'middle',
              });
            }
          },
        },
      ],
    });

    await alert.present();
  }

  // Obtener la categoría de una tarea
  getTaskCategory(task: Task): Category {
    const categoryId = task.category;
    const category = this.categories.find((cat) => cat.id === categoryId);

    // Si no encuentra la categoría, usar la primera disponible
    return (
      category ||
      this.categories[0] || {
        id: 'general',
        name: 'General',
        icon: 'document-text',
        color: 'medium',
      }
    );
  }

  // ==================== GESTIÓN DE NOTAS ====================

  // Mostrar modal para añadir nota
  addNote() {
    this.editingNote = null;
    this.noteForm.reset();

    // Establecer la categoría por defecto
    const defaultCategory =
      this.selectedCategory !== 'all'
        ? this.selectedCategory
        : this.categories[0]?.id || 'general';
    this.noteForm.patchValue({ category: defaultCategory });
    this.showModal = true;
  }

  // Mostrar modal para editar nota
  editNote(note: Note) {
    this.editingNote = note;
    this.noteForm.patchValue({
      title: note.title,
      content: note.content,
      category: note.category || this.categories[0]?.id || 'general',
    });
    this.showModal = true;
  }

  // Cerrar modal
  cancelNote() {
    this.showModal = false;
    this.noteForm.reset();
  }

  // Guardar nota (actualizado con categoría)
  async saveNote() {
    if (this.noteForm.invalid) return;

    const title = this.noteForm.value.title;
    const content = this.noteForm.value.content;
    const category = this.noteForm.value.category;

    try {
      if (this.editingNote && this.editingNote.id) {
        // Actualizar nota existente
        await this.firebaseSvc.updateNote(
          this.editingNote.id,
          title,
          content,
          category
        );
        this.utilsSvc.presentToast({
          message: 'Nota actualizada correctamente',
          duration: 1500,
          color: 'success',
          position: 'middle',
        });
      } else {
        // Crear nueva nota
        await this.firebaseSvc.addNote(title, content, category);
        this.utilsSvc.presentToast({
          message: 'Nota creada correctamente',
          duration: 1500,
          color: 'success',
          position: 'middle',
        });
      }

      // Cerrar modal y resetear formulario
      this.showModal = false;
      this.noteForm.reset();
    } catch (error) {
      console.log(error);
      this.utilsSvc.presentToast({
        message: this.editingNote
          ? 'Error al actualizar la nota'
          : 'Error al crear la nota',
        duration: 1500,
        color: 'danger',
        position: 'middle',
      });
    }
  }

  // Archivar o desarchivar nota
  async toggleArchiveNote(note: Note) {
    try {
      await this.firebaseSvc.toggleArchiveNote(note.id, !note.archived);

      const message = note.archived
        ? 'Nota restaurada correctamente'
        : 'Nota archivada correctamente';

      this.utilsSvc.presentToast({
        message: message,
        duration: 1500,
        color: 'success',
        position: 'middle',
      });
    } catch (error) {
      console.log(error);

      const errorMessage = note.archived
        ? 'Error al restaurar la nota'
        : 'Error al archivar la nota';

      this.utilsSvc.presentToast({
        message: errorMessage,
        duration: 1500,
        color: 'danger',
        position: 'middle',
      });
    }
  }

  // Eliminar nota
  async deleteNote(noteId: string) {
    const alert = await this.alertCtrl.create({
      header: '¿Eliminar esta nota?',
      message: 'Esta acción no se puede deshacer.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Eliminar',
          handler: async () => {
            try {
              await this.firebaseSvc.deleteNote(noteId);
              this.utilsSvc.presentToast({
                message: 'Nota eliminada correctamente',
                duration: 1500,
                color: 'success',
                position: 'middle',
              });
            } catch (error) {
              console.log(error);
              this.utilsSvc.presentToast({
                message: 'Error al eliminar la nota',
                duration: 1500,
                color: 'danger',
                position: 'middle',
              });
            }
          },
        },
      ],
    });

    await alert.present();
  }

  // ==================== GESTIÓN DE CATEGORÍAS ====================

  // Mostrar modal para añadir categoría
  addCategory() {
    this.editingCategory = null;
    this.categoryForm.reset();
    this.categoryForm.patchValue({
      icon: 'document-text',
      color: 'primary',
    });
    this.showCategoryModal = true;
  }

  // Mostrar modal para editar categoría
  editCategory(category: Category) {
    this.editingCategory = category;
    this.categoryForm.patchValue({
      name: category.name,
      icon: category.icon,
      color: category.color,
    });
    this.showCategoryModal = true;
  }

  // Cerrar modal de categoría
  cancelCategory() {
    this.showCategoryModal = false;
    this.categoryForm.reset();
    this.editingCategory = null;
  }

  // Guardar categoría
  async saveCategory() {
    if (this.categoryForm.invalid) return;

    const name = this.categoryForm.value.name;
    const icon = this.categoryForm.value.icon;
    const color = this.categoryForm.value.color;

    try {
      // Verificar si el nombre ya existe
      const nameExists = await this.firebaseSvc.categoryNameExists(
        name,
        this.editingCategory?.id
      );

      if (nameExists) {
        this.utilsSvc.presentToast({
          message: 'Ya existe una categoría con ese nombre',
          duration: 2000,
          color: 'warning',
          position: 'middle',
        });
        return;
      }

      if (this.editingCategory && this.editingCategory.id) {
        // Actualizar categoría existente
        await this.firebaseSvc.updateCategory(
          this.editingCategory.id,
          name,
          icon,
          color
        );
        this.utilsSvc.presentToast({
          message: 'Categoría actualizada correctamente',
          duration: 1500,
          color: 'success',
          position: 'middle',
        });
      } else {
        // Crear nueva categoría
        await this.firebaseSvc.addCategory(name, icon, color);
        this.utilsSvc.presentToast({
          message: 'Categoría creada correctamente',
          duration: 1500,
          color: 'success',
          position: 'middle',
        });
      }

      // Cerrar modal y resetear formulario
      this.showCategoryModal = false;
      this.categoryForm.reset();
      this.editingCategory = null;
    } catch (error) {
      console.log(error);
      this.utilsSvc.presentToast({
        message: this.editingCategory
          ? 'Error al actualizar la categoría'
          : 'Error al crear la categoría',
        duration: 1500,
        color: 'danger',
        position: 'middle',
      });
    }
  }

  // Eliminar categoría
  async deleteCategory(category: Category) {
    // No permitir eliminar categorías por defecto
    if (category.isDefault) {
      this.utilsSvc.presentToast({
        message: 'No se puede eliminar esta categoría',
        duration: 2000,
        color: 'warning',
        position: 'middle',
      });
      return;
    }

    // Verificar si la categoría tiene notas asociadas
    const hasNotes = await this.firebaseSvc.categoryHasNotes(category.id!);

    if (hasNotes) {
      // Mostrar opciones para mover las notas
      this.showMoveNotesAlert(category);
    } else {
      // Eliminar directamente si no tiene notas
      this.showDeleteCategoryAlert(category);
    }
  }

  // Alert para mover notas antes de eliminar categoría
  async showMoveNotesAlert(category: Category) {
    const otherCategories = this.categories.filter(
      (cat) => cat.id !== category.id
    );

    const alert = await this.alertCtrl.create({
      header: 'Categoría con notas',
      message: `La categoría "${category.name}" tiene notas asociadas. ¿A qué categoría quieres moverlas?`,
      inputs: otherCategories.map((cat) => ({
        type: 'radio',
        label: cat.name,
        value: cat.id,
        checked: cat.isDefault || false,
      })),
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Mover y Eliminar',
          handler: async (selectedCategoryId) => {
            if (selectedCategoryId) {
              try {
                // Mover notas a la nueva categoría
                await this.firebaseSvc.moveNotesToCategory(
                  category.id!,
                  selectedCategoryId
                );

                // Eliminar la categoría
                await this.firebaseSvc.deleteCategory(category.id!);

                this.utilsSvc.presentToast({
                  message: 'Categoría eliminada y notas movidas correctamente',
                  duration: 2000,
                  color: 'success',
                  position: 'middle',
                });
              } catch (error) {
                console.log(error);
                this.utilsSvc.presentToast({
                  message: 'Error al eliminar la categoría',
                  duration: 1500,
                  color: 'danger',
                  position: 'middle',
                });
              }
            }
          },
        },
      ],
    });

    await alert.present();
  }

  // Alert simple para eliminar categoría sin notas
  async showDeleteCategoryAlert(category: Category) {
    const alert = await this.alertCtrl.create({
      header: '¿Eliminar categoría?',
      message: `¿Estás seguro de que quieres eliminar la categoría "${category.name}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Eliminar',
          handler: async () => {
            try {
              await this.firebaseSvc.deleteCategory(category.id!);
              this.utilsSvc.presentToast({
                message: 'Categoría eliminada correctamente',
                duration: 1500,
                color: 'success',
                position: 'middle',
              });
            } catch (error) {
              console.log(error);
              this.utilsSvc.presentToast({
                message: 'Error al eliminar la categoría',
                duration: 1500,
                color: 'danger',
                position: 'middle',
              });
            }
          },
        },
      ],
    });

    await alert.present();
  }

  // ==================== GESTIÓN DE PERFIL Y AUTENTICACIÓN ====================

  // Mostrar modal de perfil
  goToProfile() {
    this.currentUser = this.firebaseSvc.getAuth().currentUser;
    if (this.currentUser) {
      this.profileForm.patchValue({
        displayName: this.currentUser.displayName || '',
        email: this.currentUser.email || '',
      });
    }
    this.showProfileModal = true;
  }

  // Cerrar modal de perfil
  cancelProfile() {
    this.showProfileModal = false;
    // Restaurar los valores originales
    if (this.currentUser) {
      this.profileForm.patchValue({
        displayName: this.currentUser.displayName || '',
        email: this.currentUser.email || '',
      });
    }
  }

  // Guardar cambios del perfil
  async saveProfile() {
    if (this.profileForm.invalid) return;

    const displayName = this.profileForm.value.displayName;

    try {
      // Mostrar loading
      const loading = await this.utilsSvc.loading();
      await loading.present();

      // Actualizar nombre de usuario
      await this.firebaseSvc.updateUser(displayName);

      // Actualizar usuario local
      this.currentUser = this.firebaseSvc.getAuth().currentUser;

      // Cerrar loading
      await loading.dismiss();

      // Mostrar mensaje de éxito
      this.utilsSvc.presentToast({
        message: 'Perfil actualizado correctamente',
        duration: 1500,
        color: 'success',
        position: 'middle',
      });

      // Cerrar modal
      this.showProfileModal = false;
    } catch (error) {
      console.log(error);
      this.utilsSvc.presentToast({
        message: 'Error al actualizar el perfil',
        duration: 1500,
        color: 'danger',
        position: 'middle',
      });
    }
  }

  // Mostrar modal de cambio de contraseña
  goToChangePassword() {
    this.passwordForm.reset();
    this.showPasswordModal = true;
  }

  // Cerrar modal de cambio de contraseña
  cancelPasswordChange() {
    this.showPasswordModal = false;
    this.passwordForm.reset();
  }

  // Guardar nueva contraseña
  async saveNewPassword() {
    if (this.passwordForm.invalid) return;

    const currentPassword = this.passwordForm.value.currentPassword;
    const newPassword = this.passwordForm.value.newPassword;

    // Mostrar loading
    const loading = await this.utilsSvc.loading();
    await loading.present();

    try {
      // Obtener usuario actual
      const user = this.firebaseSvc.getAuth().currentUser;
      const email = user.email;

      // Reautenticar al usuario con su contraseña actual
      const credential = EmailAuthProvider.credential(email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Actualizar la contraseña
      await updatePassword(user, newPassword);

      // Mostrar mensaje de éxito
      this.utilsSvc.presentToast({
        message: 'Contraseña actualizada correctamente',
        duration: 1500,
        color: 'success',
        position: 'middle',
      });

      // Cerrar modal
      this.showPasswordModal = false;
    } catch (error) {
      console.log(error);

      let errorMessage = 'Error al actualizar la contraseña';

      // Verificar el tipo de error para un mensaje más específico
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'La contraseña actual es incorrecta';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage =
          'Por razones de seguridad, debes iniciar sesión nuevamente';
        // Opcionalmente, puedes cerrar la sesión y redirigir al login
        this.firebaseSvc.signOut();
      }

      this.utilsSvc.presentToast({
        message: errorMessage,
        duration: 2000,
        color: 'danger',
        position: 'middle',
      });
    } finally {
      // Cerrar loading tanto si hay éxito como si hay error
      await loading.dismiss();
    }
  }

  // Helper para obtener color hexadecimal
  getColorHex(colorName: string): string {
    const colorMap: { [key: string]: string } = {
      primary: '#3880ff',
      secondary: '#3dc2ff',
      tertiary: '#5260ff',
      success: '#2dd36f',
      warning: '#ffc409',
      danger: '#eb445a',
      medium: '#92949c',
      dark: '#222428',
    };
    return colorMap[colorName] || '#92949c';
  }

  // Cerrar sesión
  signOut() {
    this.firebaseSvc.signOut();
  }
}
