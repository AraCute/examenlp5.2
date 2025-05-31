import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.page.html',
  styleUrls: ['./sign-up.page.scss'],
  standalone: false
})
export class SignUpPage implements OnInit {
  form = new FormGroup({
    uid: new FormControl(''),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
    name: new FormControl('', [Validators.required, Validators.minLength(4)])
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
        const res = await this.firebaseSvc.signUp(this.form.value as User);
        await this.firebaseSvc.updateUser(this.form.value.name);
        let uid = res.user.uid;
        this.form.controls.uid.setValue(uid);
        this.setUserInfo(uid);
        this.handleRegistroExitoso(res);
      } catch (error) {
        this.manejarErrorRegistro(error);
      } finally {
        loading.dismiss();
      }
    } else {
      this.marcarFormularioComoTocado(this.form);
    }
  }

  async setUserInfo(uid: string) {
    if (this.form.valid) {
      const loading = await this.utilsSvc.loading();
      await loading.present();
  
      let path = `users/${uid}`;
      delete this.form.value.password;
  
      this.firebaseSvc.setDocument(path, this.form.value).then(async res => {

      this.utilsSvc.saveInLocalStorage('user', this.form.value);
      this.utilsSvc.routerLink('main/home');
      this.form.reset();
  
      }).catch(error => {
        console.log(error);
        this.utilsSvc.presentToast({
          message: error.message,
          duration: 2500,
          color: 'primary',
          position: 'middle',
          icon: 'alert-circle-outline'
        })
      }).finally(() => {
        loading.dismiss();
      });
    }
  }
  

  private handleRegistroExitoso(res: any) {
    // Manejar registro exitoso
    this.utilsSvc.presentToast({
      message: '¡Registro exitoso!',
      duration: 2500,
      color: 'success',
      position: 'middle',
      icon: 'checkmark-circle-outline'
    });
    // Aquí puedes agregar lógica adicional como navegación
  }

  private manejarErrorRegistro(error: any) {
    let mensajeError = 'Ocurrió un error inesperado';

    switch (error.code) {
      case 'auth/email-already-in-use':
        mensajeError = 'Este correo electrónico ya está registrado';
        break;
      case 'auth/invalid-email':
        mensajeError = 'Dirección de correo electrónico inválida';
        break;
      case 'auth/weak-password':
        mensajeError = 'La contraseña es muy débil. Por favor, elige una contraseña más segura';
        break;
      case 'auth/network-request-failed':
        mensajeError = 'Error de red. Por favor, verifica tu conexión';
        break;
      default:
        mensajeError = error.message || 'Registro fallido';
    }

    this.utilsSvc.presentToast({
      message: mensajeError,
      duration: 2500,
      color: 'danger',
      position: 'middle',
      icon: 'alert-circle-outline'
    });

    // Opcional: Registrar el error completo para depuración
    console.error('Error de Registro:', error);
  }

  // Método auxiliar para marcar todos los controles del formulario como tocados
  private marcarFormularioComoTocado(formulario: FormGroup) {
    Object.values(formulario.controls).forEach(control => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.marcarFormularioComoTocado(control);
      }
    });
  }
}