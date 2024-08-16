import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NuevoGastoPage } from './nuevo-gasto.page';

describe('NuevoGastoPage', () => {
  let component: NuevoGastoPage;
  let fixture: ComponentFixture<NuevoGastoPage>;

  beforeEach(async(() => {
    fixture = TestBed.createComponent(NuevoGastoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
