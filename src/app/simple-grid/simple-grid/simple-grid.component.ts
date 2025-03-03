import {
  Component,
  input,
  Signal,
  effect,
  computed,
  Output,
  ContentChildren,
  QueryList,
  ChangeDetectorRef,
  AfterContentInit,
  OnDestroy,
} from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { SimpleGridColumnData, SimpleGridRow } from '../models/models';
import { SimpleGridCellComponent } from '../simple-grid-cell/simple-grid-cell.component';
import { Subject, takeUntil } from 'rxjs';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-simple-grid',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './simple-grid.component.html',
  styleUrl: './simple-grid.component.scss',
})
export class SimpleGridComponent implements AfterContentInit, OnDestroy {
  columnsData = input.required<SimpleGridColumnData[]>();
  dataRows = input.required<SimpleGridRow[]>();
  isServerGrid = input<boolean>(false);
  currentPage = input<number>(1);
  pageSize = input.required<number>();
  totalItems = input.required<number>();
  enableSearch = input<boolean>(false);
  searchValue = input<string>('');

  @Output() pageChange = (page: number) => {};
  @Output() pageSizeChange = (pageSize: number) => {};

  cellTemplatesInitialized = false;
  destroyed$ = new Subject<void>();
  // gridDataSource: MatTableDataSource<SimpleGridRow>;

  @ContentChildren(SimpleGridCellComponent)
  cellTemplates!: QueryList<SimpleGridCellComponent>;

  constructor(private readonly cdr: ChangeDetectorRef) {
    // effect(() => {
    //   if (this.isServerGrid()) {
    //     this.gridDataSource.data = [...this.dataRows()];
    //   }
    // });
    // this.gridDataSource = new MatTableDataSource<SimpleGridRow>(
    //   this.dataRows() || []
    // );
  }

  ngAfterContentInit() {
    this.cellTemplatesInitialized = true;

    // Force change detection
    this.cdr.detectChanges();
    this.cellTemplates.changes
      .pipe(takeUntil(this.destroyed$))
      .subscribe(() => {
        // console.log('Templates updated:', this.cellTemplates.length);
        this.cdr.detectChanges();
      });
  }

  getCellTemplate(column: string) {
    if (!this.cellTemplates) {
      return null;
    }
    const template = this.cellTemplates.find(
      (cell) => cell.column() === column
    );
    return template?.template || null;
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}
