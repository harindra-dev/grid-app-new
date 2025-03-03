import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SimpleGridPaginationComponent } from './simple-grid-pagination.component';

describe('SimpleGridPaginationComponent', () => {
  let component: SimpleGridPaginationComponent;
  let fixture: ComponentFixture<SimpleGridPaginationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SimpleGridPaginationComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SimpleGridPaginationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
