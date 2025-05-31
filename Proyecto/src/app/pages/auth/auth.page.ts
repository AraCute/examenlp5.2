import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { User } from 'src/app/models/user.model';
import { FirebaseService } from 'src/app/services/firebase.service';
import { UtilsService } from 'src/app/services/utils.service';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss'],
  standalone: false,
})
export class AuthPage implements OnInit {
  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });

  firebaseSvc = inject(FirebaseService);
  utilsSvc = inject(UtilsService);

  ngOnInit() {}

  async submit() {
    if (this.form.valid) {
      const loading = await this.utilsSvc.loading();
      await loading.present();

      try {
        const res = await this.firebaseSvc.signIn(this.form.value as User);
        this.getUserInfo(res.user.uid);
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
      message: '¡Inicio de sesión exitoso!',
      duration: 2500,
      color: 'success',
      position: 'middle',
      icon: 'checkmark-circle-outline',
    });
    // Aquí puedes agregar navegación o acciones posteriores al login
  }

  private handleLoginError(error: any) {
    let errorMessage = 'Error de inicio de sesión';

    switch (error.code) {
      case 'auth/invalid-credential':
        errorMessage =
          'Credenciales incorrectas. Verifica tu correo y contraseña.';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Demasiados intentos. Por favor, intenta más tarde.';
        break;
      default:
        errorMessage = error.message || 'Error desconocido al iniciar sesión';
    }

    this.utilsSvc.presentToast({
      message: errorMessage,
      duration: 3000,
      color: 'danger',
      position: 'middle',
      icon: 'alert-circle-outline',
    });

    // Registro del error para depuración
    console.error('Error de inicio de sesión:', error);
  }

  // Método para marcar todos los controles como tocados
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  async getUserInfo(uid: string) {
    if (this.form.valid) {
      const loading = await this.utilsSvc.loading();
      await loading.present();

      let path = `users/${uid}`;
      ``;

      this.firebaseSvc
        .getDocument(path)
        .then((user: User) => {
          this.utilsSvc.saveInLocalStorage('user', user);
          this.utilsSvc.routerLink('/home');
          this.form.reset();
          this.utilsSvc.presentToast({
            message: `Bienvenido ${user.name}`,
            duration: 1500,
            color: 'primary',
            position: 'middle',
            icon: 'person-circle-outline',
          });
        })
        .catch((error) => {
          console.log(error);
          this.utilsSvc.presentToast({
            message: error.message,
            duration: 2500,
            color: 'primary',
            position: 'middle',
            icon: 'alert-circle-outline',
          });
        })
        .finally(() => {
          loading.dismiss();
        });
    }
  }
}
