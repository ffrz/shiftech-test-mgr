import { Dropdown } from 'primereact/dropdown';
import type { PaginatorTemplate } from 'primereact/paginator';

// Shared PrimeReact DataTable paginator layout: "Records per page [n v]   a-b of n   << < 1 > >>"
// Reuse via <DataTable paginator {...dataTablePaginatorProps} rows={10} rowsPerPageOptions={[5, 10, 25, 50]} ...>
export const dataTablePaginatorTemplate: PaginatorTemplate = {
  layout: 'RowsPerPageDropdown CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink',
  RowsPerPageDropdown: (options) => (
    <div className="flex align-items-center gap-2 dt-paginator-rows">
      <span className="text-color-secondary text-sm white-space-nowrap">Show</span>
      <Dropdown
        value={options.value}
        options={options.options}
        onChange={(e) => options.onChange(e as unknown as Parameters<typeof options.onChange>[0])}
      />
    </div>
  ),
  CurrentPageReport: (options) => (
    <span className="text-color-secondary text-sm mx-2 dt-paginator-report">
      ({options.totalRecords === 0 ? '0-0 of 0' : `${options.first}-${options.last} of ${options.totalRecords}`})
    </span>
  ),
};

// Body height clamps between a floor (short/mobile viewports) and a ceiling
// (tall desktop viewports), tracking 60vh in between — keeps the table from
// visibly resizing/jumping while it goes loading -> populated -> re-loading,
// and gives a stable internal scrollbar instead of pushing the paginator/
// page content up and down as row count changes across page navigations.
export const DATA_TABLE_SCROLL_HEIGHT = 'clamp(20rem, 60vh, 42rem)';

export const dataTablePaginatorProps = {
  paginator: true,
  paginatorTemplate: dataTablePaginatorTemplate,
  scrollable: true,
  scrollHeight: DATA_TABLE_SCROLL_HEIGHT,
} as const;
