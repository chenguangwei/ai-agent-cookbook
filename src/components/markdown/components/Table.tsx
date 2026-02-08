import { TinaMarkdown, type TinaMarkdownContent } from 'tinacms/dist/rich-text';

interface TableProps {
  align?: ('left' | 'right' | 'center')[];
  tableRows: {
    tableCells: {
      value: TinaMarkdownContent;
    }[];
  }[];
}

export function Table({ align, tableRows }: TableProps) {
  if (!tableRows || tableRows.length === 0) return null;

  const [headerRow, ...bodyRows] = tableRows;

  return (
    <div className="my-6 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        {headerRow && (
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              {headerRow.tableCells.map((cell, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-white"
                  style={{ textAlign: align?.[i] || 'left' }}
                >
                  <TinaMarkdown content={cell.value} />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {bodyRows.map((row, ri) => (
            <tr
              key={ri}
              className="border-b border-slate-100 dark:border-slate-800 last:border-0"
            >
              {row.tableCells.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-4 py-3 text-slate-600 dark:text-slate-300"
                  style={{ textAlign: align?.[ci] || 'left' }}
                >
                  <TinaMarkdown content={cell.value} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
