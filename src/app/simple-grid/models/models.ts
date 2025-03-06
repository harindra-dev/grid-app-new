export interface SimpleGridRow {
  [key: string]: any;
}

export interface SelectedSimpleGridRows {
  [key: string]: IndexedSimpleGridRow;
}

export interface IndexedSimpleGridRow extends SimpleGridRow {
  _ruId: string;
  _rIndex: number;
}

export type SimpleGridSortingRules = {
  field: string;
  direction: 'asc' | 'desc';
} | null;

export interface SimpleGridColumnData {
  field: string;
  label?: string;
  headerClass?: string;
  cellClass?: string;
  sortable?: boolean;
  width?: number;
}

// const pageChangeInfo: any = {
//   currentPage: this.currentPage(),
//   pageSize: this.pageSize(),
//   dataRows,
//   totalRows: this.totalRows(),
//   shouldPrefetchNextPage,
//   isLastPage: this.currentPage() === this.totalPages(),
//   nextPage,
// };
export interface SimpleGridPageCahangeEvent {
  currentPage: number;
  nextPage: number | null;
  pageSize: number;
  dataRowsInSource: number;
  dataRowsShortened: number;
  totalRows: number;
  shouldFetchNextRows: boolean;
  isLastPage: boolean;
  sortingRules: SimpleGridSortingRules;
  totalPages: number;
  totalFilteredPages: number;
}
