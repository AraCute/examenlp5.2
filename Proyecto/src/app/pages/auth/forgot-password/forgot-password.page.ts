import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: false
})
export class ForgotPasswordPage implements OnInit {

  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);

  ngOnInit() {
  }

  async submit() {
    if (this.form.valid) {
      const loading = await this.utilsSvc.loading();
      await loading.present();

      try {
        const res = await this.firebaseSvc.sendRecoveryEmail(this.form.value.email);
        this.handleSuccessfulLogin(res);
      } catch (error) {
        this.handleLoginError(error);
      } finally {
        loading.dismiss();
      }
    } else {
      this.markFormGroupTouched(this.form);
    }
  }

  private handleSuccessfulLogin(res: any) {
    this.utilsSvc.presentToast({
      message: '¡Los pasos para recuperar su cuenta ya fueron enviadas!',
      duration: 2500,
      color: 'success',
      position: 'middle',
      icon: 'checkmark-circle-outline'
    });
    // Aquí puedes agregar navegación o acciones posteriores al login
  }

  private handleLoginError(error: any) {
    let errorMessage = 'Error al recuperar correo';

    switch (error.code) {
      case 'auth/invalid-credential':
        errorMessage = 'Credenciales incorrectas. Verifica tu correo.';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Demasiados intentos. Por favor, intenta más tarde.';
        break;
      default:
        errorMessage = error.message || 'Error desconocido';
    }

    this.utilsSvc.presentToast({
      message: errorMessage,
      duration: 3000,
      color: 'danger',
      position: 'middle',
      icon: 'alert-circle-outline'
    });

    // Registro del error para depuración
    console.error('Error de inicio de sesión:', error);
  }

  // Método para marcar todos los controles como tocados
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  
}