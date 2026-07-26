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

export const dataTablePaginatorProps = {
  paginator: true,
  paginatorTemplate: dataTablePaginatorTemplate,
} as const;
