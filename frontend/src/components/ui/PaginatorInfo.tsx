type PaginatorInfoProps = {
  count: number;
  total?: number;
};

export function PaginatorInfo({ count, total }: PaginatorInfoProps) {
  if (total !== undefined && total !== count) {
    return <span className="text-sm text-color-secondary">{count} of {total} records filtered</span>;
  }
  return <span className="text-sm text-color-secondary">{count} records</span>;
}
