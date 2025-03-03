export interface SimpleGridRow {
  [key: string]: any;
}

export interface SimpleGridColumnData {
  key: string;
  label?: string;
  headerClass?: string;
  cellClass?: string;
  sortable?: boolean;
  width?: number;
}
