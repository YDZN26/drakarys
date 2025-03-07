import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MensajeService {
  private mensajeSource = new BehaviorSubject<string>('');
  mensaje$ = this.mensajeSource.asObservable(); 

  enviarMensaje(mensaje: string) {
    this.mensajeSource.next(mensaje); 
  }
}
