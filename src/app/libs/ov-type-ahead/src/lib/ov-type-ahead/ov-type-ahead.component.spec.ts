import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OvTypeAheadComponent } from './ov-type-ahead.component';

describe('OvTypeAheadComponent', () => {
  let component: OvTypeAheadComponent;
  let fixture: ComponentFixture<OvTypeAheadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OvTypeAheadComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OvTypeAheadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
