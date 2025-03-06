import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimpleGridFilterComponent } from './simple-grid-filter.component';

describe('SimpleGridFilterComponent', () => {
  let component: SimpleGridFilterComponent;
  let fixture: ComponentFixture<SimpleGridFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimpleGridFilterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SimpleGridFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
