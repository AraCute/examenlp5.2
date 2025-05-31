import { Component, OnInit } from '@angular/core';
import { getData, addMedico, updateMedico, deleteMedico } from 'src/Service/firebaseService';
import { AlertController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-medico',
  templateUrl: './medico.page.html',
  styleUrls: ['./medico.page.scss'],
  standalone: false,
})
export class MedicoPage implements OnInit {
  
  Medico: any[] = [];
  showForm: boolean = false;
  isEditing: boolean = false;
  currentEditId: string = '';

  // Modelo para el formulario
  formData = {
    asignado: '',
    asunto: '',
    descripcion: '',
    estado: 'Pendiente',
    fecha_creacion: ''
  };

  constructor(
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  async getMedico() {
    this.Medico = await getData();
  }

  ngOnInit() {
    this.getMedico();
  }

  // Mostrar formulario para agregar
  showAddForm() {
    this.resetForm();
    this.isEditing = false;
    this.showForm = true;
  }

  // Mostrar formulario para editar
  editMedico(medico: any) {
    this.formData = { ...medico };
    this.currentEditId = medico.id;
    this.isEditing = true;
    this.showForm = true;
  }

  // Resetear formulario
  resetForm() {
    this.formData = {
      asignado: '',
      asunto: '',
      descripcion: '',
      estado: 'Pendiente',
      fecha_creacion: ''
    };
    this.currentEditId = '';
  }

  // Cancelar operación
  cancelOperation() {
    this.showForm = false;
    this.resetForm();
  }

  // Guardar (agregar o editar)
  async saveMedico() {
    if (!this.formData.asunto || !this.formData.descripcion || !this.formData.asignado) {
      this.showToast('Por favor completa todos los campos requeridos', 'warning');
      return;
    }

    // Si no hay fecha, agregar la actual
    if (!this.formData.fecha_creacion) {
      this.formData.fecha_creacion = new Date().toLocaleDateString('es-ES');
    }

    let result;
    if (this.isEditing) {
      result = await updateMedico(this.currentEditId, this.formData);
    } else {
      result = await addMedico(this.formData);
    }

    if (result.success) {
      this.showToast(
        this.isEditing ? 'Ticket médico actualizado exitosamente' : 'Ticket médico agregado exitosamente',
        'success'
      );
      this.getMedico(); // Recargar lista
      this.cancelOperation();
    } else {
      this.showToast('Error al guardar el ticket médico', 'danger');
    }
  }

  // Confirmar eliminación
  async confirmDelete(medico: any) {
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: `¿Estás seguro de que quieres eliminar el ticket "${medico.asunto}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          handler: () => {
            this.deleteMedicoItem(medico.id);
          }
        }
      ]
    });

    await alert.present();
  }

  // Eliminar registro
  async deleteMedicoItem(id: string) {
    const result = await deleteMedico(id);
    
    if (result.success) {
      this.showToast('Ticket médico eliminado exitosamente', 'success');
      this.getMedico(); // Recargar lista
    } else {
      this.showToast('Error al eliminar el ticket médico', 'danger');
    }
  }

  // Mostrar toast
  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: color,
      position: 'top'
    });
    toast.present();
  }
}