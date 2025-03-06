import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  computed,
  Input,
  input,
  OnInit,
} from '@angular/core';
import { MatSelectModule } from '@angular/material/select';

import { SimpleGridComponent } from '../simple-grid/simple-grid.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-simple-grid-pagination',
  standalone: true,
  imports: [CommonModule, MatSelectModule],
  templateUrl: './simple-grid-pagination.component.html',
  styleUrl: './simple-grid-pagination.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimpleGridPaginationComponent implements OnInit, AfterViewInit {
  // targetGridRef = input.required<SimpleGridComponent>();
  @Input() targetGridRef!: SimpleGridComponent;

  currentPage = computed(() => this.targetGridRef.currentPage());
  pageSize = computed(() => this.targetGridRef.pageSize());
  totalRows = computed(() => this.targetGridRef.totalRows());
  filterValue = computed(() => this.targetGridRef.filterValue());
  filteredDataRows = computed(() => this.targetGridRef.filteredDataRows());
  totalPages = computed(() => this.targetGridRef.totalPages());

  id = computed(() => this.targetGridRef.id() + '-pagination');
  pageSizes = computed<number[]>(() => this.targetGridRef.pageSizes());

  setPageSize(pageSize: number) {
    this.targetGridRef.setPageSize(pageSize);
  }

  goToPage(pageNumber: number) {
    this.targetGridRef.goToPage(pageNumber);
  }

  goFirstPage() {
    this.targetGridRef.goFirstPage();
  }

  goPrevPage() {
    this.targetGridRef.goPrevPage();
  }

  goNextPage() {
    this.targetGridRef.goNextPage();
  }

  goLastPage() {
    this.targetGridRef.goLastPage();
  }

  handlePageSizeChange(event: any) {
    this.targetGridRef.setPageSize(event);
  }

  ngOnInit(): void {
    // console.log({
    //   targetGridRef: this.targetGridRef,
    //   pages: this.totalPages(),
    //   total: this.totalRows(),
    // });
  }

  ngAfterViewInit(): void {}
}
