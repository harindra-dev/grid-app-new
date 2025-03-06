import {
  Component,
  input,
  effect,
  computed,
  Output,
  ContentChildren,
  QueryList,
  ChangeDetectorRef,
  AfterContentInit,
  OnDestroy,
  signal,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { v4 as uuidv4 } from 'uuid';
import {
  IndexedSimpleGridRow,
  SelectedSimpleGridRows,
  SimpleGridColumnData,
  SimpleGridPageCahangeEvent,
  SimpleGridRow,
  SimpleGridSortingRules,
} from '../models/models';
import { SimpleGridCellComponent } from '../simple-grid-cell/simple-grid-cell.component';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { SimpleGridFilterComponent } from '../simple-grid-filter/simple-grid-filter.component';

@Component({
  selector: 'app-simple-grid',
  standalone: true,
  imports: [
    CommonModule,
    NgTemplateOutlet,
    SimpleGridCellComponent,
    SimpleGridFilterComponent,
    MatCheckboxModule,
  ],
  templateUrl: './simple-grid.component.html',
  styleUrl: './simple-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimpleGridComponent implements AfterContentInit, OnDestroy {
  gridTitle = input<string>('');
  columnsData = input.required<SimpleGridColumnData[]>();
  dataRows = input.required<SimpleGridRow[]>();
  totalRows = input.required<number>();
  pageSizes = input<number[]>([5, 10, 15, 25, 50, 100]);
  enableSelection = input<boolean>(false);
  isGridloading = input<boolean>(false);
  prefetchNextPagerequired = input<boolean>(false);

  id = input<string>('');
  customClass = input<string>('');

  // Aliased inputs
  _currentPage = input<number>(1, { alias: 'currentPage' });
  _pageSize = input.required<number>({ alias: 'pageSize' });
  _filterValue = input<string>('', {
    alias: 'filterValue',
  });

  isFilterEnabled = input<boolean>(false);
  isLoading = input<boolean>(false);

  @Output() pageChange = new EventEmitter<SimpleGridPageCahangeEvent>();
  @Output() pageSizeChange = new EventEmitter<number>();
  @Output() selectionChange = new EventEmitter<IndexedSimpleGridRow[]>();

  cellTemplatesInitialized = false;

  filterValue = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  totalPages = computed(() => {
    const calculatedTotalPages = Math.ceil(
      (this.filterValue() ? this.filteredDataRowsLength() : this.totalRows()) /
        this.pageSize()
    );
    // console.log('calculatedTotalPages', calculatedTotalPages);
    return calculatedTotalPages;
  });

  firstRowInPage = computed(() => {
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });
  lastRowInPage = computed(() => {
    if (this.filterValue()) {
      return Math.min(
        this.currentPage() * this.pageSize(),
        this.filteredDataRowsLength()
      );
    } else {
      return Math.min(this.currentPage() * this.pageSize(), this.totalRows());
    }
  });

  selectedDataRows = signal<SelectedSimpleGridRows>({});
  selectedDataRowIds = computed<string[]>(() =>
    Object.keys(this.selectedDataRows())
  );
  selectedDataRowsCount = computed<number>(
    () => Object.keys(this.selectedDataRows()).length
  );
  allDataRowsSelected = computed(() => {
    // Early return if no rows are selected
    if (this.selectedDataRowsCount() === 0) return false;

    // Check if filter is applied
    const hasFilter = Boolean(this.filterValue());

    // Get relevant total count based on filter state
    const totalCount = hasFilter
      ? this.filteredDataRowsLength()
      : this.dataSourceLength();

    // Compare selected count with total count
    return this.selectedDataRowsCount() === totalCount;
  });

  selectedDataRowsEffect = effect(() => {
    this.selectionChange.emit(Object.values(this.selectedDataRows()));
  });

  /**
   * This function is an effect that listens for changes in input values and updates
   * the corresponding observables accordingly.
   * @returns None
   */
  onInputValuesChange = effect(
    () => {
      this.filterValue.set(this._filterValue());
      this.currentPage.set(this._currentPage());
      this.pageSize.set(this._pageSize());
    },
    { allowSignalWrites: true }
  );

  onDataRowsInputChange = effect(
    () => {
      const indexedDataRows: IndexedSimpleGridRow[] = this.dataRows().map(
        (dataRow, index) => ({
          ...dataRow,
          _ruId: uuidv4(),
          _rIndex: index,
        })
      );
      this.dataSource.set(indexedDataRows);
      this.selectedDataRows.set({});
    },
    { allowSignalWrites: true }
  );

  sortingRules = signal<SimpleGridSortingRules>(null);

  private readonly destroyed$ = new Subject<void>();

  /**
   * A MatTableDataSource instance for the SimpleGridRow data in the matGridDataSource.
   */
  matGridDataSource: MatTableDataSource<SimpleGridRow> =
    new MatTableDataSource();

  dataSource = signal<IndexedSimpleGridRow[]>([]);
  dataSourceLength = computed(() => this.dataSource().length);
  dataSourceEffect = effect(
    () => {
      this.matGridDataSource.data = this.dataSource();
      this.filteredDataRows.set(this.applyFilter(this.filterValue()));
    },
    { allowSignalWrites: true }
  );

  sortedDataRows = signal<IndexedSimpleGridRow[]>([]);

  filteredDataRows = signal<IndexedSimpleGridRow[]>(
    this.matGridDataSource.filteredData as IndexedSimpleGridRow[]
  );
  filteredDataRowsLength = computed(() => this.filteredDataRows().length);
  onFilteredDataRowsChange = effect(
    () => {
      // console.log('Filtered data rows changed', this.filteredDataRows());
      this.sortedDataRows.set(this.applySorting());
    },
    { allowSignalWrites: true }
  );

  renderedDataRows = computed<IndexedSimpleGridRow[]>(() => {
    const nextRenderingDataRows = [...this.sortedDataRows()].slice(
      (this.currentPage() - 1) * this.pageSize(),
      this.currentPage() * this.pageSize()
    );
    // console.log('Rendering data rows', nextRenderingDataRows);
    return nextRenderingDataRows;
  });

  @ContentChildren(SimpleGridCellComponent)
  cellTemplates!: QueryList<SimpleGridCellComponent>;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  applyFilter(filterValue: string): IndexedSimpleGridRow[] {
    this.matGridDataSource.filter = filterValue.trim().toLowerCase();
    return this.matGridDataSource.filteredData as IndexedSimpleGridRow[];
  }

  applySorting() {
    const sortRules = this.sortingRules();
    if (!sortRules?.field || !sortRules?.direction) {
      return [...this.filteredDataRows()];
    }

    const { field, direction } = sortRules;
    const multiplier = direction === 'asc' ? 1 : -1;

    return [...this.filteredDataRows()].sort((a, b) => {
      // Handle null/undefined values
      if (a[field] == null) return 1;
      if (b[field] == null) return -1;
      if (a[field] == null && b[field] == null) return 0;

      // Optimize string comparison
      if (typeof a[field] === 'string') {
        return multiplier * a[field].localeCompare(b[field]);
      }

      // Extract nested ternary into a clear comparison
      let compareResult = 0;
      if (a[field] > b[field]) {
        compareResult = 1;
      } else if (a[field] < b[field]) {
        compareResult = -1;
      }

      return multiplier * compareResult;
    });
  }

  setSortingRules(column: string) {
    const currentRules = this.sortingRules();
    if (currentRules?.field === column) {
      if (currentRules.direction === 'asc') {
        this.sortingRules.set({ field: column, direction: 'desc' });
      }
      if (currentRules.direction === 'desc') {
        this.sortingRules.set(null);
      }
    } else {
      this.sortingRules.set({ field: column, direction: 'asc' });
    }
    this.goFirstPage();
  }

  emitPageChange() {
    const dataRowsInSource = this.matGridDataSource.data.length;
    let isLastPage = this.currentPage() === this.totalPages();
    let nextPage =
      this.currentPage() + 1 > this.totalPages()
        ? null
        : this.currentPage() + 1;

    let shouldFetchNextRows = this.lastRowInPage() > dataRowsInSource;
    const dataRowsShortened = this.lastRowInPage() - dataRowsInSource;

    if (this.prefetchNextPagerequired() && nextPage) {
      shouldFetchNextRows = nextPage * this.pageSize() > dataRowsInSource;
    }

    const pageChangeInfo: SimpleGridPageCahangeEvent = {
      currentPage: this.currentPage(),
      pageSize: this.pageSize(),
      dataRowsInSource,
      dataRowsShortened,
      totalRows: this.totalRows(),
      shouldFetchNextRows,
      isLastPage,
      nextPage,
      sortingRules: this.sortingRules(),
      totalPages: this.totalPages(),
      totalFilteredPages: this.filterValue() ? this.totalPages() : 0,
    };
    // console.log({ pageChangeInfo });
    if (this.filterValue()) {
      pageChangeInfo.shouldFetchNextRows = false;
      pageChangeInfo.dataRowsShortened = 0;
    }

    this.pageChange.emit(pageChangeInfo);
  }

  setPageSize(pageSize: number) {
    if (pageSize) {
      let nextPageToGo;

      // Calculate next page to go so that no need to visit completed rows after page size change
      // for suppose, before page size change the consider the page size is 5 and I am on 7th page seeing rows from 31 to 35,
      // if I change the page size to 25, then I should go to the 2nd page as the 31 - 35 will last in 2nd page when I change the page size to 25,
      // Similarly if I am on page 3 and seeing rows 51 - 75 and the page size is 25, When I change the page size to 5, I should be switched to page 11 as 51 - 55 lies in
      // page 11 when page size is 5.

      if (this.currentPage() > 1) {
        nextPageToGo = Math.ceil(this.firstRowInPage() / pageSize);
      }
      this.pageSize.set(pageSize);
      this.pageSizeChange.emit(pageSize);
      if (nextPageToGo) {
        this.setCurrentPage(nextPageToGo);
      }
    }
  }

  setCurrentPage(pageNumber: number, shouldEmitPageChange = true) {
    if (pageNumber) {
      this.currentPage.set(pageNumber);
      if (shouldEmitPageChange) {
        this.emitPageChange();
      }
    }
  }

  goToPage(pageNumber: number) {
    this.setCurrentPage(pageNumber);
  }

  goFirstPage() {
    this.setCurrentPage(1);
  }

  goPrevPage() {
    this.setCurrentPage(this.currentPage() - 1);
  }

  goNextPage() {
    this.setCurrentPage(this.currentPage() + 1);
  }

  goLastPage() {
    this.setCurrentPage(this.totalPages());
  }

  /**
   * Append new data rows to the existing data source.
   * @param {SimpleGridRow[]} dataRows - An array of data rows to be appended.
   * @returns None
   */
  appendDataRows(dataRows: SimpleGridRow[]) {
    const existingDataRows = this.dataSource();
    const indexedDataRows = dataRows.map((dataRow, index) => ({
      ...dataRow,
      _ruId: uuidv4(),
      _rIndex: existingDataRows.length + index,
    }));
    this.dataSource.set([...existingDataRows, ...indexedDataRows]);
  }

  handleFilterInputFieldChange(filterValue: string) {
    if (this.filterValue() !== filterValue) {
      this.filterValue.set(filterValue);
      this.goFirstPage();
    }
  }

  handleAllRowsSelectionToggle() {
    if (this.selectedDataRowsCount() === this.filteredDataRowsLength()) {
      this.selectedDataRows.set({});
    } else {
      // this.selectedDataRows.set(this.filteredDataRows().map(row => ))
      const selectedDataRows: SelectedSimpleGridRows = {};
      this.filteredDataRows().forEach((row) => {
        selectedDataRows[row._ruId] = row;
      });
      this.selectedDataRows.set(selectedDataRows);
    }
  }

  handleIndividualRowSelectionToggle(_ruId: string) {
    const selectedRows = this.selectedDataRows();
    if (selectedRows[_ruId]) {
      delete selectedRows[_ruId];
      this.selectedDataRows.set({ ...selectedRows });
    } else {
      const selectedRow = this.filteredDataRows().find(
        (row) => row._ruId === _ruId
      );
      if (selectedRow) {
        this.selectedDataRows.set({
          ...selectedRows,
          [_ruId]: selectedRow,
        });
      }
    }
  }

  eventLogger($event: any, ...args: any[]) {
    console.log({ $event, args });
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

  ngAfterContentInit() {
    this.cellTemplatesInitialized = true;

    // Force change detection
    this.cdr.detectChanges();

    console.log({ cellTemplates: this.cellTemplates });

    this.cellTemplates.changes
      .pipe(takeUntil(this.destroyed$))
      .subscribe((cellTemplateChanges) => {
        console.log({ cellTemplateChanges });
        this.cdr.detectChanges();
      });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}
