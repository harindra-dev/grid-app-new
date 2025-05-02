import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OvPortalUiComponent } from './ov-portal-ui.component';

describe('OvPortalUiComponent', () => {
  let component: OvPortalUiComponent;
  let fixture: ComponentFixture<OvPortalUiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OvPortalUiComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OvPortalUiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
