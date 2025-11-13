import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VentaLibrePage } from './venta-libre.page';

describe('VentaLibrePage', () => {
  let component: VentaLibrePage;
  let fixture: ComponentFixture<VentaLibrePage>;

  beforeEach(async(() => {
    fixture = TestBed.createComponent(VentaLibrePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
